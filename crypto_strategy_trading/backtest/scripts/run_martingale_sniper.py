"""
Martingale Sniper 回测脚本

马丁狙击手策略回测
"""

import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import logging

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass 
class Position:
    symbol: str
    entry_price: float
    amount: float
    entry_time: datetime
    bet_amount: float
    martingale_level: int


class MartingaleSniperBacktest:
    """马丁狙击手回测引擎"""
    
    MARTINGALE_SEQUENCE = [10, 20, 40, 80, 150]
    
    def __init__(
        self,
        initial_capital: float = 300,
        leverage: int = 20,
        take_profit_pct: float = 0.15,
        stop_loss_pct: float = 0.08,
        explosion_threshold: float = 0.04,  # 4% for 5-min bars
        volume_spike_ratio: float = 4.0,
        taker_fee: float = 0.0004,
        cooldown_bars: int = 2,
    ):
        self.initial_capital = initial_capital
        self.capital = initial_capital
        self.leverage = leverage
        self.take_profit_pct = take_profit_pct
        self.stop_loss_pct = stop_loss_pct
        self.explosion_threshold = explosion_threshold
        self.volume_spike_ratio = volume_spike_ratio
        self.taker_fee = taker_fee
        self.cooldown_bars = cooldown_bars
        
        # 状态
        self.position: Optional[Position] = None
        self.martingale_level = 0
        self.cooldown_counter = 0
        
        # 统计
        self.trades: List[Dict] = []
        self.equity_curve: List[Dict] = []
        self.rounds_won = 0
        self.rounds_lost = 0
        self.total_rounds = 0
        self.peak_capital = initial_capital
        
    def get_current_bet(self) -> float:
        if self.martingale_level >= len(self.MARTINGALE_SEQUENCE):
            return 0
        return self.MARTINGALE_SEQUENCE[self.martingale_level]
    
    def load_data(self, data_dir: str, symbols: List[str], timeframe: str = '5m') -> Dict[str, pd.DataFrame]:
        """加载数据"""
        data = {}
        
        for symbol in symbols:
            pattern = f"{symbol}-{timeframe}-"
            files = sorted([f for f in os.listdir(data_dir) if f.startswith(pattern) and f.endswith('.csv')])
            
            if not files:
                continue
            
            dfs = []
            for f in files:
                path = os.path.join(data_dir, f)
                df = pd.read_csv(path)
                dfs.append(df)
            
            if dfs:
                df = pd.concat(dfs, ignore_index=True)
                
                if 'open_time' in df.columns:
                    df = df[df['open_time'] != 'open_time']
                    df['open_time'] = pd.to_numeric(df['open_time'], errors='coerce')
                    df = df.dropna(subset=['open_time'])
                    df['timestamp'] = pd.to_datetime(df['open_time'], unit='ms')
                
                df = df.sort_values('timestamp').drop_duplicates('timestamp')
                df = df.set_index('timestamp')
                
                required = ['open', 'high', 'low', 'close', 'volume']
                if all(col in df.columns for col in required):
                    data[symbol] = df[required].astype(float)
                    logger.info(f"加载 {symbol}: {len(df)} 条, {df.index[0]} ~ {df.index[-1]}")
        
        return data
    
    def detect_explosion(self, symbol: str, df: pd.DataFrame, idx: int) -> Optional[Dict]:
        """检测爆发信号"""
        if idx < 2:
            return None
        
        current = df.iloc[idx]
        prev = df.iloc[idx - 1]
        price = current['close']
        
        # 计算涨幅
        change_1bar = (price - prev['close']) / prev['close']
        
        # 成交量
        vol_ratio = current['volume'] / prev['volume'] if prev['volume'] > 0 else 0
        
        # 信号判断：涨幅够大 或 量价齐飞
        score = 0
        reasons = []
        
        if change_1bar >= self.explosion_threshold:
            score += 50
            reasons.append(f"+{change_1bar*100:.1f}%")
        
        if vol_ratio >= self.volume_spike_ratio and change_1bar > 0.02:
            score += 30
            reasons.append(f"Vol×{vol_ratio:.1f}")
        
        if score < 30:
            return None
        
        bet = self.get_current_bet()
        if bet == 0 or self.capital < bet:
            return None
        
        return {
            'symbol': symbol,
            'price': price,
            'bet': bet,
            'score': score,
            'reason': ' '.join(reasons),
            'change': change_1bar,
            'vol_ratio': vol_ratio
        }
    
    def check_exit(self, price: float) -> Optional[Dict]:
        """检查是否需要平仓"""
        if self.position is None:
            return None
        
        pnl_pct = (price - self.position.entry_price) / self.position.entry_price
        
        if pnl_pct >= self.take_profit_pct:
            return {'reason': 'take_profit', 'pnl_pct': pnl_pct, 'is_win': True}
        
        if pnl_pct <= -self.stop_loss_pct:
            return {'reason': 'stop_loss', 'pnl_pct': pnl_pct, 'is_win': False}
        
        return None
    
    def run(self, data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """运行回测"""
        if not data:
            return {}
        
        # 对齐时间
        all_ts = set()
        for df in data.values():
            all_ts.update(df.index.tolist())
        timestamps = sorted(all_ts)
        
        logger.info(f"回测: {timestamps[0]} ~ {timestamps[-1]}, {len(timestamps)} bars, {len(data)} coins")
        
        for ts in timestamps:
            # 获取当前价格
            prices = {}
            for sym, df in data.items():
                if ts in df.index:
                    prices[sym] = df.loc[ts, 'close']
            
            # 冷却计数
            if self.cooldown_counter > 0:
                self.cooldown_counter -= 1
            
            # 1. 检查持仓
            if self.position and self.position.symbol in prices:
                price = prices[self.position.symbol]
                exit_signal = self.check_exit(price)
                
                if exit_signal:
                    self._close_position(price, ts, exit_signal)
            
            # 2. 寻找新信号
            if self.position is None and self.cooldown_counter == 0:
                best_signal = None
                best_score = 0
                
                for symbol, df in data.items():
                    if ts not in df.index:
                        continue
                    idx = df.index.get_loc(ts)
                    signal = self.detect_explosion(symbol, df, idx)
                    
                    if signal and signal['score'] > best_score:
                        best_signal = signal
                        best_score = signal['score']
                
                if best_signal:
                    self._open_position(best_signal, ts)
            
            # 3. 记录权益
            equity = self.capital
            if self.position and self.position.symbol in prices:
                pnl = (prices[self.position.symbol] - self.position.entry_price) / self.position.entry_price
                pnl_amount = self.position.bet_amount * pnl * self.leverage
                if pnl_amount < -self.position.bet_amount:
                    pnl_amount = -self.position.bet_amount
                equity += pnl_amount
            
            self.equity_curve.append({
                'timestamp': ts,
                'equity': equity,
                'martingale_level': self.martingale_level
            })
            
            # 检查是否游戏结束
            if self.capital < self.MARTINGALE_SEQUENCE[0]:
                logger.warning(f"💀 资金耗尽: {self.capital:.2f}U")
                break
        
        return self._generate_report()
    
    def _open_position(self, signal: Dict, ts: datetime):
        """开仓"""
        price = signal['price']
        bet = signal['bet']
        
        # 手续费
        fee = bet * self.leverage * self.taker_fee
        self.capital -= fee
        
        self.position = Position(
            symbol=signal['symbol'],
            entry_price=price,
            amount=(bet * self.leverage) / price,
            entry_time=ts,
            bet_amount=bet,
            martingale_level=self.martingale_level
        )
        
        logger.debug(f"🎯 L{self.martingale_level+1} 开仓 {signal['symbol']} @ {price:.4f} | {signal['reason']} | 下注 {bet}U")
    
    def _close_position(self, price: float, ts: datetime, exit_info: Dict):
        """平仓"""
        pos = self.position
        pnl_pct = exit_info['pnl_pct']
        pnl_amount = pos.bet_amount * pnl_pct * self.leverage
        
        # 杠杆亏损最多亏本金
        if pnl_amount < -pos.bet_amount:
            pnl_amount = -pos.bet_amount
        
        # 手续费
        fee = pos.bet_amount * self.leverage * self.taker_fee
        pnl_amount -= fee
        
        self.capital += pnl_amount
        self.peak_capital = max(self.peak_capital, self.capital)
        
        self.trades.append({
            'symbol': pos.symbol,
            'entry_time': pos.entry_time,
            'exit_time': ts,
            'entry_price': pos.entry_price,
            'exit_price': price,
            'bet': pos.bet_amount,
            'martingale_level': pos.martingale_level,
            'pnl_pct': pnl_pct,
            'pnl_amount': pnl_amount,
            'reason': exit_info['reason'],
            'is_win': exit_info['is_win'],
            'capital_after': self.capital
        })
        
        if exit_info['is_win']:
            logger.info(f"🎉 L{self.martingale_level+1} 止盈 {pos.symbol} | +{pnl_amount:.2f}U | 资金: {self.capital:.2f}U")
            self.rounds_won += 1
            self.total_rounds += 1
            self.martingale_level = 0
        else:
            logger.debug(f"❌ L{self.martingale_level+1} 止损 {pos.symbol} | {pnl_amount:.2f}U | 资金: {self.capital:.2f}U")
            self.martingale_level += 1
            
            if self.martingale_level >= len(self.MARTINGALE_SEQUENCE):
                logger.warning(f"💀 马丁爆仓! 资金: {self.capital:.2f}U")
                self.rounds_lost += 1
                self.total_rounds += 1
                self.martingale_level = 0
            else:
                self.cooldown_counter = self.cooldown_bars
        
        self.position = None
    
    def _generate_report(self) -> Dict[str, Any]:
        """生成报告"""
        if not self.equity_curve:
            return {}
        
        df_eq = pd.DataFrame(self.equity_curve).set_index('timestamp')
        final = df_eq['equity'].iloc[-1]
        total_return = (final / self.initial_capital - 1) * 100
        
        # 最大回撤
        peak = df_eq['equity'].cummax()
        dd = (df_eq['equity'] - peak) / peak
        max_dd = dd.min() * 100
        
        # 翻倍次数
        doubled_count = (df_eq['equity'] >= self.initial_capital * 2).sum()
        
        return {
            'initial_capital': self.initial_capital,
            'final_capital': final,
            'peak_capital': self.peak_capital,
            'total_return_pct': total_return,
            'max_drawdown_pct': max_dd,
            'total_rounds': self.total_rounds,
            'rounds_won': self.rounds_won,
            'rounds_lost': self.rounds_lost,
            'round_win_rate': self.rounds_won / self.total_rounds * 100 if self.total_rounds > 0 else 0,
            'total_trades': len(self.trades),
            'doubled': final >= self.initial_capital * 2,
            'doubled_count': doubled_count,
            'trades': self.trades,
            'equity_curve': self.equity_curve
        }


def main():
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
    symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', '1000PEPEUSDT']
    
    print("=" * 70)
    print("🎰 Martingale Sniper 马丁狙击手回测")
    print("=" * 70)
    
    # 运行多次模拟
    num_simulations = 5
    results = []
    
    for i in range(num_simulations):
        print(f"\n--- 模拟 #{i+1} ---")
        
        backtest = MartingaleSniperBacktest(
            initial_capital=300,
            leverage=20,
            take_profit_pct=0.15,
            stop_loss_pct=0.08,
            explosion_threshold=0.035,  # 3.5% for 5m bars
            volume_spike_ratio=4.0,
            cooldown_bars=2,
        )
        
        data = backtest.load_data(data_dir, symbols, '5m')
        if not data:
            print("❌ 没有数据")
            return
        
        result = backtest.run(data)
        results.append(result)
        
        status = "🎉 翻倍!" if result['doubled'] else ("💀 归零" if result['final_capital'] < 10 else "📊 存活")
        print(f"   {status} | 最终: {result['final_capital']:.2f}U | 收益: {result['total_return_pct']:+.1f}%")
    
    # 汇总统计
    print("\n" + "=" * 70)
    print("📊 汇总统计")
    print("=" * 70)
    
    doubled_count = sum(1 for r in results if r['doubled'])
    zero_count = sum(1 for r in results if r['final_capital'] < 10)
    avg_return = np.mean([r['total_return_pct'] for r in results])
    
    print(f"模拟次数:    {num_simulations}")
    print(f"翻倍次数:    {doubled_count} ({doubled_count/num_simulations*100:.0f}%)")
    print(f"归零次数:    {zero_count} ({zero_count/num_simulations*100:.0f}%)")
    print(f"平均收益:    {avg_return:+.1f}%")
    
    # 详细打印最后一次结果
    result = results[-1]
    print("\n" + "=" * 70)
    print("📊 最后一次详细结果")
    print("=" * 70)
    print(f"初始资金:    {result['initial_capital']:.2f} U")
    print(f"最终资金:    {result['final_capital']:.2f} U")
    print(f"峰值资金:    {result['peak_capital']:.2f} U")
    print(f"总收益率:    {result['total_return_pct']:+.2f}%")
    print(f"最大回撤:    {result['max_drawdown_pct']:.2f}%")
    print("-" * 70)
    print(f"总轮次:      {result['total_rounds']}")
    print(f"赢/输:       {result['rounds_won']} / {result['rounds_lost']}")
    print(f"轮次胜率:    {result['round_win_rate']:.1f}%")
    print(f"总交易:      {result['total_trades']}")
    print("=" * 70)
    
    # 打印交易记录
    if result['trades']:
        print("\n📝 交易记录 (最近20笔):")
        print("-" * 70)
        for t in result['trades'][-20:]:
            emoji = "✅" if t['is_win'] else "❌"
            print(f"{emoji} L{t['martingale_level']+1} {t['symbol']:12s} | "
                  f"下注 {t['bet']:3.0f}U | "
                  f"{t['reason']:12s} | "
                  f"PnL: {t['pnl_amount']:+6.1f}U | "
                  f"余额: {t['capital_after']:.1f}U")
    
    # 保存结果
    result_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'results')
    os.makedirs(result_dir, exist_ok=True)
    
    if result['trades']:
        df = pd.DataFrame(result['trades'])
        df.to_csv(os.path.join(result_dir, 'martingale_sniper_trades.csv'), index=False)
        print(f"\n✓ 交易记录已保存")
    
    if result['equity_curve']:
        df = pd.DataFrame(result['equity_curve'])
        df.to_csv(os.path.join(result_dir, 'martingale_sniper_equity.csv'), index=False)
        print(f"✓ 权益曲线已保存")


if __name__ == '__main__':
    main()
