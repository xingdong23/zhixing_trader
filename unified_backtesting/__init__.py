"""
Unified Backtesting Module - 统一回测模块

支持股票和加密货币策略的统一回测系统
"""

from .core.engine import BacktestEngine
from .core.portfolio import Portfolio
from .core.order import Order, OrderType, OrderStatus
from .core.position import Position
from .data.data_loader import DataLoader
from .strategy.base import BaseStrategy
from .analysis.metrics import PerformanceMetrics
from .analysis.report import BacktestReport

__version__ = "0.1.0"
__author__ = "Zhixing Trader Team"

__all__ = [
    "BacktestEngine",
    "Portfolio",
    "Order",
    "OrderType",
    "OrderStatus",
    "Position",
    "DataLoader",
    "BaseStrategy",
    "PerformanceMetrics",
    "BacktestReport",
]
