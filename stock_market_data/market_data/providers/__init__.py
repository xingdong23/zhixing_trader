"""
市场数据模块
包含数据获取、处理和存储功能
"""
from .yahoo_provider import YahooFinanceProvider, MarketDataProviderFactory
from .alphavantage_provider import AlphaVantageProvider
from .finnhub_provider import FinnhubProvider
from .twelvedata_provider import TwelveDataProvider
from .hybrid_provider import HybridProvider
from .multi_provider import MultiProvider
MultiProviderStrategy = MultiProvider  # 别名，保持兼容性
from .multi_account_provider import MultiAccountProvider
from .scenario_router import ScenarioRouter

__all__ = [
    "YahooFinanceProvider",
    "AlphaVantageProvider",
    "FinnhubProvider",
    "TwelveDataProvider",
    "HybridProvider",
    "MultiProvider",
    "MultiProviderStrategy",
    "MultiAccountProvider",
    "ScenarioRouter",
    "MarketDataProviderFactory"
]
