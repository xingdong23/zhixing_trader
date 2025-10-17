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
    
    # 市场数据源配置
    market_data_provider: str = "multi"  # 可选: yahoo, alphavantage, finnhub, twelvedata, hybrid, multi
    
    # API密钥配置
    alpha_vantage_api_key: str = os.getenv("ALPHA_VANTAGE_API_KEY", "")
    alpha_vantage_api_key_1: str = os.getenv("ALPHA_VANTAGE_API_KEY_1", "")
    alpha_vantage_api_key_2: str = os.getenv("ALPHA_VANTAGE_API_KEY_2", "")
    alpha_vantage_api_key_3: str = os.getenv("ALPHA_VANTAGE_API_KEY_3", "")
    finnhub_api_key: str = os.getenv("FINNHUB_API_KEY", "")
    finnhub_api_key_1: str = os.getenv("FINNHUB_API_KEY_1", "")
    finnhub_api_key_2: str = os.getenv("FINNHUB_API_KEY_2", "")
    finnhub_api_key_3: str = os.getenv("FINNHUB_API_KEY_3", "")
    twelvedata_api_key: str = os.getenv("TWELVEDATA_API_KEY", "")
    
    # 各数据源速率限制
    yahoo_rate_limit: float = 0.5  # 雅虎API调用间隔（秒）
    alphavantage_rate_limit: float = 12.0  # Alpha Vantage: 5次/分钟
    finnhub_rate_limit: float = 1.0  # Finnhub: 60次/分钟
    twelvedata_rate_limit: float = 7.5  # Twelve Data: 8次/分钟
    
    # 数据源优先级配置（用于multi模式）
    # 格式: "数据源名:优先级:权重,..."
    # 优先级: 1-5 (数字越小优先级越高)
    # 权重: 1-100 (用于负载均衡)
    data_sources_config: str = os.getenv(
        "DATA_SOURCES_CONFIG",
        "finnhub:1:40,twelvedata:1:30,alphavantage:2:15,yahoo:3:15"
    )
    
    # 数据源优先级（hybrid模式下）
    primary_data_source: str = "finnhub"  # 主要数据源
    
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
