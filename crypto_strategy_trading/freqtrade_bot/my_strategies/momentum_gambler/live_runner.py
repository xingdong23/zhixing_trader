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

# 配置日志
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
            logger.error(f"飞书发送失败: {e}")

class StateManager:
    def __init__(self, file_path="bot_state.json"):
        self.file_path = file_path

    def load(self):
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"加载状态失败: {e}")
        return {"position": None, "entry_price": 0.0, "highest_profit_pct": 0.0, "entry_time": None}

    def save(self, state):
        try:
            with open(self.file_path, 'w') as f:
                json.dump(state, f, indent=4)
        except Exception as e:
            logger.error(f"保存状态失败: {e}")

class LiveRunner:
    def __init__(self, config_path="config.json"):
        # 加载配置
        self.config_path = config_path  # Save for reference
        if not os.path.exists(config_path):
            logger.error(f"配置文件未找到: {config_path}")
            sys.exit(1)
            
        with open(config_path, 'r') as f:
            self.config = json.load(f)
            
        self.exchange_id = self.config['exchange']['name']
        self.symbol = self.config['trading']['symbol']
        self.timeframe = self.config['trading']['timeframe']
        
        # 初始化交易所
        exchange_class = getattr(ccxt, self.exchange_id)
        self.exchange = exchange_class({
            'apiKey': self.config['exchange']['api_key'],
            'secret': self.config['exchange']['secret'],
            'password': self.config['exchange'].get('password', ''),
            'options': self.config['exchange']['options'],
            'enableRateLimit': True
        })
        
        # 初始化辅助工具
        self.notifier = FeishuNotifier(self.config['feishu']['webhook_url'])
        self.state_manager = StateManager()
        self.state = self.state_manager.load()
        self.strategy = MomentumGamblerStrategy(params={
            "leverage": self.config['trading']['leverage'],
            "stop_loss_pct": self.config['risk']['stop_loss_pct'],
            "trailing_stop_positive": self.config['risk']['trailing_stop_activation'],
            "trailing_stop_offset": self.config['risk']['trailing_stop_callback']
        })
        
        logger.info(f"机器人已初始化: {self.symbol} [{self.timeframe}]")

    def fetch_data(self, limit=100) -> pd.DataFrame:
        try:
            ohlcv = self.exchange.fetch_ohlcv(self.symbol, self.timeframe, limit=limit)
            df = pd.DataFrame(ohlcv, columns=['open_time', 'open', 'high', 'low', 'close', 'volume'])
            df['date'] = pd.to_datetime(df['open_time'], unit='ms')
            
            # 确保浮点数类型
            for col in ['open', 'high', 'low', 'close', 'volume']:
                df[col] = df[col].astype(float)
                
            return df
        except Exception as e:
            logger.error(f"获取行情数据失败: {e}")
            return None

    def get_current_price(self) -> float:
        try:
            ticker = self.exchange.fetch_ticker(self.symbol)
            return ticker['last']
        except Exception as e:
            logger.error(f"获取最新价格失败: {e}")
            return 0.0

    def set_leverage(self):
        try:
            self.exchange.set_leverage(self.config['trading']['leverage'], self.symbol)
            logger.info(f"杠杆已设置为 {self.config['trading']['leverage']}x")
        except Exception as e:
            # 部分交易所默认杠杆或不支持通过 API 简单设置
            logger.warning(f"设置杠杆失败 (可能已设置): {e}")

    def set_margin_mode(self):
        try:
            # 强制使用逐仓模式以保护账户余额
            self.exchange.set_margin_mode('isolated', self.symbol)
            logger.info(f"保证金模式已设置为 逐仓 (ISOLATED) - {self.symbol}")
        except Exception as e:
            logger.warning(f"设置保证金模式失败: {e}")

    def execute_order(self, side: str, price: float):
        try:
            amount_usdt = self.config['trading']['position_size_usdt']
            lev = self.config['trading']['leverage']
            # 计算币的数量
            # 持仓价值 = 数量 * 价格
            # 保证金 = 持仓价值 / 杠杆
            # 我们想要 保证金 = 100 U, 所以 持仓价值 = 100 * 10 = 1000 U
            position_value = amount_usdt * lev
            amount = position_value / price
            
            # 执行市价单
            order = self.exchange.create_market_order(self.symbol, side, amount)
            logger.info(f"订单执行成功: {side} {amount} {self.symbol} @ {price}")
            
            return order
        except Exception as e:
            msg = f"订单执行失败: {e}"
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
            self.notifier.send("🚀 开仓成功", f"交易对: {self.symbol}\n价格: {current_price}\n时间: {current_time}")

    def close_position(self, current_price, reason):
        # 平仓: 卖出全部持仓
        # 为了准确，应该从交易所获取当前持仓数量，或者假设我们持有之前买入的数量。
        # 为了稳健，使用 'reduceOnly' 或 查询余额。
        # 简单版本: 执行卖出市价单。
        
        try:
            positions = self.exchange.fetch_positions([self.symbol])
            # 筛选对应币种
            target_pos = next((p for p in positions if p['symbol'] == self.symbol), None)
            
            if not target_pos or float(target_pos['contracts']) == 0:
                logger.warning("交易所未找到持仓，无法平仓。")
                self.state = {"position": None}
                self.state_manager.save(self.state)
                return

            amount = float(target_pos['contracts']) # 对于线性合约，通常 contracts = coins 或 amount
            
            order = self.exchange.create_market_order(self.symbol, 'sell', amount, params={'reduceOnly': True})
            
            # 记录日志
            entry = self.state.get("entry_price", 0)
            pnl_pct = (current_price - entry) / entry if entry else 0
            
            msg = f"交易对: {self.symbol}\n价格: {current_price}\n盈亏: {pnl_pct*100:.2f}%\n原因: {reason}"
            logger.info(f"已平仓。{msg}")
            
            if pnl_pct > 0:
                self.notifier.send("💰 止盈平仓", msg)
            else:
                self.notifier.send("🛑 止损平仓", msg)
            
            # 重置状态
            self.state = {"position": None, "entry_price": 0.0, "highest_profit_pct": 0.0, "entry_time": None}
            self.state_manager.save(self.state)
            
        except Exception as e:
            logger.error(f"平仓失败: {e}")
            self.notifier.send("⚠️ 平仓失败", str(e))

    def check_risk_management(self, current_price):
        if not self.state.get("position"):
            return

        entry_price = self.state["entry_price"]
        pnl_pct = (current_price - entry_price) / entry_price
        
        # 更新最高收益率
        if pnl_pct > self.state["highest_profit_pct"]:
            self.state["highest_profit_pct"] = pnl_pct
            self.state_manager.save(self.state) # 保存进度
        
        # 1. 止损 (Stop Loss)
        sl_pct = self.config['risk']['stop_loss_pct']
        if pnl_pct <= -sl_pct:
            logger.info(f"触发止损: {pnl_pct*100:.2f}% <= -{sl_pct*100:.2f}%")
            self.close_position(current_price, "止损 (Stop Loss)")
            return

        # 2. 移动止盈 (Trailing Stop)
        ts_activation = self.config['risk']['trailing_stop_activation']
        ts_callback = self.config['risk']['trailing_stop_callback']
        highest = self.state["highest_profit_pct"]
        
        if highest >= ts_activation:
            if pnl_pct < (highest - ts_callback):
                logger.info(f"触发移动止盈: 最高 {highest*100:.2f}%, 当前 {pnl_pct*100:.2f}%")
                self.close_position(current_price, "移动止盈 (Trailing Stop)")
                return

    def run(self):
        logger.info("启动主循环...")
        self.set_leverage()
        self.set_margin_mode()
        self.notifier.send("🤖 机器人启动", f"策略: V9\n币种: {self.symbol}\n杠杆: {self.config['trading']['leverage']}x\n模式: 逐仓 (Isolated)")
        
        error_count = 0
        
        while True:
            try:
                # 1. 获取数据
                df = self.fetch_data()
                if df is None:
                    time.sleep(60)
                    continue
                
                # 2. 当前状态
                current_price = df.iloc[-1]['close'] # 使用最后一根K线收盘价近似，或获取 ticker
                real_price = self.get_current_price() # 执行最好用实时 ticker
                
                # 3. 计算指标
                df = self.strategy.calculate_indicators(df)
                
                # 4. 检查风控 (如果有持仓)
                if self.state.get("position") == "long":
                    self.check_risk_management(real_price)
                
                # 5. 检查开仓信号 (K线收盘逻辑)
                # 确保我们只在K线收盘时交易?
                # V9 回测是完全遍历的。为了避免重绘，我们检查上一根已完成的K线 (iloc[-2])。
                # 标准做法: 检查 iloc[-2] (已完成) 的信号。
                
                signal = self.strategy.generate_signal(df, len(df)-2) # 检查倒数第二根 (已完成K线)
                
                # 只有无持仓时才开仓
                if not self.state.get("position"):
                    if signal == "long":
                        logger.info("检测到做多信号 (LONG)!")
                        self.open_position(real_price, df.iloc[-1]['date'])
                
                error_count = 0 # 成功后重置错误计数
                time.sleep(60) # 每分钟循环一次
                
            except Exception as e:
                logger.error(f"主循环错误: {e}")
                error_count += 1
                if error_count > 10:
                    self.notifier.send("⚠️ 连续报错警告", "请检查机器人运行状态")
                    time.sleep(300)
                time.sleep(60)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Momentum Gambler Live Bot")
    parser.add_argument("--config", type=str, default="config.json", help="Path to configuration file")
    args = parser.parse_args()
    
    runner = LiveRunner(config_path=args.config)
    runner.run()
