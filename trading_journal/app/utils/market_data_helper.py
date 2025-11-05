"""
Market Data Helper
从独立的market_data_service模块导入市场数据功能
"""

import sys
from pathlib import Path

# 添加market_data_service到Python路径
_market_data_path = Path(__file__).parent.parent.parent.parent / 'market_data_service'
if str(_market_data_path) not in sys.path:
    sys.path.insert(0, str(_market_data_path))

# 从market_data_service导入
from market_data import (
    IMarketDataProvider,
    YahooFinanceProvider,
    AlphaVantageProvider,
    FinnhubProvider,
    TwelveDataProvider,
    MultiProviderStrategy,
    MultiAccountProvider,
    HybridProvider,
    ScenarioRouter,
)

__all__ = [
    'IMarketDataProvider',
    'YahooFinanceProvider',
    'AlphaVantageProvider',
    'FinnhubProvider',
    'TwelveDataProvider',
    'MultiProviderStrategy',
    'MultiAccountProvider',
    'HybridProvider',
    'ScenarioRouter',
]
