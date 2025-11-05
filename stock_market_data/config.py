"""
Market Data Service Configuration
市场数据服务配置
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings


class MarketDataConfig(BaseSettings):
    """市场数据服务配置"""
    
    # ==================== API Keys ====================
    
    # Yahoo Finance (无需API Key)
    yahoo_rate_limit: float = 0.5  # 秒
    
    # Alpha Vantage
    alpha_vantage_api_key_1: Optional[str] = None
    alpha_vantage_api_key_2: Optional[str] = None
    alpha_vantage_api_key_3: Optional[str] = None
    alphavantage_rate_limit: float = 12.0  # 秒 (每分钟5次)
    
    # Finnhub
    finnhub_api_key_1: Optional[str] = None
    finnhub_api_key_2: Optional[str] = None
    finnhub_api_key_3: Optional[str] = None
    finnhub_rate_limit: float = 1.0  # 秒
    
    # Twelve Data
    twelvedata_api_key: Optional[str] = None
    twelvedata_rate_limit: float = 7.5  # 秒
    
    # IEX Cloud
    iex_api_key: Optional[str] = None
    iex_rate_limit: float = 0.1  # 秒
    
    # Financial Modeling Prep
    fmp_api_key: Optional[str] = None
    fmp_rate_limit: float = 0.3  # 秒
    
    # ==================== Provider Settings ====================
    
    # 市场数据提供者模式
    # single: 单一数据源
    # multi: 多数据源策略
    # hybrid: 混合策略
    market_data_provider: str = "multi"
    
    # 数据源配置 (格式: provider:priority:weight)
    # 示例: "alphavantage1:1:25,alphavantage2:1:25,yahoo:2:20"
    data_sources_config: str = "alphavantage1:1:25,alphavantage2:1:25,alphavantage3:1:20,twelvedata:1:20,yahoo:2:10"
    
    # ==================== Cache Settings ====================
    
    # 缓存启用
    enable_cache: bool = True
    
    # 缓存过期时间（秒）
    cache_ttl_quote: int = 60  # 实时报价缓存1分钟
    cache_ttl_kline: int = 3600  # K线数据缓存1小时
    cache_ttl_info: int = 86400  # 股票信息缓存24小时
    
    # ==================== Retry Settings ====================
    
    # 重试次数
    max_retries: int = 3
    
    # 重试延迟（秒）
    retry_delay: float = 1.0
    
    # ==================== Logging ====================
    
    # 日志级别
    log_level: str = "INFO"
    
    # 日志文件路径
    log_file: Optional[str] = None
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# 全局配置实例
settings = MarketDataConfig()


def get_alpha_vantage_keys():
    """获取所有Alpha Vantage API Keys"""
    keys = []
    if settings.alpha_vantage_api_key_1:
        keys.append(settings.alpha_vantage_api_key_1)
    if settings.alpha_vantage_api_key_2:
        keys.append(settings.alpha_vantage_api_key_2)
    if settings.alpha_vantage_api_key_3:
        keys.append(settings.alpha_vantage_api_key_3)
    return keys


def get_finnhub_keys():
    """获取所有Finnhub API Keys"""
    keys = []
    if settings.finnhub_api_key_1:
        keys.append(settings.finnhub_api_key_1)
    if settings.finnhub_api_key_2:
        keys.append(settings.finnhub_api_key_2)
    if settings.finnhub_api_key_3:
        keys.append(settings.finnhub_api_key_3)
    return keys


def parse_data_sources_config():
    """
    解析数据源配置字符串
    
    返回格式: [(provider_name, priority, weight), ...]
    """
    if not settings.data_sources_config:
        return []
    
    sources = []
    for item in settings.data_sources_config.split(','):
        parts = item.strip().split(':')
        if len(parts) == 3:
            provider, priority, weight = parts
            sources.append((provider, int(priority), int(weight)))
    
    return sources


