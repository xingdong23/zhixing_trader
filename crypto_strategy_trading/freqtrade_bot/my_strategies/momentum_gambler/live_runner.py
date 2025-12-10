import os
import sys
import json
import time
import logging
import ccxt
import pandas as pd
import requests
from datetime import datetime, timezone
from strategy import MomentumGamblerStrategy

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("bot.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class FeishuNotifier:
    def __init__(self, webhook_url: str):
        self.webhook_url = webhook_url

    def send(self, title: str, content: str):
        if not self.webhook_url or "YOUR_FEISHU" in self.webhook_url:
            return
        
        payload = {
            "msg_type": "text",
            "content": {
                "text": f"【{title}】\n{content}"
            }
        }
        try:
            requests.post(self.webhook_url, json=payload, timeout=5)
        except Exception as e:
            logger.error(f"Feishu send failed: {e}")

class StateManager:
    def __init__(self, file_path="bot_state.json"):
        self.file_path = file_path

    def load(self):
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load state: {e}")
        return {"position": None, "entry_price": 0.0, "highest_profit_pct": 0.0, "entry_time": None}

    def save(self, state):
        try:
            with open(self.file_path, 'w') as f:
                json.dump(state, f, indent=4)
        except Exception as e:
            logger.error(f"Failed to save state: {e}")

class LiveRunner:
    def __init__(self, config_path="config.json"):
        # Load Config
        with open(config_path, 'r') as f:
            self.config = json.load(f)
            
        self.exchange_id = self.config['exchange']['name']
        self.symbol = self.config['trading']['symbol']
        self.timeframe = self.config['trading']['timeframe']
        
        # Init Exchange
        exchange_class = getattr(ccxt, self.exchange_id)
        self.exchange = exchange_class({
            'apiKey': self.config['exchange']['api_key'],
            'secret': self.config['exchange']['secret'],
            'password': self.config['exchange'].get('password', ''),
            'options': self.config['exchange']['options'],
            'enableRateLimit': True
        })
        
        # Init Helpers
        self.notifier = FeishuNotifier(self.config['feishu']['webhook_url'])
        self.state_manager = StateManager()
        self.state = self.state_manager.load()
        self.strategy = MomentumGamblerStrategy(params={
            "leverage": self.config['trading']['leverage'],
            "stop_loss_pct": self.config['risk']['stop_loss_pct'],
            "trailing_stop_positive": self.config['risk']['trailing_stop_activation'],
            "trailing_stop_offset": self.config['risk']['trailing_stop_callback']
        })
        
        logger.info(f"Bot initialized for {self.symbol} on {self.timeframe}")

    def fetch_data(self, limit=100) -> pd.DataFrame:
        try:
            ohlcv = self.exchange.fetch_ohlcv(self.symbol, self.timeframe, limit=limit)
            df = pd.DataFrame(ohlcv, columns=['open_time', 'open', 'high', 'low', 'close', 'volume'])
            df['date'] = pd.to_datetime(df['open_time'], unit='ms')
            
            # Ensure float types
            for col in ['open', 'high', 'low', 'close', 'volume']:
                df[col] = df[col].astype(float)
                
            return df
        except Exception as e:
            logger.error(f"Fetch data failed: {e}")
            return None

    def get_current_price(self) -> float:
        try:
            ticker = self.exchange.fetch_ticker(self.symbol)
            return ticker['last']
        except Exception as e:
            logger.error(f"Fetch ticker failed: {e}")
            return 0.0

    def set_leverage(self):
        try:
            self.exchange.set_leverage(self.config['trading']['leverage'], self.symbol)
            logger.info(f"Leverage set to {self.config['trading']['leverage']}x")
        except Exception as e:
            # Some exchanges default leverage or don't support setting via API easily
            logger.warning(f"Set leverage failed (might be already set): {e}")

    def set_margin_mode(self):
        try:
            # Force ISOLATED margin to protect account balance
            self.exchange.set_margin_mode('isolated', self.symbol)
            logger.info(f"Margin Mode set to ISOLATED for {self.symbol}")
        except Exception as e:
            logger.warning(f"Set margin mode failed: {e}")

    def execute_order(self, side: str, price: float):
        try:
            amount_usdt = self.config['trading']['position_size_usdt']
            lev = self.config['trading']['leverage']
            # Calculate quantity in Coins
            # Position Value = Quantity * Price
            # Margin = Position Value / Leverage
            # We want Margin = 100 U, so Position Value = 100 * 10 = 1000 U
            position_value = amount_usdt * lev
            amount = position_value / price
            
            # Execute Market Order
            order = self.exchange.create_market_order(self.symbol, side, amount)
            logger.info(f"Order executed: {side} {amount} {self.symbol} @ {price}")
            
            return order
        except Exception as e:
            msg = f"Order execution failed: {e}"
            logger.error(msg)
            self.notifier.send("交易失败", msg)
            return None

    def open_position(self, current_price, current_time):
        order = self.execute_order('buy', current_price)
        if order:
            self.state = {
                "position": "long",
                "entry_price": current_price,
                "entry_time": str(current_time),
                "highest_profit_pct": 0.0
            }
            self.state_manager.save(self.state)
            self.notifier.send("🚀 开仓成功", f"Symbol: {self.symbol}\nPrice: {current_price}\nTime: {current_time}")

    def close_position(self, current_price, reason):
        # Flatten position: sell entire size
        # We need to fetch current position size from exchange to be accurate, 
        # or assuming we hold what we bought. For reliability, let's use 'reduceOnly' or query balance.
        # Simple version: execute sell market order.
        
        try:
            positions = self.exchange.fetch_positions([self.symbol])
            # Filter for symbol
            target_pos = next((p for p in positions if p['symbol'] == self.symbol), None)
            
            if not target_pos or float(target_pos['contracts']) == 0:
                logger.warning("No position found on exchange to close.")
                self.state = {"position": None}
                self.state_manager.save(self.state)
                return

            amount = float(target_pos['contracts']) # For linear perps usually contracts = coins or amount
            
            order = self.exchange.create_market_order(self.symbol, 'sell', amount, params={'reduceOnly': True})
            
            # Logging
            entry = self.state.get("entry_price", 0)
            pnl_pct = (current_price - entry) / entry if entry else 0
            
            msg = f"Symbol: {self.symbol}\nPrice: {current_price}\nPnL: {pnl_pct*100:.2f}%\nReason: {reason}"
            logger.info(f"Position closed. {msg}")
            
            if pnl_pct > 0:
                self.notifier.send("💰 止盈平仓", msg)
            else:
                self.notifier.send("🛑 止损平仓", msg)
            
            # Reset State
            self.state = {"position": None, "entry_price": 0.0, "highest_profit_pct": 0.0, "entry_time": None}
            self.state_manager.save(self.state)
            
        except Exception as e:
            logger.error(f"Failed to close position: {e}")
            self.notifier.send("⚠️ 平仓失败", str(e))

    def check_risk_management(self, current_price):
        if not self.state.get("position"):
            return

        entry_price = self.state["entry_price"]
        pnl_pct = (current_price - entry_price) / entry_price
        
        # Update Highest Profit
        if pnl_pct > self.state["highest_profit_pct"]:
            self.state["highest_profit_pct"] = pnl_pct
            self.state_manager.save(self.state) # Save progress
        
        # 1. Stop Loss
        sl_pct = self.config['risk']['stop_loss_pct']
        if pnl_pct <= -sl_pct:
            logger.info(f"Stop Loss Triggered: {pnl_pct*100:.2f}% <= -{sl_pct*100:.2f}%")
            self.close_position(current_price, "Stop Loss")
            return

        # 2. Trailing Stop
        ts_activation = self.config['risk']['trailing_stop_activation']
        ts_callback = self.config['risk']['trailing_stop_callback']
        highest = self.state["highest_profit_pct"]
        
        if highest >= ts_activation:
            if pnl_pct < (highest - ts_callback):
                logger.info(f"Trailing Stop Triggered: Highest {highest*100:.2f}%, Current {pnl_pct*100:.2f}%")
                self.close_position(current_price, "Trailing Stop")
                return

    def run(self):
        logger.info("Starting Main Loop...")
        self.set_leverage()
        self.set_margin_mode()
        self.notifier.send("🤖 机器人启动", f"策略: V9\n币种: {self.symbol}\n杠杆: {self.config['trading']['leverage']}x\n模式: 逐仓 (Isolated)")
        
        error_count = 0
        
        while True:
            try:
                # 1. Fetch Data
                df = self.fetch_data()
                if df is None:
                    time.sleep(60)
                    continue
                
                # 2. Current Status
                current_price = df.iloc[-1]['close'] # Use close of last candle approx or fetch ticker
                real_price = self.get_current_price() # Better to use real ticker for execution
                
                # 3. Calculate Indicators
                df = self.strategy.calculate_indicators(df)
                
                # 4. Check Risk Management (if in position)
                if self.state.get("position") == "long":
                    self.check_risk_management(real_price)
                
                # 5. Check Entry Signal (Candle Close Logic)
                # Ensure we only trade at candle close? 
                # Strategy V9 looks at confirmed candles.
                # We check the PREVIOUS completed candle (iloc[-2]) or current if we assume close ~ current.
                # Standard practice: Check signal on iloc[-1] if 'close' is updated live, 
                # OR check iloc[-2] (completed) to avoid repainting.
                # V9 backtest iterates fully. Let's strictly use COMPLETED candle (iloc[-2]) for signal.
                
                signal = self.strategy.generate_signal(df, len(df)-2) # Check last completed candle
                
                # Only open if no position
                if not self.state.get("position"):
                    if signal == "long":
                        logger.info("Signal LONG detected!")
                        self.open_position(real_price, df.iloc[-1]['date'])
                
                error_count = 0 # Reset error count on success
                time.sleep(60) # Loop every minute
                
            except Exception as e:
                logger.error(f"Loop Error: {e}")
                error_count += 1
                if error_count > 10:
                    self.notifier.send("⚠️ 连续报错警告", "请检查机器人运行状态")
                    time.sleep(300)
                time.sleep(60)

if __name__ == "__main__":
    runner = LiveRunner()
    runner.run()
