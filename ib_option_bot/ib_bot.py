"""
IB V11 Option Sniper (Main Bot)
"""
import asyncio
import logging
from ib_insync import *
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import pytz

# Config
IB_HOST = '127.0.0.1'
IB_PORT = 7497 # 7497 for TWS Paper, 4002 for Gateway
CLIENT_ID = 1

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class OptionSniperBot:
    def __init__(self):
        self.ib = IB()
        self.targets = ['TSLA', 'NVDA', 'COIN', 'MSTR', 'GME']
        self.positions = {}
        # Strategy Parameters
        self.params = {
            'ema_period': 50,
            'bb_period': 20,
            'bb_std': 2.0,
            'kc_period': 20,
            'kc_mult': 2.5, # V11 relaxed from 1.5 to 2.5
            'adx_period': 14,
            'adx_threshold': 15,
            'adx_crazy_bull': 30
        }
        
    async def connect(self):
        """Connect to IB TWS/Gateway"""
        logger.info("🚀 Connecting to IB...")
        try:
            if not self.ib.isConnected():
                await self.ib.connectAsync(IB_HOST, IB_PORT, clientId=CLIENT_ID) 
            logger.info("✅ Connected!")
            return True
        except Exception as e:
            logger.error(f"❌ Connection Failed: {e}")
            logger.error("Please ensure TWS or IB Gateway is running and API is enabled.")
            return False

    def disconnect(self):
        if self.ib.isConnected():
            self.ib.disconnect()
            logger.info("Disconnected from IB.")

    async def fetch_daily_data(self, symbol: str, duration_str='1 Y') -> pd.DataFrame:
        """
        Fetch daily OHLCV data for a stock.
        
        Args:
            symbol (str): Ticker symbol (e.g. 'TSLA')
            duration_str (str): Duration of data (e.g. '1 Y', '6 M')
            
        Returns:
            pd.DataFrame: DataFrame with columns [date, open, high, low, close, volume]
        """
        logger.info(f"Fetching data for {symbol}...")
        
        contract = Stock(symbol, 'SMART', 'USD')
        
        # Qualify contract to get conId etc.
        try:
            contracts = await self.ib.qualifyContractsAsync(contract)
            if not contracts:
                 logger.error(f"Could not qualify contract for {symbol}")
                 return pd.DataFrame()
            contract = contracts[0]
        except Exception as e:
            logger.error(f"Error qualifying contract {symbol}: {e}")
            return pd.DataFrame()

        try:
            # Request historical data
            bars = await self.ib.reqHistoricalDataAsync(
                contract,
                endDateTime='',
                durationStr=duration_str,
                barSizeSetting='1 day',
                whatToShow='TRADES',
                useRTH=True,
                formatDate=1, # 1 = string "YYYYMMDD..."
                keepUpToDate=False 
            )
            
            if not bars:
                logger.warning(f"No data returned for {symbol}")
                return pd.DataFrame()

            # Convert to DataFrame
            df = util.df(bars)
            if df is None or df.empty:
                 return pd.DataFrame()

            # Clean up DataFrame
            df['date'] = pd.to_datetime(df['date'])
            # Ensure columns are what we expect for V11 logic
            # V11 logic usually expects: date, open, high, low, close, volume (lowercase)
            # IB util.df returns: date, open, high, low, close, volume, average, barCount
            
            return df

        except Exception as e:
            logger.error(f"Error fetching data for {symbol}: {e}")
            return pd.DataFrame()

    def calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate V11 strategy indicators"""
        if df.empty: return df
        df = df.copy()
        
        # 1. EMA 50 (Trend)
        df['ema'] = df['close'].ewm(span=self.params['ema_period'], adjust=False).mean()
        
        # 2. Bollinger Bands
        rolling_mean = df['close'].rolling(window=self.params['bb_period']).mean()
        rolling_std = df['close'].rolling(window=self.params['bb_period']).std()
        df['bb_upper'] = rolling_mean + (rolling_std * self.params['bb_std'])
        df['bb_lower'] = rolling_mean - (rolling_std * self.params['bb_std'])
        
        # 3. Keltner Channels
        # TR calculation
        high = df['high']
        low = df['low']
        close = df['close']
        
        tr1 = high - low
        tr2 = abs(high - close.shift(1))
        tr3 = abs(low - close.shift(1))
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(window=self.params['bb_period']).mean() # V11 uses bb_period (20) for ATR
        
        kc_mid = df['close'].rolling(window=self.params['bb_period']).mean()
        df['kc_upper'] = kc_mid + (atr * self.params['kc_mult'])
        df['kc_lower'] = kc_mid - (atr * self.params['kc_mult'])
        
        # 4. Squeeze Status (BB inside KC)
        df['squeeze_on'] = (df['bb_upper'] < df['kc_upper']) & (df['bb_lower'] > df['kc_lower'])
        
        # 5. ADX
        plus_dm = high.diff()
        minus_dm = low.diff()
        
        # Vectorized modification of plus_dm/minus_dm
        # If +DM < 0, set to 0
        plus_dm = np.where(plus_dm < 0, 0, plus_dm)
        # If -DM > 0, set to 0 (since it's low.diff, usually negative if going down, but formula is prev_low - curr_low)
        # Wait, low.diff() is curr_low - prev_low
        # Formula: -DM = prev_high - curr_high ? No.
        # Standard: +DM = current_high - previous_high
        #           -DM = previous_low - current_low
        
        # Let's stick to the implementation I read in `strategy.py` which was functioning.
        # strategy.py:
        # plus_dm = high.diff()
        # minus_dm = low.diff()
        # plus_dm[plus_dm < 0] = 0
        # minus_dm[minus_dm > 0] = 0
        # minus_dm = -minus_dm 
        
        plus_dm = high.diff() 
        minus_dm = low.diff()
        
        plus_dm = np.where(plus_dm < 0, 0, plus_dm)
        minus_dm = np.where(minus_dm > 0, 0, minus_dm)
        minus_dm = -minus_dm
        
        # plus_dm[plus_dm > minus_dm] = 0 -> Incorrect in strategy.py?
        # strategy.py says: plus_dm[plus_dm > minus_dm] = 0 ... wait? 
        # Standard ADX: If +DM > -DM, then -DM=0. If -DM > +DM, then +DM=0.
        # strategy.py code:
        # plus_dm[plus_dm > minus_dm] -> No, this looks suspicious or I misread.
        # Let's check previous file view.
        # Line 102: plus_dm[plus_dm > minus_dm] = 0  <-- This assumes we only count the dominant move?
        # Actually standard Wilder's ADX: 
        # If (+DM > -DM) and (+DM > 0), then +DM=+DM, -DM=0.
        # The code in strategy.py line 102: `plus_dm[plus_dm > minus_dm] = 0` seems WRONG if it means "If +DM > -DM, set +DM to 0".
        # It should be: If +DM is NOT greater than -DM, then +DM = 0.
        # Let's look at strategy.py again...
        # plus_dm[plus_dm > minus_dm] = 0 -> This effectively kills the DOMINANT side? That would be weird.
        # Maybe it meant `plus_dm[plus_dm < minus_dm] = 0`?
        
        # Actually, let's use the standard pandas implementation which is safer.
        # Ref: https://school.stockcharts.com/doku.php?id=technical_indicators:average_directional_index_adx
        # UpMove = high - high.shift(1)
        # DownMove = low.shift(1) - low
        # If UpMove > DownMove and UpMove > 0: +DM = UpMove
        # If DownMove > UpMove and DownMove > 0: -DM = DownMove
        
        up_move = high - high.shift(1)
        down_move = low.shift(1) - low
        
        plus_dm = np.zeros(len(df))
        minus_dm = np.zeros(len(df))
        
        # We need to iterate or use complex logic. 
        # Vectorized approach:
        up_idx = (up_move > down_move) & (up_move > 0)
        down_idx = (down_move > up_move) & (down_move > 0)
        
        plus_dm[up_idx] = up_move[up_idx]
        minus_dm[down_idx] = down_move[down_idx]
        
        plus_dm = pd.Series(plus_dm, index=df.index)
        minus_dm = pd.Series(minus_dm, index=df.index)
        
        atr_adx = tr.rolling(self.params['adx_period']).mean()
        plus_di = 100 * (plus_dm.rolling(self.params['adx_period']).mean() / atr_adx)
        minus_di = 100 * (minus_dm.rolling(self.params['adx_period']).mean() / atr_adx)
        dx = (abs(plus_di - minus_di) / (plus_di + minus_di)) * 100
        df['adx'] = dx.rolling(self.params['adx_period']).mean()
        
        return df

    def check_signal(self, df: pd.DataFrame) -> str:
        """
        Check V11 Signal logic on the latest candle.
        Returns: 'LONG' or None
        """
        if df.empty or len(df) < 50:
            return None
            
        last = df.iloc[-1]
        
        # Logic Components
        # 1. Recent Squeeze (was there a squeeze in last 5 days?)
        recent_squeeze = df['squeeze_on'].rolling(window=5).max().iloc[-1] > 0
        
        # 2. Breakout (Close > BB Upper)
        breakout = last['close'] > last['bb_upper']
        
        # 3. Trend (Close > EMA)
        trend_up = last['close'] > last['ema']
        
        # 4. ADX Check
        adx_ok = last['adx'] > self.params['adx_threshold']
        crazy_adx = last['adx'] > self.params['adx_crazy_bull']
        
        # Signal A: Squeeze + Breakout + Trend + ADX
        signal_a = recent_squeeze and breakout and trend_up and adx_ok
        
        # Signal B: Crazy Bull (Ignore Squeeze, just pure momentum)
        signal_b = crazy_adx and breakout and trend_up
        
        if signal_a or signal_b:
            logger.info(f"🔥 Signal Triggered! Squeeze:{recent_squeeze}, Breakout:{breakout}, Trend:{trend_up}, ADX:{last['adx']:.2f}")
            if signal_b: logger.info("🐂 Crazy Bull Mode Active!")
            return 'LONG'
            
        return None

    async def run_once(self):
        """Run a single scan iteration"""
        if not await self.connect():
            return

        for symbol in self.targets:
            df = await self.fetch_daily_data(symbol)
            if not df.empty and len(df) > 50:
                logger.info(f"Fetched {len(df)} candles for {symbol}")
                df = self.calculate_indicators(df)
                signal = self.check_signal(df)
                
                if signal:
                    logger.info(f"🚀 {symbol}: FOUND {signal} SIGNAL!")
                    
                    # Phase 3: Find Option
                    current_price = df.iloc[-1]['close']
                    contract = await self.find_target_option(symbol, current_price)
                    if contract:
                        logger.info(f"🎯 Target Option Found: {contract.localSymbol} (Strike: {contract.strike}, Exp: {contract.lastTradeDateOrContractMonth})")
                        await self.place_order(contract)
                    else:
                        logger.warning(f"⚠️ No suitable option found for {symbol}")
                else:
                    logger.info(f"{symbol}: No Signal.")
            
            else:
                logger.warning(f"Skipping {symbol} (insufficient data).")

        self.disconnect()

    async def find_target_option(self, symbol: str, current_price: float) -> Contract:
        """
        FIND THE BULLET: 
        1. Expiry: 30-45 days
        2. Strike: 5-10% OTM Call
        3. Simple Filter
        """
        try:
            contract = Stock(symbol, 'SMART', 'USD')
            await self.ib.qualifyContractsAsync(contract)
            
            # Get Option Chains
            chains = await self.ib.reqSecDefOptParamsAsync(contract.symbol, '', contract.secType, contract.conId)
            if not chains:
                logger.warning(f"No option chains for {symbol}")
                return None
                
            # Usually multiple chains (different exchanges), pick the one with 'SMART'
            chain = next((c for c in chains if c.exchange == 'SMART'), chains[0])
            
            # 1. Filter Expirations (30-45 days)
            target_date_min = datetime.now() + timedelta(days=30)
            target_date_max = datetime.now() + timedelta(days=45)
            
            valid_expirations = []
            for exp in chain.expirations:
                # exp format: 'YYYYMMDD'
                d = datetime.strptime(exp, '%Y%m%d')
                if target_date_min <= d <= target_date_max:
                    valid_expirations.append(exp)
            
            if not valid_expirations:
                logger.warning(f"No expirations between 30-45 days for {symbol}")
                # Fallback: Relax to 20-60 days if needed, strictly return None for now
                return None
                
            # Pick the one closest to 30 days (shortest time in range) to maximize squeeze potential?
            # Or middle? Let's pick the first one (usually earliest in the sorted list)
            target_expiry = sorted(valid_expirations)[0]
            
            # 2. Filter Strikes (OTM 5%-10%)
            # Call: Strike > Price
            # Target: 1.05 * Price <= Strike <= 1.10 * Price
            min_strike = current_price * 1.05
            max_strike = current_price * 1.10
            
            valid_strikes = [s for s in chain.strikes if min_strike <= s <= max_strike]
            if not valid_strikes:
                logger.warning(f"No strikes found 5%-10% OTM (Price: {current_price}, Range: {min_strike}-{max_strike})")
                return None
                
            # Pick Strike closest to 1.05 (Aggressive) or 1.10?
            # V11 "Gambler" prefers leverage, so slightly closer (cheaper) or further (cheaper)?
            # Closer = higher delta. Further = cheaper.
            # Strategy says "OTM 5%". Let's pick the one closest to min_strike (1.05)
            target_strike = min(valid_strikes, key=lambda x: abs(x - min_strike))
            
            # Build Contract
            opt = Option(symbol, target_expiry, target_strike, 'C', 'SMART')
            
            # Check Liquidity / Open Interest?
            # Requesting details to confirm it exists and maybe get localSymbol
            details = await self.ib.reqContractDetailsAsync(opt)
            if not details:
                return None
                
            # Use the first detail
            return details[0].contract
            
        except Exception as e:
            logger.error(f"Error finding option for {symbol}: {e}")
            return None

    async def place_order(self, contract: Contract):
        """Place an order for the contract"""
        try:
            # 1. Get Ask Price to calculate Quantity
            logger.info("requesting market data...")
            tickers = await self.ib.reqTickersAsync(contract)
            if not tickers:
                logger.error("Could not get market data for option")
                return
                
            ticker = tickers[0]
            price = ticker.ask 
            if pd.isna(price) or price <= 0:
                # Fallbck to close or last
                price = ticker.close if not pd.isna(ticker.close) else ticker.last
            
            if pd.isna(price) or price <= 0:
                logger.error(f"Invalid price {price} for {contract.localSymbol}")
                return
                
            # 2. Calculate Quantity ($500 Risk)
            # Contract Multiplier is 100 usually
            bet_size = 500 # USD
            cost_per_contract = price * 100
            quantity = int(bet_size // cost_per_contract)
            
            if quantity < 1:
                logger.warning(f"Option too expensive ({price}), need >$500 for 1 contract. Skipping.")
                return
                
            # 3. Place Limit Order
            logger.info(f"Placing BUY LMT Order: {quantity}x {contract.localSymbol} @ ${price}")
            
            order = LimitOrder('BUY', quantity, price)
            trade = self.ib.placeOrder(contract, order)
            
            # Wait for order status (optional, unblocking for now)
            logger.info(f"Order placed! Id: {trade.order.orderId}")
            
        except Exception as e:
            logger.error(f"Error placing order: {e}")

    async def run_continuous(self):
        """Main loop for continuous execution (if needed later)"""
        # For now, we focus on the scanner run
        await self.run_once()

if __name__ == '__main__':
    bot = OptionSniperBot()
    try:
        asyncio.run(bot.run_continuous())
    except (KeyboardInterrupt, SystemExit):
        print("🛑 Bot Stopped.")
