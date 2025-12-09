"""
回测模块 - 专业的量化交易策略回测系统

目录结构:
- configs/: 回测配置文件
- data/: 历史数据文件
- core/: 核心代码模块
- results/: 回测结果输出
"""

from .core import DataLoader, BacktestEngine, PerformanceAnalyzer

__all__ = ['DataLoader', 'BacktestEngine', 'PerformanceAnalyzer']

__version__ = '1.0.0'
