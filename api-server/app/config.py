"""
配置管理模块
"""
import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置"""
    

    
    # 服务器配置
    api_host: str = "0.0.0.0"
    api_port: int = 3001
    debug: bool = True
    
    # 数据库配置
    database_url: str = "sqlite:///./data/zhixing_trader.db"
    
    # 日志配置
    log_level: str = "INFO"
    log_file: str = "./logs/api.log"
    
    # CORS配置
    cors_origins: List[str] = ["*"]
    
    # API限制
    max_requests_per_minute: int = 100
    
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
