"""
Pump Hunter 回测脚本

使用多币种5分钟数据进行回测
"""

import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import logging

# 添加项目根目录
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class Position:
    """持仓"""
    symbol: str
    entry_price: float
    amount: float
    entry_time: datetime
    bet_amount: float


class PumpHunterBacktest:
    """
    Pump Hunter 回测引擎
    
    针对5分钟K线调整的参数:
    - 1根K线涨幅 >= 1.5% (原1分钟2%)
    - 3根K线涨幅 >= 3% (原3分钟4%)
    """
    
    def __init__(
        self,
        initial_capital: float = 300,
        bet_per_trade: float = 50,
        max_positions: int = 5,
        leverage: int = 10,
        take_profit_pct: float = 0.03,
        stop_loss_pct: float = 0.02,
        timeout_bars: int = 3,  # 3根5分钟K线 = 15分钟
        pump_1bar_threshold: float = 0.015,  # 1根K线涨1.5%
        pump_3bar_threshold: float = 0.03,   # 3根K线涨3%
        volume_spike_ratio: float = 3.0,
        taker_fee: float = 0.0004,  # 万4手续费
    ):
        self.initial_capital = initial_capital
        self.capital = initial_capital
        self.bet_per_trade = bet_per_trade
        self.max_positions = max_positions
        self.leverage = leverage
        self.take_profit_pct = take_profit_pct
        self.stop_loss_pct = stop_loss_pct
        self.timeout_bars = timeout_bars
        self.pump_1bar_threshold = pump_1bar_threshold
        self.pump_3bar_threshold = pump_3bar_threshold
        self.volume_spike_ratio = volume_spike_ratio
        self.taker_fee = taker_fee
        
        # 持仓
        self.positions: Dict[str, Position] = {}
        
        # 统计
        self.trades: List[Dict] = []
        self.equity_curve: List[Dict] = []
        self.win_count = 0
        self.loss_count = 0
        self.total_pnl = 0
        
    def load_data(self, data_dir: str, symbols: List[str], timeframe: str = '5m') -> Dict[str, pd.DataFrame]:
        """加载多币种数据"""
        data = {}
        
        for symbol in symbols:
            # 查找该币种的所有数据文件
            pattern = f"{symbol}-{timeframe}-"
            files = sorted([f for f in os.listdir(data_dir) if f.startswith(pattern) and f.endswith('.csv')])
            
            if not files:
                logger.warning(f"未找到 {symbol} 的 {timeframe} 数据")
                continue
            
            # 合并所有文件
            dfs = []
            for f in files:
                path = os.path.join(data_dir, f)
                df = pd.read_csv(path)
                dfs.append(df)
            
            if dfs:
                df = pd.concat(dfs, ignore_index=True)
                
                # 过滤掉重复的标题行
                if 'open_time' in df.columns:
                    df = df[df['open_time'] != 'open_time']
                    df['open_time'] = pd.to_numeric(df['open_time'], errors='coerce')
                    df = df.dropna(subset=['open_time'])
                    df['timestamp'] = pd.to_datetime(df['open_time'], unit='ms')
                elif 'timestamp' in df.columns:
                    df['timestamp'] = pd.to_datetime(df['timestamp'])
                
                df = df.sort_values('timestamp').drop_duplicates('timestamp')
                df = df.set_index('timestamp')
                
                # 确保有必要的列
                required = ['open', 'high', 'low', 'close', 'volume']
                if all(col in df.columns for col in required):
                    data[symbol] = df[required].astype(float)
                    logger.info(f"加载 {symbol}: {len(df)} 条数据, {df.index[0]} ~ {df.index[-1]}")
        
        return data
    
    def detect_pump(self, symbol: str, df: pd.DataFrame, idx: int) -> Optional[str]:
        """检测pump信号"""
        if idx < 3:
            return None
        
        current = df.iloc[idx]
        prev_1 = df.iloc[idx - 1]
        
        # 1根K线涨幅
        change_1bar = (current['close'] - prev_1['close']) / prev_1['close']
        
        # 3根K线涨幅
        if idx >= 3:
            prev_3 = df.iloc[idx - 3]
            change_3bar = (current['close'] - prev_3['close']) / prev_3['close']
        else:
            change_3bar = 0
        
        # 成交量变化
        vol_ratio = current['volume'] / prev_1['volume'] if prev_1['volume'] > 0 else 0
        
        # 信号判断
        if change_1bar >= self.pump_1bar_threshold:
            return f"闪电涨 +{change_1bar*100:.2f}%"
        
        if change_3bar >= self.pump_3bar_threshold:
            return f"快速涨 3bar+{change_3bar*100:.2f}%"
        
        if vol_ratio >= self.volume_spike_ratio and change_1bar > 0.005:
            return f"量价齐飞 Vol×{vol_ratio:.1f}"
        
        return None
    
    def check_exit(self, pos: Position, current_price: float, bars_held: int) -> Optional[Dict]:
        """检查是否需要平仓"""
        pnl_pct = (current_price - pos.entry_price) / pos.entry_price
        
        # 止盈
        if pnl_pct >= self.take_profit_pct:
            return {'reason': 'take_profit', 'pnl_pct': pnl_pct, 'is_win': True}
        
        # 止损
        if pnl_pct <= -self.stop_loss_pct:
            return {'reason': 'stop_loss', 'pnl_pct': pnl_pct, 'is_win': False}
        
        # 超时
        if bars_held >= self.timeout_bars and pnl_pct < 0.01:
            return {'reason': 'timeout', 'pnl_pct': pnl_pct, 'is_win': pnl_pct > 0}
        
        return None
    
    def run(self, data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """运行回测"""
        if not data:
            logger.error("没有数据")
            return {}
        
        # 对齐时间戳
        all_timestamps = set()
        for df in data.values():
            all_timestamps.update(df.index.tolist())
        timestamps = sorted(all_timestamps)
        
        logger.info(f"回测周期: {timestamps[0]} ~ {timestamps[-1]}")
        logger.info(f"共 {len(timestamps)} 根K线, {len(data)} 个币种")
        
        # 追踪每个持仓的K线数
        position_bars: Dict[str, int] = {}
        
        # 遍历时间
        for ts in timestamps:
            # 更新持仓K线数
            for sym in list(position_bars.keys()):
                position_bars[sym] += 1
            
            # 获取当前价格
            current_prices = {}
            for symbol, df in data.items():
                if ts in df.index:
                    current_prices[symbol] = df.loc[ts, 'close']
            
            # 1. 检查现有持仓
            for symbol in list(self.positions.keys()):
                if symbol not in current_prices:
                    continue
                
                pos = self.positions[symbol]
                price = current_prices[symbol]
                bars_held = position_bars.get(symbol, 0)
                
                exit_signal = self.check_exit(pos, price, bars_held)
                if exit_signal:
                    self._close_position(symbol, price, ts, exit_signal)
                    del position_bars[symbol]
            
            # 2. 扫描新信号
            if len(self.positions) < self.max_positions:
                for symbol, df in data.items():
                    if symbol in self.positions:
                        continue
                    
                    if ts not in df.index:
                        continue
                    
                    # 找到当前K线的位置
                    idx = df.index.get_loc(ts)
                    
                    # 检测信号
                    signal = self.detect_pump(symbol, df, idx)
                    if signal:
                        price = df.loc[ts, 'close']
                        self._open_position(symbol, price, ts, signal)
                        position_bars[symbol] = 0
                        
                        if len(self.positions) >= self.max_positions:
                            break
            
            # 3. 记录权益
            equity = self.capital
            for symbol, pos in self.positions.items():
                if symbol in current_prices:
                    pnl = (current_prices[symbol] - pos.entry_price) / pos.entry_price
                    equity += pos.bet_amount * pnl * self.leverage
            
            self.equity_curve.append({
                'timestamp': ts,
                'equity': equity,
                'positions': len(self.positions)
            })
        
        return self._generate_report()
    
    def _open_position(self, symbol: str, price: float, ts: datetime, reason: str):
        """开仓"""
        amount = (self.bet_per_trade * self.leverage) / price
        fee = self.bet_per_trade * self.leverage * self.taker_fee
        self.capital -= fee
        
        pos = Position(
            symbol=symbol,
            entry_price=price,
            amount=amount,
            entry_time=ts,
            bet_amount=self.bet_per_trade
        )
        self.positions[symbol] = pos
        
        logger.debug(f"🎯 开仓 {symbol} @ {price:.4f} | {reason}")
    
    def _close_position(self, symbol: str, price: float, ts: datetime, exit_info: Dict):
        """平仓"""
        pos = self.positions[symbol]
        pnl_pct = exit_info['pnl_pct']
        pnl_amount = pos.bet_amount * pnl_pct * self.leverage
        
        # 扣除手续费
        fee = pos.bet_amount * self.leverage * self.taker_fee
        pnl_amount -= fee
        
        self.capital += pnl_amount
        self.total_pnl += pnl_amount
        
        if exit_info['is_win']:
            self.win_count += 1
        else:
            self.loss_count += 1
        
        self.trades.append({
            'symbol': symbol,
            'entry_time': pos.entry_time,
            'exit_time': ts,
            'entry_price': pos.entry_price,
            'exit_price': price,
            'pnl_pct': pnl_pct,
            'pnl_amount': pnl_amount,
            'reason': exit_info['reason'],
            'is_win': exit_info['is_win']
        })
        
        del self.positions[symbol]
        
        emoji = "🎉" if exit_info['is_win'] else "❌"
        logger.debug(f"{emoji} 平仓 {symbol} @ {price:.4f} | {exit_info['reason']} | PnL: {pnl_amount:+.2f}U")
    
    def _generate_report(self) -> Dict[str, Any]:
        """生成报告"""
        total_trades = self.win_count + self.loss_count
        win_rate = self.win_count / total_trades * 100 if total_trades > 0 else 0
        
        # 权益曲线分析
        if self.equity_curve:
            df_equity = pd.DataFrame(self.equity_curve).set_index('timestamp')
            final_equity = df_equity['equity'].iloc[-1]
            total_return = (final_equity / self.initial_capital - 1) * 100
            
            # 最大回撤
            peak = df_equity['equity'].cummax()
            drawdown = (df_equity['equity'] - peak) / peak
            max_drawdown = drawdown.min() * 100
        else:
            final_equity = self.initial_capital
            total_return = 0
            max_drawdown = 0
        
        # 平均持仓时间
        if self.trades:
            df_trades = pd.DataFrame(self.trades)
            df_trades['hold_time'] = (df_trades['exit_time'] - df_trades['entry_time']).dt.total_seconds() / 60
            avg_hold_time = df_trades['hold_time'].mean()
            
            # 盈亏比
            wins = df_trades[df_trades['is_win']]
            losses = df_trades[~df_trades['is_win']]
            avg_win = wins['pnl_amount'].mean() if len(wins) > 0 else 0
            avg_loss = abs(losses['pnl_amount'].mean()) if len(losses) > 0 else 1
            profit_factor = avg_win / avg_loss if avg_loss > 0 else 0
        else:
            avg_hold_time = 0
            profit_factor = 0
        
        return {
            'initial_capital': self.initial_capital,
            'final_capital': final_equity,
            'total_return_pct': total_return,
            'total_pnl': self.total_pnl,
            'total_trades': total_trades,
            'win_count': self.win_count,
            'loss_count': self.loss_count,
            'win_rate': win_rate,
            'max_drawdown_pct': max_drawdown,
            'avg_hold_time_min': avg_hold_time,
            'profit_factor': profit_factor,
            'trades': self.trades,
            'equity_curve': self.equity_curve
        }


def main():
    """主函数"""
    # 数据目录
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
    
    # 要回测的币种
    symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', '1000PEPEUSDT']
    
    print("=" * 70)
    print("🎯 Pump Hunter 回测")
    print("=" * 70)
    
    # 创建回测引擎 - 优化参数
    # 提高信号阈值减少假信号，缩短超时
    backtest = PumpHunterBacktest(
        initial_capital=300,
        bet_per_trade=50,
        max_positions=5,
        leverage=10,
        take_profit_pct=0.035,   # 3.5%止盈
        stop_loss_pct=0.02,      # 2%止损
        timeout_bars=2,          # 2根K线(10分钟)超时
        pump_1bar_threshold=0.02,  # 提高到2%
        pump_3bar_threshold=0.04,  # 提高到4%
        volume_spike_ratio=4.0,    # 提高到4倍
    )
    
    # 加载数据
    data = backtest.load_data(data_dir, symbols, '5m')
    
    if not data:
        print("❌ 没有可用数据")
        return
    
    # 运行回测
    result = backtest.run(data)
    
    # 打印结果
    print("\n" + "=" * 70)
    print("📊 回测结果")
    print("=" * 70)
    print(f"初始资金:     {result['initial_capital']:.2f} U")
    print(f"最终资金:     {result['final_capital']:.2f} U")
    print(f"总收益率:     {result['total_return_pct']:+.2f}%")
    print(f"总盈亏:       {result['total_pnl']:+.2f} U")
    print("-" * 70)
    print(f"总交易次数:   {result['total_trades']}")
    print(f"胜/负:        {result['win_count']} / {result['loss_count']}")
    print(f"胜率:         {result['win_rate']:.1f}%")
    print(f"盈亏比:       {result['profit_factor']:.2f}")
    print("-" * 70)
    print(f"最大回撤:     {result['max_drawdown_pct']:.2f}%")
    print(f"平均持仓:     {result['avg_hold_time_min']:.1f} 分钟")
    print("=" * 70)
    
    # 打印最近10笔交易
    if result['trades']:
        print("\n📝 最近交易记录:")
        print("-" * 70)
        for trade in result['trades'][-10:]:
            emoji = "✅" if trade['is_win'] else "❌"
            print(f"{emoji} {trade['symbol']:12s} | "
                  f"{trade['entry_time'].strftime('%m-%d %H:%M')} ~ "
                  f"{trade['exit_time'].strftime('%H:%M')} | "
                  f"{trade['reason']:12s} | "
                  f"PnL: {trade['pnl_amount']:+.2f}U ({trade['pnl_pct']*100:+.2f}%)")
    
    # 保存结果
    result_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'results')
    os.makedirs(result_dir, exist_ok=True)
    
    if result['trades']:
        df_trades = pd.DataFrame(result['trades'])
        df_trades.to_csv(os.path.join(result_dir, 'pump_hunter_trades.csv'), index=False)
        print(f"\n✓ 交易记录已保存到 results/pump_hunter_trades.csv")
    
    if result['equity_curve']:
        df_equity = pd.DataFrame(result['equity_curve'])
        df_equity.to_csv(os.path.join(result_dir, 'pump_hunter_equity.csv'), index=False)
        print(f"✓ 权益曲线已保存到 results/pump_hunter_equity.csv")


if __name__ == '__main__':
    main()
