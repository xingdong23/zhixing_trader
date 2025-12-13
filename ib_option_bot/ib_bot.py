"""
IB V11 Option Sniper (Main Bot) - V2 Architecture
Two-Phase Scanning: EOD Scan -> Next-Day Execution
"""
import asyncio
import logging
import json
from ib_insync import *
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import pytz
import argparse
from typing import List, Dict, Optional

# Import Configuration
try:
    import config
except ImportError:
    config = None
    
# Import Tickers
try:
    from tickers import TICKERS
except ImportError:
    TICKERS = ['TSLA', 'NVDA', 'COIN', 'MSTR', 'GME']

# Parse Arguments
parser = argparse.ArgumentParser(description='IB V11 Option Sniper')
parser.add_argument('--live', action='store_true', help='Connect to Live Trading Port (4002). Default is Paper (7497)')
parser.add_argument('--port', type=int, help='Override specific port number')
parser.add_argument('--client', type=int, default=1, help='Client ID (default: 1)')
parser.add_argument('--delayed', action='store_true', help='Use Delayed Market Data (Type 3) if no subscription')
parser.add_argument('--scan-only', action='store_true', help='Phase 1: Only scan and generate candidates, do not trade')
parser.add_argument('--execute', action='store_true', help='Phase 2: Execute trades from candidates.json')
parser.add_argument('--max-positions', type=int, default=None, help='Override MAX_POSITIONS from config')
args = parser.parse_args()

# Config Values (with fallbacks)
IB_HOST = getattr(config, 'IB_HOST', '127.0.0.1')
IB_PORT_PAPER = getattr(config, 'IB_PORT_PAPER', 7497)
IB_PORT_LIVE = getattr(config, 'IB_PORT_LIVE', 4002)

if args.port:
    IB_PORT = args.port
else:
    IB_PORT = IB_PORT_LIVE if args.live else IB_PORT_PAPER

CLIENT_ID = args.client
MAX_POSITIONS = args.max_positions or getattr(config, 'MAX_POSITIONS', 1)
RISK_PER_TRADE = getattr(config, 'RISK_PER_TRADE', 500)
SCAN_DELAY = getattr(config, 'SCAN_DELAY_SECONDS', 0.5)
HISTORICAL_DURATION = getattr(config, 'HISTORICAL_DURATION', '1 Y')

# Option Selection
EXPIRY_DAYS_MIN = getattr(config, 'EXPIRY_DAYS_MIN', 30)
EXPIRY_DAYS_MAX = getattr(config, 'EXPIRY_DAYS_MAX', 45)
OTM_PERCENT_MIN = getattr(config, 'OTM_PERCENT_MIN', 0.05)
OTM_PERCENT_MAX = getattr(config, 'OTM_PERCENT_MAX', 0.10)

# Strategy Parameters
STRATEGY_PARAMS = getattr(config, 'STRATEGY_PARAMS', {
    'ema_period': 50,
    'bb_period': 20,
    'bb_std': 2.0,
    'kc_period': 20,
    'kc_mult': 2.5,
    'adx_period': 14,
    'adx_threshold': 15,
    'adx_crazy_bull': 30,
})

