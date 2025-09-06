"""
配置管理模块
"""
import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置"""
    
    # 富途OpenAPI配置
    futu_host: str = "127.0.0.1"
    futu_port: str = "11111"
    futu_username: str = ""
    futu_password: str = ""
    
    # 服务器配置
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True
    
    # 数据库配置
    # 默认使用SQLite；可通过环境变量切换为MySQL，例如：
    # mysql+pymysql://root:password@127.0.0.1:3306/zhixing_trader
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./data/zhixing_trader.db")
    
    # 日志配置
    log_level: str = "WARNING"
    log_file: str = "./logs/api.log"
    
    # CORS配置
    cors_origins: List[str] = ["*"]
    
    # 数据更新频率配置
    quote_update_interval: int = 5
    watchlist_update_interval: int = 60
    
    # API限制
    max_requests_per_minute: int = 100
    max_quote_batch_size: int = 200
    max_kline_days: int = 365
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# 全局配置实例
settings = Settings()


def validate_config():
    """验证配置"""
    errors = []
    

    
    if errors:
        raise ValueError(f"Configuration validation failed: {', '.join(errors)}")


# 创建必要的目录
def ensure_directories():
    """确保必要的目录存在"""
    os.makedirs("data", exist_ok=True)
    os.makedirs("logs", exist_ok=True)
