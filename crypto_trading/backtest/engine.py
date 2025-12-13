"""
回测引擎
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
import numpy as np
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime

from strategies.base_strategy import BaseStrategy

logger = logging.getLogger(__name__)


@dataclass
class Trade:
    """交易记录"""
    entry_time: datetime
    entry_price: float
    exit_time: Optional[datetime] = None
    exit_price: Optional[float] = None
    side: str = 'long'
    pnl: float = 0.0
    pnl_pct: float = 0.0
    exit_reason: str = ""


@dataclass
class BacktestResult:
    """回测结果"""
    strategy_name: str
    symbol: str
    timeframe: str
    start_date: datetime
    end_date: datetime
    
    # 绩效指标
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    win_rate: float = 0.0
    
    total_pnl: float = 0.0
    total_pnl_pct: float = 0.0
    avg_pnl_pct: float = 0.0
    max_drawdown: float = 0.0
    sharpe_ratio: float = 0.0
    
    # 交易列表
    trades: List[Trade] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'strategy': self.strategy_name,
            'symbol': self.symbol,
            'timeframe': self.timeframe,
            'period': f"{self.start_date} - {self.end_date}",
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'losing_trades': self.losing_trades,
            'win_rate': f"{self.win_rate*100:.1f}%",
            'total_pnl_pct': f"{self.total_pnl_pct*100:.2f}%",
            'avg_pnl_pct': f"{self.avg_pnl_pct*100:.2f}%",
            'max_drawdown': f"{self.max_drawdown*100:.2f}%",
        }


class BacktestEngine:
    """
    回测引擎
    
    支持:
    - 止损/止盈
    - 移动止盈
    - 手续费和滑点
    """
    
    def __init__(
        self,
        strategy: BaseStrategy,
        initial_capital: float = 10000,
        leverage: int = 10,
        position_size_pct: float = 1.0,  # 每次使用的资金比例
    ):
        """
        Args:
            strategy: 策略实例
            initial_capital: 初始资金
            leverage: 杠杆倍数
            position_size_pct: 仓位比例 (0-1)
        """
        self.strategy = strategy
        self.initial_capital = initial_capital
        self.leverage = leverage
        self.position_size_pct = position_size_pct
        
        # 回测状态
        self._trades: List[Trade] = []
        self._equity_curve: List[float] = []
    
    def run(self, df: pd.DataFrame) -> BacktestResult:
        """
        执行回测
        
        Args:
            df: OHLCV 数据，需要包含 'date', 'open', 'high', 'low', 'close', 'volume'
            
        Returns:
            BacktestResult
        """
        logger.info(f"Starting backtest: {len(df)} bars")
        
        # 计算指标
        df = self.strategy.calculate_indicators(df)
        
        # 向量化计算入场信号
        if hasattr(self.strategy, 'populate_entry_signals'):
            df = self.strategy.populate_entry_signals(df)
        
        # 状态变量
        capital = self.initial_capital
        position = None  # Trade object
        self._trades = []
        self._equity_curve = [capital]
        
        # 获取策略参数
        stop_loss_pct = self.strategy.params.get('stop_loss_pct', 0.08)
        ts_activation = self.strategy.params.get('trailing_stop_activation', 0.10)
        ts_callback = self.strategy.params.get('trailing_stop_callback', 0.15)
        cost_per_trade = self.strategy.get_cost_per_trade()
        
        highest_pnl_pct = 0.0
        
        # 遍历每根 K 线
        for i in range(50, len(df)):
            curr = df.iloc[i]
            current_price = curr['close']
            current_time = curr['date'] if 'date' in curr else i
            
            # 如果有持仓，检查风控
            if position:
                # 根据方向计算盈亏
                if position.side == 'long':
                    pnl_pct = (current_price - position.entry_price) / position.entry_price
                else:  # short
                    pnl_pct = (position.entry_price - current_price) / position.entry_price
                
                # 更新最高盈利
                if pnl_pct > highest_pnl_pct:
                    highest_pnl_pct = pnl_pct
                
                should_close = False
                exit_reason = ""
                
                # 止损
                if pnl_pct <= -stop_loss_pct:
                    should_close = True
                    exit_reason = "止损"
                
                # 移动止盈
                elif highest_pnl_pct >= ts_activation:
                    if pnl_pct < (highest_pnl_pct - ts_callback):
                        should_close = True
                        exit_reason = "移动止盈"
                
                if should_close:
                    # 平仓
                    position.exit_time = current_time
                    position.exit_price = current_price
                    position.pnl_pct = pnl_pct - cost_per_trade
                    position.pnl = capital * position.pnl_pct * self.leverage
                    position.exit_reason = exit_reason
                    
                    capital += position.pnl
                    self._trades.append(position)
                    position = None
                    highest_pnl_pct = 0.0
            
            # 如果没有持仓，检查开仓信号
            else:
                signal = self.strategy.generate_signal(df, i)
                
                if signal == 'long':
                    position = Trade(
                        entry_time=current_time,
                        entry_price=current_price,
                        side='long'
                    )
                    highest_pnl_pct = 0.0
                elif signal == 'short':
                    position = Trade(
                        entry_time=current_time,
                        entry_price=current_price,
                        side='short'
                    )
                    highest_pnl_pct = 0.0
            
            # 记录权益
            if position:
                if position.side == 'long':
                    unrealized_pnl_pct = (current_price - position.entry_price) / position.entry_price
                else:  # short
                    unrealized_pnl_pct = (position.entry_price - current_price) / position.entry_price
                current_equity = capital + (capital * unrealized_pnl_pct * self.leverage)
            else:
                current_equity = capital
            
            self._equity_curve.append(current_equity)
        
        # 如果还有持仓，强制平仓
        if position:
            final_price = df.iloc[-1]['close']
            if position.side == 'long':
                pnl_pct = (final_price - position.entry_price) / position.entry_price
            else:  # short
                pnl_pct = (position.entry_price - final_price) / position.entry_price
            position.exit_time = df.iloc[-1]['date'] if 'date' in df.iloc[-1] else len(df)
            position.exit_price = final_price
            position.pnl_pct = pnl_pct - cost_per_trade
            position.pnl = capital * position.pnl_pct * self.leverage
            position.exit_reason = "回测结束"
            capital += position.pnl
            self._trades.append(position)
        
        # 计算结果
        return self._calculate_result(df)
    
    def _calculate_result(self, df: pd.DataFrame) -> BacktestResult:
        """计算回测结果"""
        trades = self._trades
        
        total_trades = len(trades)
        winning_trades = sum(1 for t in trades if t.pnl > 0)
        losing_trades = sum(1 for t in trades if t.pnl <= 0)
        
        win_rate = winning_trades / total_trades if total_trades > 0 else 0
        
        total_pnl = sum(t.pnl for t in trades)
        total_pnl_pct = total_pnl / self.initial_capital
        avg_pnl_pct = np.mean([t.pnl_pct for t in trades]) if trades else 0
        
        # 最大回撤
        equity = np.array(self._equity_curve)
        peak = np.maximum.accumulate(equity)
        drawdown = (equity - peak) / peak
        max_drawdown = abs(np.min(drawdown))
        
        return BacktestResult(
            strategy_name=self.strategy.name,
            symbol=df.get('symbol', 'Unknown') if hasattr(df, 'get') else 'Unknown',
            timeframe=self.strategy.timeframe,
            start_date=df.iloc[0]['date'] if 'date' in df.columns else None,
            end_date=df.iloc[-1]['date'] if 'date' in df.columns else None,
            total_trades=total_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            win_rate=win_rate,
            total_pnl=total_pnl,
            total_pnl_pct=total_pnl_pct,
            avg_pnl_pct=avg_pnl_pct,
            max_drawdown=max_drawdown,
            trades=trades
        )
    
    def print_result(self, result: BacktestResult) -> None:
        """打印回测结果"""
        print("\n" + "="*50)
        print(f"📊 回测结果: {result.strategy_name}")
        print("="*50)
        print(f"时间周期: {result.start_date} ~ {result.end_date}")
        print(f"总交易次数: {result.total_trades}")
        print(f"胜率: {result.win_rate*100:.1f}%")
        print(f"总收益: {result.total_pnl_pct*100:.2f}%")
        print(f"平均每笔: {result.avg_pnl_pct*100:.2f}%")
        print(f"最大回撤: {result.max_drawdown*100:.2f}%")
        print("="*50)