CANDIDATES_FILE = 'candidates.json'

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class OptionSniperBot:
    def __init__(self):
        self.ib = IB()
        self.targets = TICKERS
        self.positions = {}
        self.params = STRATEGY_PARAMS
        self.candidates: List[Dict] = []
        
    async def connect(self):
        """Connect to IB TWS/Gateway"""
        logger.info("🚀 Connecting to IB...")
        try:
            if not self.ib.isConnected():
                await self.ib.connectAsync(IB_HOST, IB_PORT, clientId=CLIENT_ID) 
            
            # Set Market Data Type
            if args.delayed:
                self.ib.reqMarketDataType(3) # Delayed
                logger.warning("⚠️ Using DELAYED Market Data (Type 3). Signals might be 15-20min old!")
            else:
                self.ib.reqMarketDataType(1) # Live
                
            logger.info(f"✅ Connected to {IB_HOST}:{IB_PORT} (ClientID: {CLIENT_ID})")
            return True
        except Exception as e:
            logger.error(f"❌ Connection Failed: {e}")
            logger.error("Please ensure TWS or IB Gateway is running and API is enabled.")
            return False

    def disconnect(self):
        if self.ib.isConnected():
            self.ib.disconnect()
            logger.info("Disconnected from IB.")

    async def fetch_daily_data(self, symbol: str, duration_str: str = None) -> pd.DataFrame:
        """Fetch daily OHLCV data for a stock."""
        if duration_str is None:
            duration_str = HISTORICAL_DURATION
            
        contract = Stock(symbol, 'SMART', 'USD')
        
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
            bars = await self.ib.reqHistoricalDataAsync(
                contract,
                endDateTime='',
                durationStr=duration_str,
                barSizeSetting='1 day',
                whatToShow='TRADES',
                useRTH=True,
                formatDate=1,
                keepUpToDate=False 
            )
            
            if not bars:
                return pd.DataFrame()

            df = util.df(bars)
            if df is None or df.empty:
                 return pd.DataFrame()

            df['date'] = pd.to_datetime(df['date'])
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
        high = df['high']
        low = df['low']
        close = df['close']
        
        tr1 = high - low
        tr2 = abs(high - close.shift(1))
        tr3 = abs(low - close.shift(1))
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(window=self.params['bb_period']).mean()
        
        kc_mid = df['close'].rolling(window=self.params['bb_period']).mean()
        df['kc_upper'] = kc_mid + (atr * self.params['kc_mult'])
        df['kc_lower'] = kc_mid - (atr * self.params['kc_mult'])
        
        # 4. Squeeze Status (BB inside KC)
        df['squeeze_on'] = (df['bb_upper'] < df['kc_upper']) & (df['bb_lower'] > df['kc_lower'])
        
        # 5. ADX (Standard Wilder's)
        up_move = high - high.shift(1)
        down_move = low.shift(1) - low
        
        plus_dm = np.zeros(len(df))
        minus_dm = np.zeros(len(df))
        
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

    def check_signal(self, df: pd.DataFrame) -> Optional[Dict]:
        """
        Check V11 Signal logic on the latest candle.
        Returns: Dict with signal info or None
        """
        if df.empty or len(df) < 50:
            return None
            
        last = df.iloc[-1]
        
        # Logic Components
        recent_squeeze = df['squeeze_on'].rolling(window=5).max().iloc[-1] > 0
        breakout = last['close'] > last['bb_upper']
        trend_up = last['close'] > last['ema']
        adx_value = last['adx']
        adx_ok = adx_value > self.params['adx_threshold']
        crazy_adx = adx_value > self.params['adx_crazy_bull']
        
        # Signal A: Squeeze + Breakout + Trend + ADX
        signal_a = recent_squeeze and breakout and trend_up and adx_ok
        
        # Signal B: Crazy Bull (Ignore Squeeze, just pure momentum)
        signal_b = crazy_adx and breakout and trend_up
        
        if signal_a or signal_b:
            signal_type = 'CRAZY_BULL' if signal_b else 'SQUEEZE_BREAKOUT'
            return {
                'signal_type': signal_type,
                'adx': float(adx_value) if not pd.isna(adx_value) else 0,
                'recent_squeeze': bool(recent_squeeze),
                'price': float(last['close']),
                'date': str(last['date'])
            }
            
        return None

    # ========================
    # PHASE 1: EOD SCANNER
    # ========================
    async def scan_all(self) -> List[Dict]:
        """
        Phase 1: Scan all tickers and return candidates sorted by ADX.
        """
        if not await self.connect():
            return []

        total_tickers = len(self.targets)
        logger.info(f"📋 Phase 1: Starting EOD Scan for {total_tickers} tickers...")
        
        candidates = []
        
        for i, symbol in enumerate(self.targets):
            try:
                logger.info(f"[{i+1}/{total_tickers}] Scanning {symbol}...")
                
                df = await self.fetch_daily_data(symbol)
                
                if not df.empty and len(df) > 50:
                    df = self.calculate_indicators(df)
                    signal_info = self.check_signal(df)
                    
                    if signal_info:
                        candidate = {
                            'symbol': symbol,
                            **signal_info
                        }
                        candidates.append(candidate)
                        logger.info(f"🚀 {symbol}: SIGNAL FOUND! (ADX: {signal_info['adx']:.2f}, Type: {signal_info['signal_type']})")
                
                # Rate Limiting
                await asyncio.sleep(SCAN_DELAY)
                
            except Exception as e:
                logger.error(f"❌ Error scanning {symbol}: {e}")
                continue

        self.disconnect()
        
        # Rank by ADX (descending)
        candidates = self.rank_candidates(candidates)
        self.candidates = candidates
        
        # Save to file
        self.save_candidates(candidates)
        
        logger.info("=" * 60)
        logger.info(f"✅ Phase 1 Complete. Found {len(candidates)} candidates.")
        if candidates:
            logger.info("Top Candidates:")
            for i, c in enumerate(candidates[:5]):
                logger.info(f"  {i+1}. {c['symbol']} - ADX: {c['adx']:.2f} ({c['signal_type']})")
        logger.info("=" * 60)
        
        return candidates

    def rank_candidates(self, candidates: List[Dict]) -> List[Dict]:
        """Rank candidates by ADX (strongest trend first)."""
        return sorted(candidates, key=lambda x: x.get('adx', 0), reverse=True)

    def save_candidates(self, candidates: List[Dict]):
        """Save candidates to JSON file."""
        with open(CANDIDATES_FILE, 'w') as f:
            json.dump({
                'scan_time': datetime.now().isoformat(),
                'candidates': candidates
            }, f, indent=2)
        logger.info(f"💾 Saved {len(candidates)} candidates to {CANDIDATES_FILE}")

    def load_candidates(self) -> List[Dict]:
        """Load candidates from JSON file."""
        try:
            with open(CANDIDATES_FILE, 'r') as f:
                data = json.load(f)
                logger.info(f"📂 Loaded candidates from {CANDIDATES_FILE} (Scanned: {data.get('scan_time', 'Unknown')})")
                return data.get('candidates', [])
        except FileNotFoundError:
            logger.warning(f"⚠️ {CANDIDATES_FILE} not found. Run --scan-only first.")
            return []

    # ========================
    # PHASE 2: EXECUTION
    # ========================
    async def execute_top_candidates(self, max_positions: int = None):
        """
        Phase 2: Execute trades for top N candidates.
        """
        if max_positions is None:
            max_positions = MAX_POSITIONS
            
        candidates = self.load_candidates()
        if not candidates:
            logger.warning("No candidates to execute. Run Phase 1 (--scan-only) first.")
            return
            
        # Take top N
        top_candidates = candidates[:max_positions]
        logger.info(f"📋 Phase 2: Executing Top {len(top_candidates)} candidates (MAX_POSITIONS={max_positions})...")
        
        if not await self.connect():
            return

        for candidate in top_candidates:
            symbol = candidate['symbol']
            price = candidate['price']
            
            logger.info(f"🎯 Processing {symbol} @ ${price:.2f}...")
            
            try:
                contract = await self.find_target_option(symbol, price)
                if contract:
                    logger.info(f"  Found Option: {contract.localSymbol} (Strike: {contract.strike}, Exp: {contract.lastTradeDateOrContractMonth})")
                    await self.place_order(contract)
                else:
                    logger.warning(f"  ⚠️ No suitable option found for {symbol}")
            except Exception as e:
                logger.error(f"  ❌ Error processing {symbol}: {e}")

        self.disconnect()
        logger.info("✅ Phase 2 Complete.")

    async def find_target_option(self, symbol: str, current_price: float) -> Optional[Contract]:
        """Find the best option contract for a symbol."""
        try:
            contract = Stock(symbol, 'SMART', 'USD')
            await self.ib.qualifyContractsAsync(contract)
            
            chains = await self.ib.reqSecDefOptParamsAsync(contract.symbol, '', contract.secType, contract.conId)
            if not chains:
                return None
                
            chain = next((c for c in chains if c.exchange == 'SMART'), chains[0])
            
            # Filter Expirations
            target_date_min = datetime.now() + timedelta(days=EXPIRY_DAYS_MIN)
            target_date_max = datetime.now() + timedelta(days=EXPIRY_DAYS_MAX)
            
            valid_expirations = []
            for exp in chain.expirations:
                d = datetime.strptime(exp, '%Y%m%d')
                if target_date_min <= d <= target_date_max:
                    valid_expirations.append(exp)
            
            if not valid_expirations:
                return None
                
            target_expiry = sorted(valid_expirations)[0]
            
            # Filter Strikes (OTM)
            min_strike = current_price * (1 + OTM_PERCENT_MIN)
            max_strike = current_price * (1 + OTM_PERCENT_MAX)
            
            valid_strikes = [s for s in chain.strikes if min_strike <= s <= max_strike]
            if not valid_strikes:
                return None
                
            target_strike = min(valid_strikes, key=lambda x: abs(x - min_strike))
            
            opt = Option(symbol, target_expiry, target_strike, 'C', 'SMART')
            
            details = await self.ib.reqContractDetailsAsync(opt)
            if not details:
                return None
                
            return details[0].contract
            
        except Exception as e:
            logger.error(f"Error finding option for {symbol}: {e}")
            return None

    async def place_order(self, contract: Contract):
        """Place an order for the contract."""
        try:
            logger.info("  Requesting market data...")
            tickers = await self.ib.reqTickersAsync(contract)
            if not tickers:
                logger.error("  Could not get market data for option")
                return
                
            ticker = tickers[0]
            price = ticker.ask 
            if pd.isna(price) or price <= 0:
                price = ticker.close if not pd.isna(ticker.close) else ticker.last
            
            if pd.isna(price) or price <= 0:
                logger.error(f"  Invalid price {price} for {contract.localSymbol}")
                return
                
            # Calculate Quantity
            cost_per_contract = price * 100
            quantity = int(RISK_PER_TRADE // cost_per_contract)
            
            if quantity < 1:
                logger.warning(f"  Option too expensive (${price}), need >${RISK_PER_TRADE} for 1 contract. Skipping.")
                return
                
            logger.info(f"  Placing BUY LMT Order: {quantity}x {contract.localSymbol} @ ${price}")
            
            order = LimitOrder('BUY', quantity, price)
            trade = self.ib.placeOrder(contract, order)
            
            logger.info(f"  ✅ Order placed! Id: {trade.order.orderId}")
            
        except Exception as e:
            logger.error(f"  Error placing order: {e}")

    # ========================
    # MAIN ENTRY POINTS
    # ========================
    async def run(self):
        """Main entry point based on arguments."""
        if args.scan_only:
            await self.scan_all()
        elif args.execute:
            await self.execute_top_candidates()
        else:
            # Default: Run both phases (legacy behavior)
            logger.info("Running full pipeline (Scan + Execute)...")
            candidates = await self.scan_all()
            if candidates:
                # Reconnect for Phase 2
                await self.execute_top_candidates()


if __name__ == '__main__':
    bot = OptionSniperBot()
    try:
        asyncio.run(bot.run())
    except (KeyboardInterrupt, SystemExit):
        print("🛑 Bot Stopped.")
