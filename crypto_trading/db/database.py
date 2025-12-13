"""
V15 MySQL 数据库模块

管理实例配置和交易记录的持久化
"""
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, asdict
import pymysql
from pymysql.cursors import DictCursor

logger = logging.getLogger(__name__)


@dataclass
class TradeRecord:
    """交易记录"""
    id: int = 0
    instance_id: str = ""
    side: str = ""  # long/short
    entry_price: float = 0
    exit_price: float = 0
    pnl_pct: float = 0
    pnl_amount: float = 0
    reason: str = ""  # stop_loss/trailing_stop
    created_at: str = ""


class Database:
    """MySQL 数据库管理"""
    
    def __init__(
        self,
        host: str = "localhost",
        port: int = 3306,
        user: str = "root",
        password: str = "Cz159csa",
        database: str = "crypto_v15"
    ):
        self.config = {
            "host": host,
            "port": port,
            "user": user,
            "password": password,
            "database": database,
            "charset": "utf8mb4",
            "cursorclass": DictCursor
        }
        self._init_tables()
    
    def _get_connection(self):
        """获取数据库连接"""
        return pymysql.connect(**self.config)
    
    def _init_tables(self):
        """初始化数据表"""
        create_instances = """
        CREATE TABLE IF NOT EXISTS v15_instances (
            id VARCHAR(32) PRIMARY KEY,
            symbol VARCHAR(50) NOT NULL,
            capital DECIMAL(18,2) NOT NULL,
            dry_run TINYINT DEFAULT 1,
            status VARCHAR(20) DEFAULT 'stopped',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
        
        create_trades = """
        CREATE TABLE IF NOT EXISTS v15_trades (
            id INT AUTO_INCREMENT PRIMARY KEY,
            instance_id VARCHAR(32) NOT NULL,
            side VARCHAR(10) NOT NULL,
            entry_price DECIMAL(18,8) NOT NULL,
            exit_price DECIMAL(18,8) NOT NULL,
            pnl_pct DECIMAL(10,4) NOT NULL,
            pnl_amount DECIMAL(18,2) NOT NULL,
            reason VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_instance (instance_id)
        )
        """
        
        try:
            conn = self._get_connection()
            with conn.cursor() as cursor:
                cursor.execute(create_instances)
                cursor.execute(create_trades)
            conn.commit()
            conn.close()
            logger.info("数据库表初始化完成")
        except Exception as e:
            logger.error(f"初始化数据表失败: {e}")
    
    # ==================== 实例管理 ====================
    
    def save_instance(self, instance_id: str, symbol: str, capital: float, dry_run: bool = True):
        """保存实例"""
        sql = """
        INSERT INTO v15_instances (id, symbol, capital, dry_run)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE symbol=%s, capital=%s, dry_run=%s
        """
        try:
            conn = self._get_connection()
            with conn.cursor() as cursor:
                cursor.execute(sql, (instance_id, symbol, capital, dry_run, symbol, capital, dry_run))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"保存实例失败: {e}")
    
    def delete_instance(self, instance_id: str):
        """删除实例"""
        try:
            conn = self._get_connection()
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM v15_instances WHERE id=%s", (instance_id,))
                cursor.execute("DELETE FROM v15_trades WHERE instance_id=%s", (instance_id,))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"删除实例失败: {e}")
    
    def get_all_instances(self) -> List[Dict]:
        """获取所有实例"""
        try:
            conn = self._get_connection()
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM v15_instances ORDER BY created_at DESC")
                result = cursor.fetchall()
            conn.close()
            return result
        except Exception as e:
            logger.error(f"获取实例失败: {e}")
            return []
    
    def update_instance_status(self, instance_id: str, status: str):
        """更新实例状态 (stopped/running/error)"""
        try:
            conn = self._get_connection()
            with conn.cursor() as cursor:
                cursor.execute("UPDATE v15_instances SET status=%s WHERE id=%s", (status, instance_id))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"更新实例状态失败: {e}")
    
    # ==================== 交易记录 ====================
    
    def save_trade(self, trade: TradeRecord):
        """保存交易记录"""
        sql = """
        INSERT INTO v15_trades (instance_id, side, entry_price, exit_price, pnl_pct, pnl_amount, reason)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        try:
            conn = self._get_connection()
            with conn.cursor() as cursor:
                cursor.execute(sql, (
                    trade.instance_id, trade.side, trade.entry_price,
                    trade.exit_price, trade.pnl_pct, trade.pnl_amount, trade.reason
                ))
            conn.commit()
            conn.close()
            logger.info(f"保存交易记录: {trade.instance_id} {trade.side} {trade.pnl_pct:.2%}")
        except Exception as e:
            logger.error(f"保存交易记录失败: {e}")
    
    def get_trades(self, instance_id: str, limit: int = 50) -> List[Dict]:
        """获取实例的交易记录"""
        try:
            conn = self._get_connection()
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT * FROM v15_trades WHERE instance_id=%s ORDER BY created_at DESC LIMIT %s",
                    (instance_id, limit)
                )
                result = cursor.fetchall()
            conn.close()
            return result
        except Exception as e:
            logger.error(f"获取交易记录失败: {e}")
            return []
    
    def get_trade_stats(self, instance_id: str) -> Dict:
        """获取交易统计"""
        try:
            conn = self._get_connection()
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        COUNT(*) as total_trades,
                        SUM(CASE WHEN pnl_pct > 0 THEN 1 ELSE 0 END) as wins,
                        SUM(pnl_amount) as total_pnl
                    FROM v15_trades WHERE instance_id=%s
                """, (instance_id,))
                result = cursor.fetchone()
            conn.close()
            return result or {"total_trades": 0, "wins": 0, "total_pnl": 0}
        except Exception as e:
            logger.error(f"获取交易统计失败: {e}")
            return {"total_trades": 0, "wins": 0, "total_pnl": 0}


# 全局数据库实例
db = Database()
