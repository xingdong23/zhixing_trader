"""
配置管理模块
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# 加载环境变量
env_path = Path(__file__).parent.parent / 'config' / '.env'
load_dotenv(env_path)


class Config:
    """配置类"""
    
    # 欧易API配置
    OKX_API_KEY = os.getenv('OKX_API_KEY', '')
    OKX_SECRET_KEY = os.getenv('OKX_SECRET_KEY', '')
    OKX_PASSPHRASE = os.getenv('OKX_PASSPHRASE', '')
    OKX_BASE_URL = os.getenv('OKX_BASE_URL', 'https://www.okx.com')
    
    # 数据库配置
    DB_TYPE = os.getenv('DB_TYPE', 'sqlite')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 3306))
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'trading_paper')
    SQLITE_DB_PATH = os.getenv('SQLITE_DB_PATH', './paper_trading.db')
    
    # 模拟盘配置
    INITIAL_BALANCE = float(os.getenv('INITIAL_BALANCE', 300))
    LEVERAGE = float(os.getenv('LEVERAGE', 2.7))
    POSITION_SIZE = float(os.getenv('POSITION_SIZE', 0.85))
    STOP_LOSS_PCT = float(os.getenv('STOP_LOSS_PCT', 0.032))
    TAKE_PROFIT_PCT = float(os.getenv('TAKE_PROFIT_PCT', 0.07))
    
    # 交易对配置
    SYMBOL = os.getenv('SYMBOL', 'ETH-USDT-SWAP')
    TIMEFRAME = os.getenv('TIMEFRAME', '1H')
    
    # 手续费配置
    TAKER_FEE = float(os.getenv('TAKER_FEE', 0.0005))
    MAKER_FEE = float(os.getenv('MAKER_FEE', 0.0002))
    SLIPPAGE = float(os.getenv('SLIPPAGE', 0.0001))
    
    # 策略配置
    STRATEGY_NAME = os.getenv('STRATEGY_NAME', 'ema_simple_trend_multiframe')
    STRATEGY_CONFIG = os.getenv('STRATEGY_CONFIG', '../app/strategies/ema_simple_trend/config_multiframe.json')
    DAILY_DATA_FILE = os.getenv('DAILY_DATA_FILE', '../data/ETHUSDT-1d-from1h.csv')
    
    # 运行配置
    CHECK_INTERVAL = int(os.getenv('CHECK_INTERVAL', 300))  # 5分钟
    SIGNAL_CHECK_INTERVAL = int(os.getenv('SIGNAL_CHECK_INTERVAL', 3600))  # 1小时
    
    # 日志配置
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', './logs/paper_trading.log')
    
    # 通知配置
    EMAIL_ENABLED = os.getenv('EMAIL_ENABLED', 'false').lower() == 'true'
    EMAIL_SMTP_HOST = os.getenv('EMAIL_SMTP_HOST', 'smtp.gmail.com')
    EMAIL_SMTP_PORT = int(os.getenv('EMAIL_SMTP_PORT', 587))
    EMAIL_FROM = os.getenv('EMAIL_FROM', '')
    EMAIL_TO = os.getenv('EMAIL_TO', '')
    EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD', '')
    
    WECHAT_ENABLED = os.getenv('WECHAT_ENABLED', 'false').lower() == 'true'
    WECHAT_WEBHOOK = os.getenv('WECHAT_WEBHOOK', '')
    
    # 监控配置
    WEB_PORT = int(os.getenv('WEB_PORT', 8888))
    WEB_HOST = os.getenv('WEB_HOST', '0.0.0.0')
    
    @classmethod
    def validate(cls):
        """验证配置"""
        if not cls.OKX_API_KEY:
            raise ValueError("OKX_API_KEY is required")
        if not cls.OKX_SECRET_KEY:
            raise ValueError("OKX_SECRET_KEY is required")
        if not cls.OKX_PASSPHRASE:
            raise ValueError("OKX_PASSPHRASE is required")
        
        print("✅ 配置验证成功")
        print(f"  数据库类型: {cls.DB_TYPE}")
        print(f"  交易对: {cls.SYMBOL}")
        print(f"  初始资金: {cls.INITIAL_BALANCE} USDT")
        print(f"  杠杆: {cls.LEVERAGE}x")
        print(f"  仓位: {cls.POSITION_SIZE * 100}%")


if __name__ == '__main__':
    Config.validate()
