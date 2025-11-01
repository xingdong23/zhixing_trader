"""
数据库初始化脚本
"""
import sys
from pathlib import Path

# 添加src到路径
sys.path.insert(0, str(Path(__file__).parent))

from config import Config
from database import get_db
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def main():
    """初始化数据库"""
    try:
        logger.info("=" * 60)
        logger.info("开始初始化数据库")
        logger.info("=" * 60)
        
        # 验证配置
        logger.info(f"数据库类型: {Config.DB_TYPE}")
        
        if Config.DB_TYPE == 'sqlite':
            logger.info(f"SQLite路径: {Config.SQLITE_DB_PATH}")
        else:
            logger.info(f"MySQL配置: {Config.DB_HOST}:{Config.DB_PORT}/{Config.DB_NAME}")
        
        # 连接数据库（会自动创建表）
        db = get_db()
        
        logger.info("=" * 60)
        logger.info("✅ 数据库初始化完成！")
        logger.info("=" * 60)
        
        # 显示表列表
        if Config.DB_TYPE == 'sqlite':
            tables = db.fetch_all(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            )
        else:
            tables = db.fetch_all("SHOW TABLES")
        
        logger.info(f"\n已创建 {len(tables)} 个表:")
        for table in tables:
            table_name = list(table.values())[0]
            logger.info(f"  ✓ {table_name}")
        
        # 检查初始余额
        balance = db.get_latest_balance()
        if balance:
            logger.info(f"\n初始账户余额: {balance['balance']} USDT")
        
        logger.info("\n下一步:")
        logger.info("  1. 配置API Key: 编辑 config/.env")
        logger.info("  2. 测试连接: python src/okx_connector.py")
        logger.info("  3. 启动系统: python src/main.py")
        
    except Exception as e:
        logger.error(f"❌ 初始化失败: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
