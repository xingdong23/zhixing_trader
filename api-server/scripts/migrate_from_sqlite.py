#!/usr/bin/env python3
"""
将旧的SQLite数据导入到当前后端配置的数据库（MySQL）。

默认源库路径: ../data/zhixing_trader.db
环境变量: DATABASE_URL 指向目标库（例如 mysql+pymysql://root:pwd@127.0.0.1:3306/zhixing_trader?charset=utf8mb4）
"""
import argparse
import os
from typing import Dict, Any

from sqlalchemy import create_engine, and_, text
from sqlalchemy.orm import sessionmaker

import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.database import db_service  # 目标库会话工厂已配置为当前后端（MySQL）
from app.models import (
    StockDB, ConceptDB, ConceptStockRelationDB,
    StrategyDB, SelectionResultDB,
    KLineDB, QuoteDB,
)


def row_to_dict(obj) -> Dict[str, Any]:
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}


def migrate_table(src_sess, dst_sess, Model, unique_keys=None, where=None, batch_size: int = 1000):
    q = src_sess.query(Model)
    if where is not None:
        q = q.filter(where)
    total = 0
    for row in q.yield_per(batch_size):
        data = row_to_dict(row)
        try:
            exists = None
            if unique_keys:
                filters = []
                for k in unique_keys:
                    filters.append(getattr(Model, k) == data.get(k))
                exists = dst_sess.query(Model).filter(and_(*filters)).first()
            if exists is None:
                # 插入
                dst_obj = Model(**data)
                dst_sess.add(dst_obj)
            else:
                # 简单更新关键字段（可按需扩展）
                for k, v in data.items():
                    if hasattr(exists, k):
                        setattr(exists, k, v)
            total += 1
            if total % batch_size == 0:
                dst_sess.commit()
        except Exception as e:
            dst_sess.rollback()
            print(f"[WARN] migrate {Model.__tablename__} row failed: {e}")
    dst_sess.commit()
    return total


def table_exists(engine, table_name: str) -> bool:
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name=:t"), {"t": table_name}).fetchone()
            return result is not None
    except Exception:
        return False


def get_table_columns(engine, table_name: str):
    cols = []
    try:
        with engine.connect() as conn:
            r = conn.execute(text(f"PRAGMA table_info('{table_name}')"))
            cols = [row[1] for row in r.fetchall()]
    except Exception:
        pass
    return cols


def migrate_strategies_compat(src_engine, src_sess, dst_sess) -> int:
    """兼容旧结构的策略迁移：当源表缺少 impl_type/configuration 等字段时，填充默认值。"""
    tbl = "strategies"
    if not table_exists(src_engine, tbl):
        print("⚠️ 源库不存在 strategies 表，跳过")
        return 0

    cols = get_table_columns(src_engine, tbl)
    # 兼容选择列
    base_cols = [c for c in ["id", "name", "description", "category", "timeframe", "enabled", "is_system_default", "execution_count", "last_execution_time", "created_at", "updated_at"] if c in cols]
    sel = ", ".join(base_cols) if base_cols else "id, name"
    rows = src_sess.execute(text(f"SELECT {sel} FROM {tbl}")).mappings().fetchall()

    total = 0
    for row in rows:
        data = dict(row)
        # 默认补齐
        if "impl_type" not in cols:
            data["impl_type"] = "ema55_pullback"
        if "configuration" not in cols:
            data["configuration"] = "{}"
        # 缺省字段补空
        for k in ["description", "category", "timeframe"]:
            data.setdefault(k, "")
        data.setdefault("enabled", True)
        data.setdefault("is_system_default", False)
        data.setdefault("execution_count", 0)

        # upsert by id
        try:
            exists = dst_sess.query(StrategyDB).filter(StrategyDB.id == data.get("id")).first()
            if exists is None:
                dst_obj = StrategyDB(**data)
                dst_sess.add(dst_obj)
            else:
                for k, v in data.items():
                    if hasattr(exists, k):
                        setattr(exists, k, v)
            total += 1
            if total % 500 == 0:
                dst_sess.commit()
        except Exception as e:
            dst_sess.rollback()
            print(f"[WARN] migrate strategies row failed: {e}")

    dst_sess.commit()
    return total


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", default=os.path.join(os.path.dirname(os.path.dirname(__file__)), "../data/zhixing_trader.db"), help="源SQLite数据库路径")
    parser.add_argument("--include-klines", action="store_true", help="是否迁移K线和行情数据（体量较大，默认不迁移）")
    args = parser.parse_args()

    src_path = os.path.abspath(args.src)
    if not os.path.exists(src_path):
        print(f"❌ 源数据库不存在: {src_path}")
        sys.exit(1)

    print(f"🔗 源库: sqlite:///{src_path}")
    print(f"🔗 目标库: {os.getenv('DATABASE_URL', '未设置，使用后端默认')}")

    src_engine = create_engine(f"sqlite:///{src_path}")
    SrcSession = sessionmaker(bind=src_engine)
    src_sess = SrcSession()

    dst_sess = db_service.get_session()

    try:
        # 概念
        cnt_concepts = migrate_table(src_sess, dst_sess, ConceptDB, unique_keys=["concept_id"])
        print(f"✅ concepts 导入/更新: {cnt_concepts}")

        # 股票
        cnt_stocks = migrate_table(src_sess, dst_sess, StockDB, unique_keys=["code"])
        print(f"✅ stocks 导入/更新: {cnt_stocks}")

        # 概念-股票 关联
        cnt_rel = migrate_table(src_sess, dst_sess, ConceptStockRelationDB, unique_keys=["concept_id", "stock_code"])
        print(f"✅ concept_stock_relations 导入/更新: {cnt_rel}")

        # 策略（兼容旧结构）
        cnt_strategies = migrate_strategies_compat(src_engine, src_sess, dst_sess)
        print(f"✅ strategies 导入/更新: {cnt_strategies}")

        # 选股结果（可选，体量一般不大）
        cnt_sel = migrate_table(src_sess, dst_sess, SelectionResultDB, unique_keys=["id"])  # 按ID覆盖
        print(f"✅ selection_results 导入/更新: {cnt_sel}")

        if args.include_klines:
            # 行情和K线体量较大，建议只在需要时迁移
            cnt_quotes = migrate_table(src_sess, dst_sess, QuoteDB, unique_keys=["id"])  # 以ID为主，或可用 (code, created_at)
            print(f"✅ quotes 导入/更新: {cnt_quotes}")
            # K线可按唯一键 (code, period, time_key)
            cnt_kl = migrate_table(src_sess, dst_sess, KLineDB, unique_keys=["code", "period", "time_key"])
            print(f"✅ klines 导入/更新: {cnt_kl}")

        print("🎉 数据迁移完成")
    finally:
        src_sess.close()
        dst_sess.close()


if __name__ == "__main__":
    main()


