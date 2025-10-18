"""
Quant Trading 配置
"""
import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """应用配置"""
    
    # 应用信息
    app_name: str = "Quant Trading"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # 数据库配置
    database_url: str = "mysql+pymysql://trader:Cz159csa@127.0.0.1:3306/zhixing_trader"
    
    # API配置
    api_prefix: str = "/api/v1"
    
    # 市场数据服务配置
    market_data_service_url: str = "http://localhost:8003"
    
    # 交易日志服务配置  
    trading_journal_url: str = "http://localhost:8001"
    
    # 策略配置
    strategy_execution_timeout: int = 300  # 秒
    max_concurrent_strategies: int = 5
    
    # 回测配置
    backtest_initial_capital: float = 100000.0
    backtest_commission: float = 0.001  # 0.1%
    
    # 交易配置
    max_position_size: float = 0.2  # 单个仓位最大占比20%
    max_total_positions: int = 10
    
    # 风控配置
    max_daily_loss: float = 0.05  # 最大日亏损5%
    max_drawdown: float = 0.20    # 最大回撤20%
    
    # 日志配置
    log_level: str = "INFO"
    log_dir: str = "logs"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# 全局配置实例
settings = Settings()

