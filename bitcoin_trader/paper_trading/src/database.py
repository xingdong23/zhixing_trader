"""
数据库管理模块
"""
import sqlite3
import mysql.connector
from datetime import datetime
from typing import Dict, List, Optional, Any
from config import Config
import logging

logger = logging.getLogger(__name__)


class Database:
    """数据库管理类"""
    
    def __init__(self):
        self.db_type = Config.DB_TYPE
        self.conn = None
        self.connect()
    
    def connect(self):
        """连接数据库"""
        try:
            if self.db_type == 'sqlite':
                self.conn = sqlite3.connect(
                    Config.SQLITE_DB_PATH,
                    check_same_thread=False
                )
                self.conn.row_factory = sqlite3.Row
                logger.info(f"✅ 连接SQLite数据库: {Config.SQLITE_DB_PATH}")
            
            elif self.db_type == 'mysql':
                self.conn = mysql.connector.connect(
                    host=Config.DB_HOST,
                    port=Config.DB_PORT,
                    user=Config.DB_USER,
                    password=Config.DB_PASSWORD,
                    database=Config.DB_NAME
                )
                logger.info(f"✅ 连接MySQL数据库: {Config.DB_HOST}:{Config.DB_PORT}/{Config.DB_NAME}")
            
            else:
                raise ValueError(f"不支持的数据库类型: {self.db_type}")
            
            self._create_tables()
            
        except Exception as e:
            logger.error(f"❌ 数据库连接失败: {e}")
            raise
    
    def _create_tables(self):
        """创建表（如果不存在）"""
        sql_file = Config.STRATEGY_CONFIG.replace('config_multiframe.json', '../../paper_trading/sql/create_tables.sql')
        
        # 读取SQL文件
        try:
            with open(sql_file, 'r', encoding='utf-8') as f:
                sql_script = f.read()
            
            # 执行SQL
            cursor = self.conn.cursor()
            
            if self.db_type == 'sqlite':
                # SQLite需要逐条执行
                for statement in sql_script.split(';'):
                    statement = statement.strip()
                    if statement:
                        # 移除MySQL特有语法
                        statement = statement.replace('ENGINE=InnoDB', '')
                        statement = statement.replace('DEFAULT CHARSET=utf8mb4', '')
                        statement = statement.replace('COMMENT=', '--')
                        statement = statement.replace("COMMENT '", "-- '")
                        cursor.execute(statement)
            else:
                cursor.execute(sql_script)
            
            self.conn.commit()
            cursor.close()
            logger.info("✅ 数据表创建成功")
            
        except FileNotFoundError:
            logger.warning("⚠️ 未找到SQL文件，跳过表创建")
        except Exception as e:
            logger.error(f"❌ 创建表失败: {e}")
    
    def execute(self, sql: str, params: tuple = None) -> Any:
        """执行SQL"""
        cursor = self.conn.cursor()
        try:
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            self.conn.commit()
            return cursor
        except Exception as e:
            self.conn.rollback()
            logger.error(f"❌ SQL执行失败: {e}\nSQL: {sql}")
            raise
        finally:
            cursor.close()
    
    def fetch_one(self, sql: str, params: tuple = None) -> Optional[Dict]:
        """查询单条记录"""
        cursor = self.conn.cursor()
        try:
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            row = cursor.fetchone()
            if row:
                if self.db_type == 'sqlite':
                    return dict(row)
                else:
                    columns = [desc[0] for desc in cursor.description]
                    return dict(zip(columns, row))
            return None
        finally:
            cursor.close()
    
    def fetch_all(self, sql: str, params: tuple = None) -> List[Dict]:
        """查询多条记录"""
        cursor = self.conn.cursor()
        try:
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            rows = cursor.fetchall()
            
            if self.db_type == 'sqlite':
                return [dict(row) for row in rows]
            else:
                columns = [desc[0] for desc in cursor.description]
                return [dict(zip(columns, row)) for row in rows]
        finally:
            cursor.close()
    
    # ============================================================
    # 交易信号相关
    # ============================================================
    
    def save_signal(self, signal: Dict) -> int:
        """保存交易信号"""
        sql = """
        INSERT INTO trading_signals 
        (timestamp, symbol, signal_type, side, price, amount, reason, 
         daily_trend, ema_fast, ema_medium, ema_slow, executed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """ if self.db_type == 'sqlite' else """
        INSERT INTO trading_signals 
        (timestamp, symbol, signal_type, side, price, amount, reason, 
         daily_trend, ema_fast, ema_medium, ema_slow, executed)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        cursor = self.execute(sql, (
            signal.get('timestamp', datetime.now()),
            signal['symbol'],
            signal['signal_type'],
            signal.get('side'),
            signal['price'],
            signal.get('amount'),
            signal.get('reason'),
            signal.get('daily_trend'),
            signal.get('ema_fast'),
            signal.get('ema_medium'),
            signal.get('ema_slow'),
            signal.get('executed', False)
        ))
        
        return cursor.lastrowid
    
    def update_signal_executed(self, signal_id: int):
        """标记信号已执行"""
        sql = "UPDATE trading_signals SET executed = ? WHERE id = ?" if self.db_type == 'sqlite' \
              else "UPDATE trading_signals SET executed = %s WHERE id = %s"
        self.execute(sql, (True, signal_id))
    
    # ============================================================
    # 订单相关
    # ============================================================
    
    def save_order(self, order: Dict) -> int:
        """保存订单"""
        sql = """
        INSERT INTO orders 
        (order_id, signal_id, symbol, side, type, entry_price, amount, 
         stop_loss, take_profit, status, entry_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """ if self.db_type == 'sqlite' else """
        INSERT INTO orders 
        (order_id, signal_id, symbol, side, type, entry_price, amount, 
         stop_loss, take_profit, status, entry_time)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        cursor = self.execute(sql, (
            order['order_id'],
            order.get('signal_id'),
            order['symbol'],
            order['side'],
            order['type'],
            order['entry_price'],
            order['amount'],
            order.get('stop_loss'),
            order.get('take_profit'),
            order['status'],
            order['entry_time']
        ))
        
        return cursor.lastrowid
    
    def update_order_close(self, order_id: str, exit_price: float, 
                          pnl_amount: float, pnl_percent: float,
                          fees: float, exit_reason: str):
        """更新订单为已平仓"""
        sql = """
        UPDATE orders 
        SET exit_price = ?, pnl_amount = ?, pnl_percent = ?, 
            fees = ?, status = 'CLOSED', exit_time = ?, exit_reason = ?
        WHERE order_id = ?
        """ if self.db_type == 'sqlite' else """
        UPDATE orders 
        SET exit_price = %s, pnl_amount = %s, pnl_percent = %s, 
            fees = %s, status = 'CLOSED', exit_time = %s, exit_reason = %s
        WHERE order_id = %s
        """
        
        self.execute(sql, (
            exit_price, pnl_amount, pnl_percent, fees,
            datetime.now(), exit_reason, order_id
        ))
    
    def get_open_order(self, symbol: str) -> Optional[Dict]:
        """获取开仓订单"""
        sql = """
        SELECT * FROM orders 
        WHERE symbol = ? AND status = 'OPEN'
        ORDER BY entry_time DESC LIMIT 1
        """ if self.db_type == 'sqlite' else """
        SELECT * FROM orders 
        WHERE symbol = %s AND status = 'OPEN'
        ORDER BY entry_time DESC LIMIT 1
        """
        
        return self.fetch_one(sql, (symbol,))
    
    # ============================================================
    # 持仓相关
    # ============================================================
    
    def save_position(self, position: Dict):
        """保存持仓"""
        sql = """
        INSERT OR REPLACE INTO positions 
        (symbol, order_id, side, entry_price, amount, stop_loss, take_profit,
         current_price, unrealized_pnl, unrealized_pnl_percent, highest_price, entry_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """ if self.db_type == 'sqlite' else """
        INSERT INTO positions 
        (symbol, order_id, side, entry_price, amount, stop_loss, take_profit,
         current_price, unrealized_pnl, unrealized_pnl_percent, highest_price, entry_time)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
        current_price = VALUES(current_price),
        unrealized_pnl = VALUES(unrealized_pnl),
        unrealized_pnl_percent = VALUES(unrealized_pnl_percent),
        highest_price = VALUES(highest_price)
        """
        
        self.execute(sql, (
            position['symbol'],
            position['order_id'],
            position['side'],
            position['entry_price'],
            position['amount'],
            position.get('stop_loss'),
            position.get('take_profit'),
            position.get('current_price'),
            position.get('unrealized_pnl'),
            position.get('unrealized_pnl_percent'),
            position.get('highest_price'),
            position['entry_time']
        ))
    
    def delete_position(self, symbol: str):
        """删除持仓"""
        sql = "DELETE FROM positions WHERE symbol = ?" if self.db_type == 'sqlite' \
              else "DELETE FROM positions WHERE symbol = %s"
        self.execute(sql, (symbol,))
    
    def get_position(self, symbol: str) -> Optional[Dict]:
        """获取持仓"""
        sql = "SELECT * FROM positions WHERE symbol = ?" if self.db_type == 'sqlite' \
              else "SELECT * FROM positions WHERE symbol = %s"
        return self.fetch_one(sql, (symbol,))
    
    # ============================================================
    # 账户余额相关
    # ============================================================
    
    def save_balance(self, balance: Dict):
        """保存账户余额"""
        sql = """
        INSERT INTO account_balance 
        (balance, available_balance, margin_used, unrealized_pnl, 
         total_equity, total_pnl, total_pnl_percent, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """ if self.db_type == 'sqlite' else """
        INSERT INTO account_balance 
        (balance, available_balance, margin_used, unrealized_pnl, 
         total_equity, total_pnl, total_pnl_percent, timestamp)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        self.execute(sql, (
            balance['balance'],
            balance['available_balance'],
            balance.get('margin_used', 0),
            balance.get('unrealized_pnl', 0),
            balance['total_equity'],
            balance.get('total_pnl', 0),
            balance.get('total_pnl_percent', 0),
            balance.get('timestamp', datetime.now())
        ))
    
    def get_latest_balance(self) -> Optional[Dict]:
        """获取最新余额"""
        sql = """
        SELECT * FROM account_balance 
        ORDER BY timestamp DESC LIMIT 1
        """
        return self.fetch_one(sql)
    
    def close(self):
        """关闭数据库连接"""
        if self.conn:
            self.conn.close()
            logger.info("✅ 数据库连接已关闭")


# 单例模式
_db_instance = None

def get_db() -> Database:
    """获取数据库实例"""
    global _db_instance
    if _db_instance is None:
        _db_instance = Database()
    return _db_instance
