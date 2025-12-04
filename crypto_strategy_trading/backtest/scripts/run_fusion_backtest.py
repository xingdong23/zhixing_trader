import sys
import os
import logging
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional

"""
🚀 融合策略回测脚本 (Fusion Strategy Backtest)

目的:
    验证 "融合模式" (Fusion Mode) 假设：即动态选择最强资产并使用南瓜汤策略进行交易，能否获得更优的风险调整后收益。

策略逻辑:
    1. **资产选择 (每日)**:
       - 计算所有候选币种的 24小时动量 (涨幅)。
       - 选择 Top 1 最强资产。
       - 如果领涨资产发生变化，则切换资产 (平仓旧资产，开启新资产监控)。
    
    2. **执行 (每小时)**:
       - 在选定的资产上运行 **南瓜汤策略 (Pumpkin Soup)** (趋势跟踪)。
       - 使用标准的南瓜汤参数 (EMA, EWO, 波动率目标等)。

用法:
    python backtest/scripts/run_fusion_backtest.py

要求:
    - 数据文件必须存在于 `backtest/data/` (例如 SOLUSDT-1h-merged.csv)。
    - `strategies.pumpkin_soup` 模块可用。

关键参数:
    - `rs_lookback`: 24 (小时) 用于动量计算。
    - `coins`: 待监控的候选币种列表。
"""

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backtest.core import DataLoader
from strategies.pumpkin_soup.strategy import PumpkinSoupStrategy

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

class FusionBacktestEngine:
    def __init__(self, initial_capital: float = 10000.0, lookback_window: int = 168):
        self.initial_capital = initial_capital
        self.capital = initial_capital
        self.lookback_window = lookback_window
        self.position = None  # 当前持仓: {'symbol': str, 'amount': float, 'entry_price': float}
        self.trades = []
        self.equity_curve = []
        
        # 融合策略状态
        self.active_symbol = None
        self.strategy_instance = None
        self.last_rebalance_time = None
        
    def _init_strategy(self):
        """初始化南瓜汤策略实例"""
        return PumpkinSoupStrategy(
            parameters={
                'ma_window': 200,
                'ewo_fast': 5,
                'ewo_slow': 35,
                'vol_window': 20,
                'vol_factor': 2.0,
                'risk_per_trade': 0.02,
                # Relaxed parameters for Fusion Strategy
                'enable_mtf_filter': False,
                'enable_chop_filter': False,
                'enable_adx_filter': False,
                'ema_spread_threshold': 0.005,  # 0.5% spread required (vs default 1.5%)
            }
        )

    def _select_best_asset(self, history_data: Dict[str, pd.DataFrame], current_prices: Dict[str, float]) -> Optional[str]:
        """
        基于动量选择最佳资产
        """
        scores = {}
        for symbol, df in history_data.items():
            if len(df) < self.lookback_window + 1:
                continue
            
            # 计算涨幅
            try:
                price_ago = df.iloc[-(self.lookback_window + 1)]['close']
                current_price = current_prices[symbol]
                momentum = (current_price - price_ago) / price_ago
                scores[symbol] = momentum
            except Exception:
                continue
        
        if not scores:
            return None
            
        # 返回动量最高的币种
        best_asset = max(scores, key=scores.get)
        logger.debug(f"当前最强资产: {best_asset} ({self.lookback_window}h涨幅: {scores[best_asset]:.2%})")
        return best_asset

    def run(self, data_map: Dict[str, pd.DataFrame], start_date: str, end_date: str):
        logger.info(f"开始融合策略回测: {start_date} 至 {end_date}")
        
        # 统一时间索引
        timestamps = sorted(list(set().union(*[df.index for df in data_map.values()])))
        timestamps = [ts for ts in timestamps if start_date <= str(ts) <= end_date]
        
        for ts in timestamps:
            current_prices = {}
            price_history = {}
            
            # 获取当前切片数据
            for symbol, df in data_map.items():
                if ts in df.index:
                    # 获取截至当前的历史数据 (用于计算指标)
                    # 注意: 实际回测中应避免未来函数，这里假设 df.loc[:ts] 包含当前K线
                    # 为了严谨，策略分析时应只用 ts 之前的数据，或者 df.loc[ts] 是当前刚收盘的K线
                    hist = df.loc[:ts]
                    price_history[symbol] = hist
                    current_prices[symbol] = hist.iloc[-1]['close']
            
            if not current_prices:
                continue

            # --- 1. 每日选币逻辑 (每天 00:00 触发) ---
            current_time = pd.to_datetime(ts)
            
            # 简单起见，每小时检查一次是否需要切换 (或者只在每天0点切换)
            # 这里我们采用更灵活的方式：每小时检查，如果 Top 1 变了且持有仓位，是否要平仓？
            # 为了减少交易磨损，我们设定：只在每天 00:00 进行资产轮动检查
            
            if self.last_rebalance_time is None or current_time.day != self.last_rebalance_time.day:
                best_asset = self._select_best_asset(price_history, current_prices)
                
                if best_asset and best_asset != self.active_symbol:
                    logger.info(f"[{ts}] 资产切换: {self.active_symbol} -> {best_asset}")
                    
                    # 平掉旧资产仓位 (如果有)
                    if self.position and self.position['symbol'] == self.active_symbol:
                        self._close_position(ts, current_prices[self.active_symbol], "Asset Switch")
                    
                    # 切换到新资产
                    self.active_symbol = best_asset
                    # 重置策略实例 (因为换了币种，指标历史需要重置? 
                    # 其实 PumpkinSoup 是无状态的(只看K线)，但为了逻辑清晰，重新初始化)
                    self.strategy_instance = self._init_strategy()
                
                self.last_rebalance_time = current_time

            # --- 2. 策略执行逻辑 ---
            if self.active_symbol and self.strategy_instance:
                # 获取当前活跃资产的 K线数据
                klines = price_history.get(self.active_symbol)
                if klines is not None and len(klines) > 200:
                    # 转换格式适配策略输入
                    # 策略需要 list of dicts: [{'close': ..., 'high': ..., 'low': ...}]
                    # 为了性能，这里只取最近 1000 根 (确保满足 Regime Filter 800 的需求)
                    recent_klines = klines.tail(1000).to_dict('records')
                    
                    # 运行策略分析
                    signal = self.strategy_instance.analyze(recent_klines)
                    
                    # Debug: 打印未交易的原因 (仅抽样打印，避免刷屏)
                    if signal['signal'] == 'hold' and np.random.random() < 0.001:
                        logger.info(f"[{ts}] {self.active_symbol} Hold Reason: {signal.get('reason')}")
                    
                    # 处理信号
                    self._process_signal(signal, ts, current_prices[self.active_symbol])

            # 记录权益
            self._update_equity(ts, current_prices)

        self._generate_report()

    def _process_signal(self, signal: Dict, ts, price: float):
        """处理交易信号"""
        action = signal.get('action')
        
        # 如果有持仓
        if self.position:
            # 检查止损/止盈 (策略内部其实已经由 analyze 返回了 exit 信号，这里简化处理)
            # 这里主要处理策略明确发出的 'sell' 信号
            if action == 'sell':
                self._close_position(ts, price, "Signal Exit")
        
        # 如果无持仓
        else:
            if action == 'buy':
                quantity = (self.capital * 0.98) / price  # 留一点余量防止滑点
                self.position = {
                    'symbol': self.active_symbol,
                    'amount': quantity,
                    'entry_price': price,
                    'entry_time': ts
                }
                logger.info(f"[{ts}] 开仓做多 {self.active_symbol} @ {price:.4f}")

    def _close_position(self, ts, price: float, reason: str):
        if not self.position:
            return
            
        entry_price = self.position['entry_price']
        amount = self.position['amount']
        symbol = self.position['symbol']
        
        # 计算盈亏
        pnl = (price - entry_price) * amount
        pnl_pct = (price - entry_price) / entry_price
        
        self.capital += pnl
        
        self.trades.append({
            'entry_time': self.position['entry_time'],
            'exit_time': ts,
            'symbol': symbol,
            'entry_price': entry_price,
            'exit_price': price,
            'pnl': pnl,
            'pnl_pct': pnl_pct,
            'reason': reason
        })
        
        logger.info(f"[{ts}] 平仓 {symbol} ({reason}) @ {price:.4f}, PnL: {pnl:.2f} ({pnl_pct:.2%})")
        self.position = None

    def _update_equity(self, ts, current_prices):
        equity = self.capital
        if self.position:
            symbol = self.position['symbol']
            price = current_prices.get(symbol, self.position['entry_price'])
            floating_pnl = (price - self.position['entry_price']) * self.position['amount']
            equity += floating_pnl
        
        self.equity_curve.append({'timestamp': ts, 'equity': equity})

    def _generate_report(self):
        if not self.trades:
            print("无交易记录")
            return

        df_trades = pd.DataFrame(self.trades)
        total_return = (self.capital - self.initial_capital) / self.initial_capital
        win_rate = len(df_trades[df_trades['pnl'] > 0]) / len(df_trades)
        
        print("\n" + "="*40)
        print("🚀 融合策略回测报告 (Fusion Strategy Report)")
        print("="*40)
        print(f"初始资金: ${self.initial_capital:.2f}")
        print(f"最终权益: ${self.capital:.2f}")
        print(f"总收益率: {total_return:.2%}")
        print(f"总交易数: {len(df_trades)}")
        print(f"胜率: {win_rate:.2%}")
        print(f"平均每笔收益: {df_trades['pnl_pct'].mean():.2%}")
        print("="*40)
        
        # 打印详细交易记录
        print("\n交易明细:")
        print(df_trades[['entry_time', 'symbol', 'reason', 'pnl_pct']].to_string())

