"""
Market Data Service - 市场数据服务模块

提供统一的市场数据获取接口，支持多数据源：
- Yahoo Finance
- Alpha Vantage
- Finnhub
- Twelve Data
- IEX Cloud
- Financial Modeling Prep
"""

from .interfaces import IMarketDataProvider
from .providers.yahoo_provider import YahooFinanceProvider
from .providers.alphavantage_provider import AlphaVantageProvider
from .providers.finnhub_provider import FinnhubProvider
from .providers.twelvedata_provider import TwelveDataProvider
from .providers.multi_provider import MultiProvider as MultiProviderStrategy
from .providers.multi_account_provider import MultiAccountProvider
from .providers.hybrid_provider import HybridProvider
from .providers.scenario_router import ScenarioRouter

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

__version__ = '1.0.0'

