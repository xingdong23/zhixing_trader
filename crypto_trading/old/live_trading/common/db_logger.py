import os
import json
import sqlite3
from datetime import datetime
from typing import Any, Dict, Optional


class DBLogger:
    """SQLite 数据记录器：记录交易信号、订单和配置快照"""

    def __init__(self, db_path: str = "logs/trading.sqlite3") -> None:
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.execute("PRAGMA journal_mode=WAL;")
        self.conn.execute("PRAGMA synchronous=NORMAL;")
        self._init_tables()

    def _init_tables(self) -> None:
        cur = self.conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS signals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts TEXT NOT NULL,
                mode TEXT,
                symbol TEXT,
                timeframe TEXT,
                signal TEXT,
                reason TEXT,
                price REAL,
                amount REAL,
                stop_loss REAL,
                take_profit REAL
            );
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts TEXT NOT NULL,
                signal_id INTEGER,
                side TEXT,
                price REAL,
                amount REAL,
                status TEXT,
                order_id TEXT,
                details TEXT
            );
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS config_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts TEXT NOT NULL,
                mode TEXT,
                symbol TEXT,
                timeframe TEXT,
                config_json TEXT,
                env_info_json TEXT
            );
            """
        )
        self.conn.commit()

    def log_signal(
        self,
        *,
        mode: str,
        symbol: str,
        timeframe: str,
        signal: Dict[str, Any],
    ) -> int:
        ts = datetime.utcnow().isoformat()
        price = float(signal.get("price")) if signal.get("price") is not None else None
        amount = float(signal.get("amount")) if signal.get("amount") is not None else None
        stop_loss = float(signal.get("stop_loss")) if signal.get("stop_loss") is not None else None
        take_profit = float(signal.get("take_profit")) if signal.get("take_profit") is not None else None
        reason = str(signal.get("reason")) if signal.get("reason") is not None else None
        sig = str(signal.get("signal"))
        cur = self.conn.cursor()
        cur.execute(
            """
            INSERT INTO signals (ts, mode, symbol, timeframe, signal, reason, price, amount, stop_loss, take_profit)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [ts, mode, symbol, timeframe, sig, reason, price, amount, stop_loss, take_profit],
        )
        self.conn.commit()
        return int(cur.lastrowid)

    def log_order(
        self,
        *,
        signal_id: Optional[int],
        side: str,
        price: Optional[float],
        amount: Optional[float],
        status: str,
        order_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> int:
        ts = datetime.utcnow().isoformat()
        cur = self.conn.cursor()
        cur.execute(
            """
            INSERT INTO orders (ts, signal_id, side, price, amount, status, order_id, details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [ts, signal_id, side, price, amount, status, order_id, json.dumps(details or {})],
        )
        self.conn.commit()
        return int(cur.lastrowid)

    def log_config_snapshot(
        self,
        *,
        mode: str,
        symbol: str,
        timeframe: str,
        config: Dict[str, Any],
        env_info: Dict[str, Any],
    ) -> int:
        ts = datetime.utcnow().isoformat()
        cur = self.conn.cursor()
        cur.execute(
            """
            INSERT INTO config_snapshots (ts, mode, symbol, timeframe, config_json, env_info_json)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [ts, mode, symbol, timeframe, json.dumps(config, ensure_ascii=False), json.dumps(env_info, ensure_ascii=False)],
        )
        self.conn.commit()
        return int(cur.lastrowid)
