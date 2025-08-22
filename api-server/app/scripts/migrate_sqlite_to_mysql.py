#!/usr/bin/env python3
"""
SQLite -> MySQL 全量迁移脚本（基于 SQLAlchemy 模型）

功能：
- 从指定 SQLite 文件读取全部业务表数据
- 自动在 MySQL 上创建数据库（若不存在）和全部表结构
- 按批次高效导入（大表如 klines 使用 bulk_insert_mappings）

使用示例：
python3 api-server/app/scripts/migrate_sqlite_to_mysql.py \
  --sqlite /Users/xxx/zhixing_trader/api-server/data/zhixing_trader.db \
  --mysql  "mysql+pymysql://root:Cz159csa@127.0.0.1:3306/zhixing_trader?charset=utf8mb4"
"""

from __future__ import annotations

import argparse
import sys
from typing import Iterable, List, Type

from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import sessionmaker

sys.path.append("../../")  # 允许从 app 导入

from app.models import (  # noqa: E402
    Base,
    StockDB,
    QuoteDB,
    KLineDB,
    StrategyDB,
    SelectionResultDB,
    ConceptDB,
    ConceptStockRelationDB,
    ExpertDB,
    ExpertOpinionDB,
    TradingPlaybookDB,
    SelectionStrategyDB,
    TradingPlanDB,
    TradeRecordDB,
    PositionDB,
    EmotionRecordDB,
    TradingDisciplineDB,
    TradingReviewDB,
)


def ensure_mysql_database(mysql_url: str) -> None:
    url = make_url(mysql_url)
    db_name = url.database
    server_url = url.set(database=None)
    server_engine = create_engine(server_url)
    with server_engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(
            text(
                f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        )


def chunks(iterable: Iterable, size: int) -> Iterable[List]:
    batch = []
    for item in iterable:
        batch.append(item)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


def rows_to_mappings(model_cls: Type, rows: List) -> List[dict]:
    column_names = [c.name for c in model_cls.__table__.columns]
    mappings = []
    for r in rows:
        m = {}
        for col in column_names:
            m[col] = getattr(r, col)
        mappings.append(m)
    return mappings


def migrate_table(source_session, target_session, model_cls: Type, batch_size: int = 5000) -> int:
    total = 0
    print(f"➡️  迁移表 {model_cls.__tablename__} ...")
    query = source_session.query(model_cls).yield_per(2000)
    for batch in chunks(query, batch_size):
        mappings = rows_to_mappings(model_cls, batch)
        if not mappings:
            continue
        # 使用 bulk_insert_mappings 以保留主键并提升性能
        target_session.bulk_insert_mappings(model_cls, mappings)
        target_session.commit()
        total += len(mappings)
        if total % (batch_size * 2) == 0:
            print(f"   ... 已导入 {total} 行 -> {model_cls.__tablename__}")
    print(f"✅ 表 {model_cls.__tablename__} 导入完成，共 {total} 行")
    return total


def main():
    parser = argparse.ArgumentParser(description="Migrate SQLite data to MySQL")
    parser.add_argument("--sqlite", required=True, help="SQLite 文件绝对路径，例如 /abs/path/zhixing_trader.db")
    parser.add_argument(
        "--mysql",
        required=True,
        help="MySQL 连接串，例如 mysql+pymysql://root:pwd@127.0.0.1:3306/zhixing_trader?charset=utf8mb4",
    )
    args = parser.parse_args()

    sqlite_url = f"sqlite:////{args.sqlite.lstrip('/')}"
    mysql_url = args.mysql

    print("🎯 开始迁移：")
    print(f"   源(SQLite): {sqlite_url}")
    print(f"   目标(MySQL): {mysql_url}")

    # 1) 确保 MySQL 数据库存在
    ensure_mysql_database(mysql_url)

    # 2) 创建引擎与会话
    source_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    target_engine = create_engine(mysql_url, pool_pre_ping=True, pool_recycle=3600)

    SourceSession = sessionmaker(bind=source_engine)
    TargetSession = sessionmaker(bind=target_engine)

    # 3) 在目标库创建表结构
    Base.metadata.create_all(bind=target_engine)

    # 4) 迁移表（按可能的依赖顺序，虽然当前未定义外键约束）
    table_order: List[Type] = [
        StockDB,
        ConceptDB,
        ConceptStockRelationDB,
        StrategyDB,
        SelectionStrategyDB,
        TradingPlaybookDB,
        QuoteDB,
        KLineDB,
        SelectionResultDB,
        TradingPlanDB,
        TradeRecordDB,
        PositionDB,
        EmotionRecordDB,
        TradingDisciplineDB,
        ExpertDB,
        ExpertOpinionDB,
        TradingReviewDB,
    ]

    with SourceSession() as s_sess, TargetSession() as t_sess:
        grand_total = 0
        for model in table_order:
            grand_total += migrate_table(s_sess, t_sess, model)
        print(f"🎉 全部迁移完成，总计 {grand_total} 行")


if __name__ == "__main__":
    main()




