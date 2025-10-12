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
    
    # 数据库配置 - 强制使用MySQL，杜绝SQLite避免内存问题
    # 默认使用本地MySQL配置，可通过环境变量覆盖
    # 请根据你的实际MySQL配置修改用户名、密码和数据库名
    database_url: str = os.getenv("DATABASE_URL", "mysql+pymysql://root:Cz159csa@127.0.0.1:3306/zhixing_trader")
    
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
    max_kline_days: int = 730  # 增加到2年，支持更多历史数据用于技术分析
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# 全局配置实例
settings = Settings()


def validate_config():
    """验证配置 - 确保使用MySQL"""
    errors = []
    
    # 强制检查数据库配置，杜绝SQLite
    if settings.database_url.startswith("sqlite"):
        errors.append("❌ 禁止使用SQLite数据库！请配置MySQL数据库连接。")
    
    if not settings.database_url.startswith("mysql"):
        errors.append(f"❌ 不支持的数据库类型。当前配置: {settings.database_url}，系统只支持MySQL。")
    
    if errors:
        raise ValueError(f"Configuration validation failed: {', '.join(errors)}")


# 创建必要的目录
def ensure_directories():
    """确保必要的目录存在 - 不再创建SQLite数据目录"""
    # 只创建日志目录，数据存储在MySQL中
    os.makedirs("logs", exist_ok=True)
