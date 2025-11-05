"""
BacktestEngine - 回测引擎核心类

负责整个回测流程的执行和管理
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import pandas as pd
from .portfolio import Portfolio
from .order import Order, OrderType
from ..strategy.base import BaseStrategy
from ..analysis.metrics import PerformanceMetrics


class BacktestEngine:
    """
    回测引擎
    
    负责执行回测流程，管理数据、策略、投资组合等
    """
    
    def __init__(
        self,
        initial_capital: float = 100000.0,
        commission: float = 0.001,
        slippage: float = 0.0005,
        leverage: float = 1.0,
        **kwargs
    ):
        """
        初始化回测引擎
        
        Args:
            initial_capital: 初始资金
            commission: 手续费率（例如 0.001 表示 0.1%）
            slippage: 滑点率（例如 0.0005 表示 0.05%）
            leverage: 杠杆倍数
            **kwargs: 其他配置参数
        """
        self.initial_capital = initial_capital
        self.commission = commission
        self.slippage = slippage
        self.leverage = leverage
        self.config = kwargs
        
        # 初始化组件
        self.portfolio = Portfolio(initial_capital, commission, slippage, leverage)
        self.strategy: Optional[BaseStrategy] = None
        self.data: Optional[pd.DataFrame] = None
        
        # 回测结果
        self.trades: List[Dict] = []
        self.equity_curve: List[Dict] = []
        self.metrics: Optional[PerformanceMetrics] = None
        
    def set_strategy(self, strategy: BaseStrategy) -> None:
        """设置交易策略"""
        self.strategy = strategy
        
    def set_data(self, data: pd.DataFrame) -> None:
        """设置回测数据"""
        self.data = data
        
    def run(
        self,
        data: Optional[pd.DataFrame] = None,
        strategy: Optional[BaseStrategy] = None
    ) -> "BacktestResult":
        """
        运行回测
        
        Args:
            data: 回测数据（可选，如果已通过 set_data 设置）
            strategy: 交易策略（可选，如果已通过 set_strategy 设置）
            
        Returns:
            BacktestResult: 回测结果对象
        """
        if data is not None:
            self.data = data
        if strategy is not None:
            self.strategy = strategy
            
        if self.data is None:
            raise ValueError("回测数据未设置")
        if self.strategy is None:
            raise ValueError("交易策略未设置")
            
        # 重置状态
        self._reset()
        
        # 执行回测循环
        for idx, row in self.data.iterrows():
            self._process_bar(idx, row)
            
        # 计算性能指标
        self.metrics = self._calculate_metrics()
        
        return BacktestResult(
            trades=self.trades,
            equity_curve=self.equity_curve,
            metrics=self.metrics,
            portfolio=self.portfolio
        )
        
    def _reset(self) -> None:
        """重置回测状态"""
        self.portfolio = Portfolio(
            self.initial_capital,
            self.commission,
            self.slippage,
            self.leverage
        )
        self.trades = []
        self.equity_curve = []
        
    def _process_bar(self, timestamp: Any, bar: pd.Series) -> None:
        """
        处理单个K线数据
        
        Args:
            timestamp: 时间戳
            bar: K线数据
        """
        # 更新投资组合价值
        self.portfolio.update(bar)
        
        # 生成交易信号
        signals = self.strategy.generate_signals(bar, self.portfolio)
        
        # 执行交易
        for signal in signals:
            self._execute_signal(signal, bar)
            
        # 记录权益曲线
        self.equity_curve.append({
            "timestamp": timestamp,
            "equity": self.portfolio.get_total_value(),
            "cash": self.portfolio.cash,
            "positions_value": self.portfolio.get_positions_value()
        })
        
    def _execute_signal(self, signal: Dict, bar: pd.Series) -> None:
        """
        执行交易信号
        
        Args:
            signal: 交易信号
            bar: 当前K线数据
        """
        symbol = signal.get("symbol")
        action = signal.get("action")
        quantity = signal.get("quantity", 0)
        
        if action == "BUY":
            order = self.portfolio.buy(symbol, quantity, bar["close"])
            if order:
                self.trades.append({
                    "timestamp": bar.name,
                    "symbol": symbol,
                    "action": "BUY",
                    "quantity": quantity,
                    "price": order.filled_price,
                    "commission": order.commission
                })
                
        elif action == "SELL":
            order = self.portfolio.sell(symbol, quantity, bar["close"])
            if order:
                self.trades.append({
                    "timestamp": bar.name,
                    "symbol": symbol,
                    "action": "SELL",
                    "quantity": quantity,
                    "price": order.filled_price,
                    "commission": order.commission
                })
                
    def _calculate_metrics(self) -> PerformanceMetrics:
        """计算性能指标"""
        equity_df = pd.DataFrame(self.equity_curve)
        trades_df = pd.DataFrame(self.trades) if self.trades else pd.DataFrame()
        
        return PerformanceMetrics(
            equity_curve=equity_df,
            trades=trades_df,
            initial_capital=self.initial_capital
        )


class BacktestResult:
    """回测结果类"""
    
    def __init__(
        self,
        trades: List[Dict],
        equity_curve: List[Dict],
        metrics: PerformanceMetrics,
        portfolio: Portfolio
    ):
        self.trades = pd.DataFrame(trades) if trades else pd.DataFrame()
        self.equity_curve = pd.DataFrame(equity_curve)
        self.metrics = metrics
        self.portfolio = portfolio
        
    @property
    def total_return(self) -> float:
        """总收益率"""
        return self.metrics.total_return
        
    @property
    def annual_return(self) -> float:
        """年化收益率"""
        return self.metrics.annual_return
        
    @property
    def sharpe_ratio(self) -> float:
        """夏普比率"""
        return self.metrics.sharpe_ratio
        
    @property
    def max_drawdown(self) -> float:
        """最大回撤"""
        return self.metrics.max_drawdown
        
    def generate_report(self, output_path: str, format: str = "html") -> None:
        """
        生成回测报告
        
        Args:
            output_path: 输出文件路径
            format: 报告格式（html, pdf）
        """
        from ..analysis.report import BacktestReport
        
        report = BacktestReport(self)
        report.generate(output_path, format)
        
    def __repr__(self) -> str:
        return (
            f"BacktestResult(\n"
            f"  Total Return: {self.total_return:.2%}\n"
            f"  Annual Return: {self.annual_return:.2%}\n"
            f"  Sharpe Ratio: {self.sharpe_ratio:.2f}\n"
            f"  Max Drawdown: {self.max_drawdown:.2%}\n"
            f"  Total Trades: {len(self.trades)}\n"
            f")"
        )
