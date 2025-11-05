"""
PerformanceMetrics - 性能指标计算类

计算回测的各种性能指标
"""

import pandas as pd
import numpy as np
from typing import Optional


class PerformanceMetrics:
    """
    性能指标计算器
    
    计算回测的各种性能指标
    """
    
    def __init__(
        self,
        equity_curve: pd.DataFrame,
        trades: pd.DataFrame,
        initial_capital: float,
        risk_free_rate: float = 0.02
    ):
        """
        初始化性能指标计算器
        
        Args:
            equity_curve: 权益曲线数据
            trades: 交易记录数据
            initial_capital: 初始资金
            risk_free_rate: 无风险利率（默认2%）
        """
        self.equity_curve = equity_curve
        self.trades = trades
        self.initial_capital = initial_capital
        self.risk_free_rate = risk_free_rate
        
        # 计算所有指标
        self._calculate_all()
        
    def _calculate_all(self) -> None:
        """计算所有性能指标"""
        if len(self.equity_curve) == 0:
            self._set_default_metrics()
            return
            
        self.total_return = self._calculate_total_return()
        self.annual_return = self._calculate_annual_return()
        self.sharpe_ratio = self._calculate_sharpe_ratio()
        self.max_drawdown = self._calculate_max_drawdown()
        self.win_rate = self._calculate_win_rate()
        self.profit_factor = self._calculate_profit_factor()
        self.total_trades = len(self.trades)
        
    def _set_default_metrics(self) -> None:
        """设置默认指标值"""
        self.total_return = 0.0
        self.annual_return = 0.0
        self.sharpe_ratio = 0.0
        self.max_drawdown = 0.0
        self.win_rate = 0.0
        self.profit_factor = 0.0
        self.total_trades = 0
        
    def _calculate_total_return(self) -> float:
        """计算总收益率"""
        if len(self.equity_curve) == 0:
            return 0.0
        final_value = self.equity_curve['equity'].iloc[-1]
        return (final_value - self.initial_capital) / self.initial_capital
        
    def _calculate_annual_return(self) -> float:
        """计算年化收益率"""
        if len(self.equity_curve) < 2:
            return 0.0
            
        # 计算天数
        start_date = self.equity_curve['timestamp'].iloc[0]
        end_date = self.equity_curve['timestamp'].iloc[-1]
        days = (end_date - start_date).days
        
        if days == 0:
            return 0.0
            
        years = days / 365.0
        return ((1 + self.total_return) ** (1 / years)) - 1
        
    def _calculate_sharpe_ratio(self) -> float:
        """计算夏普比率"""
        if len(self.equity_curve) < 2:
            return 0.0
            
        # 计算日收益率
        returns = self.equity_curve['equity'].pct_change().dropna()
        
        if len(returns) == 0 or returns.std() == 0:
            return 0.0
            
        # 年化
        excess_return = returns.mean() * 252 - self.risk_free_rate
        volatility = returns.std() * np.sqrt(252)
        
        return excess_return / volatility if volatility != 0 else 0.0
        
    def _calculate_max_drawdown(self) -> float:
        """计算最大回撤"""
        if len(self.equity_curve) == 0:
            return 0.0
            
        equity = self.equity_curve['equity']
        cummax = equity.cummax()
        drawdown = (equity - cummax) / cummax
        
        return abs(drawdown.min())
        
    def _calculate_win_rate(self) -> float:
        """计算胜率"""
        if len(self.trades) == 0:
            return 0.0
            
        # 这里需要根据实际的交易记录计算盈亏
        # 简化处理：假设有 pnl 字段
        if 'pnl' in self.trades.columns:
            winning_trades = len(self.trades[self.trades['pnl'] > 0])
            return winning_trades / len(self.trades)
        
        return 0.0
        
    def _calculate_profit_factor(self) -> float:
        """计算盈亏比"""
        if len(self.trades) == 0:
            return 0.0
            
        # 简化处理：假设有 pnl 字段
        if 'pnl' in self.trades.columns:
            gross_profit = self.trades[self.trades['pnl'] > 0]['pnl'].sum()
            gross_loss = abs(self.trades[self.trades['pnl'] < 0]['pnl'].sum())
            
            if gross_loss == 0:
                return 0.0
                
            return gross_profit / gross_loss
        
        return 0.0
        
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            'total_return': self.total_return,
            'annual_return': self.annual_return,
            'sharpe_ratio': self.sharpe_ratio,
            'max_drawdown': self.max_drawdown,
            'win_rate': self.win_rate,
            'profit_factor': self.profit_factor,
            'total_trades': self.total_trades
        }
        
    def __repr__(self) -> str:
        return (
            f"PerformanceMetrics(\n"
            f"  Total Return: {self.total_return:.2%}\n"
            f"  Annual Return: {self.annual_return:.2%}\n"
            f"  Sharpe Ratio: {self.sharpe_ratio:.2f}\n"
            f"  Max Drawdown: {self.max_drawdown:.2%}\n"
            f"  Win Rate: {self.win_rate:.2%}\n"
            f"  Profit Factor: {self.profit_factor:.2f}\n"
            f"  Total Trades: {self.total_trades}\n"
            f")"
        )
