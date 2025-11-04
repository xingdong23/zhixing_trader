import json
from datetime import datetime
from typing import Any, Dict, Optional

import pymysql


class MySQLLogger:
    """MySQL 数据记录器：记录交易信号、订单和配置快照

    保持与 SQLite DBLogger 相同的接口: log_signal, log_order, log_config_snapshot
    """

    def __init__(
        self,
        *,
        host: str = "127.0.0.1",
        port: int = 3306,
        user: str = "root",
        password: str = "",
        database: str = "trading",
        charset: str = "utf8mb4",
        autocommit: bool = True,
        create_db_if_missing: bool = True,
    ) -> None:
        self._conn = None
        self._params = dict(host=host, port=port, user=user, password=password, database=database, charset=charset, autocommit=autocommit)

        # 先连接到服务器，不指定库，必要时创建库
        if create_db_if_missing:
            tmp_conn = pymysql.connect(host=host, port=port, user=user, password=password, charset=charset, autocommit=True)
            with tmp_conn.cursor() as cur:
                cur.execute(f"CREATE DATABASE IF NOT EXISTS `{database}` CHARACTER SET {charset}")
            tmp_conn.close()

        # 连接目标库
        self._conn = pymysql.connect(**self._params)
        self._init_tables()

    def _init_tables(self) -> None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS `signals` (
                  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
                  `ts` DATETIME NOT NULL,
                  `mode` VARCHAR(16),
                  `symbol` VARCHAR(32),
                  `timeframe` VARCHAR(16),
                  `signal` VARCHAR(16),
                  `reason` TEXT,
                  `price` DOUBLE,
                  `amount` DOUBLE,
                  `stop_loss` DOUBLE,
                  `take_profit` DOUBLE,
                  INDEX idx_ts(`ts`),
                  INDEX idx_symbol_tf(`symbol`, `timeframe`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS `orders` (
                  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
                  `ts` DATETIME NOT NULL,
                  `signal_id` BIGINT,
                  `side` VARCHAR(16),
                  `price` DOUBLE,
                  `amount` DOUBLE,
                  `status` VARCHAR(32),
                  `order_id` VARCHAR(64),
                  `details` JSON,
                  INDEX idx_ts(`ts`),
                  INDEX idx_signal(`signal_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS `config_snapshots` (
                  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
                  `ts` DATETIME NOT NULL,
                  `mode` VARCHAR(16),
                  `symbol` VARCHAR(32),
                  `timeframe` VARCHAR(16),
                  `config_json` JSON,
                  `env_info_json` JSON,
                  INDEX idx_ts(`ts`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """
            )
        self._conn.commit()

    def log_signal(
        self,
        *,
        mode: str,
        symbol: str,
        timeframe: str,
        signal: Dict[str, Any],
    ) -> int:
        ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        price = float(signal.get("price")) if signal.get("price") is not None else None
        amount = float(signal.get("amount")) if signal.get("amount") is not None else None
        stop_loss = float(signal.get("stop_loss")) if signal.get("stop_loss") is not None else None
        take_profit = float(signal.get("take_profit")) if signal.get("take_profit") is not None else None
        reason = str(signal.get("reason")) if signal.get("reason") is not None else None
        sig = str(signal.get("signal")) if signal.get("signal") is not None else None
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO `signals`(ts, mode, symbol, timeframe, signal, reason, price, amount, stop_loss, take_profit)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (ts, mode, symbol, timeframe, sig, reason, price, amount, stop_loss, take_profit),
            )
            self._conn.commit()
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
        ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        details_json = json.dumps(details or {}, ensure_ascii=False)
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO `orders`(ts, signal_id, side, price, amount, status, order_id, details)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (ts, signal_id, side, price, amount, status, order_id, details_json),
            )
            self._conn.commit()
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
        ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO `config_snapshots`(ts, mode, symbol, timeframe, config_json, env_info_json)
                VALUES(%s,%s,%s,%s,CAST(%s AS JSON),CAST(%s AS JSON))
                """,
                (ts, mode, symbol, timeframe, json.dumps(config, ensure_ascii=False), json.dumps(env_info, ensure_ascii=False)),
            )
            self._conn.commit()
            return int(cur.lastrowid)