def load_data():
    """加载数据"""
    data_dir = Path(__file__).parent.parent / 'data'
    data_map = {}
    
    # 加载 SOL (使用合并后的文件)
    sol_path = data_dir / 'SOLUSDT-1h-merged.csv'
    if sol_path.exists():
        logger.info(f"加载 SOL 数据: {sol_path}")
        df = pd.read_csv(sol_path)
        df['timestamp'] = pd.to_datetime(df['open_time'], unit='ms')
        df.set_index('timestamp', inplace=True)
        df.sort_index(inplace=True)
        data_map['SOLUSDT'] = df
    
    # 加载 BTC (作为对比或基准)
    btc_path = data_dir / 'BTCUSDT-1h-2024-FULL.csv'
    if btc_path.exists():
        logger.info(f"加载 BTC 数据: {btc_path}")
        df = pd.read_csv(btc_path)
        df['timestamp'] = pd.to_datetime(df['open_time'], unit='ms')
        df.set_index('timestamp', inplace=True)
        df.sort_index(inplace=True)
        data_map['BTCUSDT'] = df
        
    return data_map

if __name__ == "__main__":
    # 1. 加载数据
    data = load_data()
    
    if not data:
        logger.error("未加载到数据，请检查 backtest/data 目录")
        sys.exit(1)
        
    # 2. 运行回测 (2024年全年)
    engine = FusionBacktestEngine()
    engine.run(data, start_date='2024-01-01', end_date='2024-11-01')
