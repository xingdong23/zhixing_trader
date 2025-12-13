"""
全局配置设置
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent

# 数据目录
DATA_DIR = PROJECT_ROOT / "data"
HISTORICAL_DATA_DIR = DATA_DIR / "historical"
TRADES_DIR = DATA_DIR / "trades"
LOGS_DIR = DATA_DIR / "logs"

# 配置目录
CONFIG_DIR = PROJECT_ROOT / "config"
EXCHANGES_CONFIG_DIR = CONFIG_DIR / "exchanges"
STRATEGIES_CONFIG_DIR = CONFIG_DIR / "strategies"

# 交易所 API (从环境变量读取)
OKX_API_KEY = os.getenv("OKX_API_KEY", "")
OKX_SECRET = os.getenv("OKX_SECRET", "")
OKX_PASSPHRASE = os.getenv("OKX_PASSPHRASE", "")

# 通知
FEISHU_WEBHOOK_URL = os.getenv("FEISHU_WEBHOOK_URL", "")

# 运行模式
DRY_RUN = os.getenv("DRY_RUN", "true").lower() == "true"

# 日志配置
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
