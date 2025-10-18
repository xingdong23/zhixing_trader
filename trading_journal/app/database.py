"""
数据库服务模块
"""
import os
from typing import List, Optional
from sqlalchemy import create_engine, and_
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
from loguru import logger

from .config import settings
from .models import (
    Base, StockDB, StrategyDB, SelectionResultDB,
    ExpertDB, ExpertOpinionDB,
    TradingPlaybookDB, SelectionStrategyDB, StockInfo,
    TradingPlanDB, TradeRecordDB, PositionDB, EmotionRecordDB, 
    TradingDisciplineDB, TradingReviewDB, DataSyncTaskDB, StockSyncStatusDB
)


class DatabaseService:
    """数据库服务类"""
    
    def __init__(self):
        self.engine = None
        self.SessionLocal = None
        self.init_database()
    
    def init_database(self):
        """初始化数据库 - 强制使用MySQL，杜绝SQLite"""
        try:
            # 验证数据库URL，确保不是SQLite（除非显式允许用于开发）
            if settings.database_url.startswith("sqlite") and not getattr(settings, "allow_sqlite_dev", False):
                raise ValueError("❌ 禁止使用SQLite数据库！系统强制要求使用MySQL以避免内存问题。若需本地快速体验，请设置环境变量 ALLOW_SQLITE_DEV=true 并使用 sqlite:///./dev.db")
            
            # 确保使用MySQL数据库（如果不是SQLite dev 模式）
            if (not settings.database_url.startswith("mysql")) and (not settings.database_url.startswith("sqlite")):
                raise ValueError(f"❌ 不支持的数据库类型: {settings.database_url}。系统只支持MySQL（或开发模式下SQLite）。")
            
            # 如果使用MySQL，确保数据库存在
            if settings.database_url.startswith("mysql"):
                try:
                    from sqlalchemy.engine.url import make_url
                    from sqlalchemy import text
                    url = make_url(settings.database_url)
                    db_name = url.database
                    server_url = url.set(database=None)
                    server_engine = create_engine(server_url)
                    with server_engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
                        conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
                    logger.info(f"✅ MySQL数据库 '{db_name}' 已确保存在")
                except Exception as e:
                    logger.error(f"❌ 创建MySQL数据库失败: {e}")
                    raise

            # 创建数据库引擎
            engine_kwargs = {
                "pool_pre_ping": True,
                "pool_recycle": 3600,
                "echo": False,
            }
            # SQLite 不支持某些pool参数，简化处理
            if settings.database_url.startswith("sqlite"):
                engine_kwargs = {"echo": False}
            self.engine = create_engine(settings.database_url, **engine_kwargs)
            
            # 创建会话工厂
            self.SessionLocal = sessionmaker(
                autocommit=False, 
                autoflush=False, 
                bind=self.engine
            )
            
            # 创建所有表
            Base.metadata.create_all(bind=self.engine)
            
            logger.info(f"Database initialized: {settings.database_url}")
            
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
    
    def get_session(self) -> Session:
        """获取数据库会话"""
        return self.SessionLocal()

    def create_tables(self):
        """创建所有数据库表"""
        try:
            Base.metadata.create_all(bind=self.engine)
            logger.info("All database tables created successfully")
        except Exception as e:
            logger.error(f"Failed to create database tables: {e}")
            raise
    
    # ==================== 股票信息操作 ====================
    
    def add_stock(self, stock_data: dict) -> Optional[int]:
        """添加股票"""
        try:
            with self.get_session() as session:
                # 检查是否已存在
                existing = session.query(StockDB).filter(
                    StockDB.code == stock_data.get('code')
                ).first()

                if existing:
                    logger.warning(f"Stock {stock_data.get('code')} already exists")
                    return existing.id

                # 创建新股票记录 (移除了 group_id/group_name，使用分类系统代替)
                stock = StockDB(
                    code=stock_data.get('code'),
                    name=stock_data.get('name'),
                    market=stock_data.get('market', 'US'),
                    lot_size=stock_data.get('lot_size', 100),
                    sec_type=stock_data.get('sec_type', 'STOCK'),
                    market_cap=stock_data.get('market_cap'),
                    watch_level=stock_data.get('watch_level'),
                    notes=stock_data.get('notes')
                )

                session.add(stock)
                session.commit()
                session.refresh(stock)

                logger.info(f"Added stock: {stock.code} - {stock.name}")
                return stock.id

        except SQLAlchemyError as e:
            logger.error(f"Failed to add stock: {e}")
            return None

    def upsert_stock(self, stock_info: StockInfo) -> bool:
        """插入或更新股票信息 (移除了group参数，使用分类系统代替)"""
        try:
            with self.get_session() as session:
                # 查找现有记录
                existing = session.query(StockDB).filter(StockDB.code == stock_info.code).first()

                if existing:
                    # 更新现有记录
                    existing.name = stock_info.name
                    existing.market = stock_info.market
                    existing.lot_size = stock_info.lot_size
                    existing.sec_type = stock_info.sec_type
                    existing.is_active = True
                else:
                    # 创建新记录
                    new_stock = StockDB(
                        code=stock_info.code,
                        name=stock_info.name,
                        market=stock_info.market,
                        lot_size=stock_info.lot_size,
                        sec_type=stock_info.sec_type,
                        is_active=True
                    )
                    session.add(new_stock)

                session.commit()
                return True

        except SQLAlchemyError as e:
            logger.error(f"Failed to upsert stock {stock_info.code}: {e}")
            return False
    
    def upsert_stocks_batch(self, stocks_data: List[StockInfo]) -> bool:
        """批量插入或更新股票信息 (移除了group参数，使用分类系统代替)"""
        try:
            with self.get_session() as session:
                for stock_info in stocks_data:
                    # 查找现有记录
                    existing = session.query(StockDB).filter(StockDB.code == stock_info.code).first()
                    
                    if existing:
                        # 更新现有记录
                        existing.name = stock_info.name
                        existing.market = stock_info.market
                        existing.lot_size = stock_info.lot_size
                        existing.sec_type = stock_info.sec_type
                        existing.is_active = True
                    else:
                        # 创建新记录
                        new_stock = StockDB(
                            code=stock_info.code,
                            name=stock_info.name,
                            market=stock_info.market,
                            lot_size=stock_info.lot_size,
                            sec_type=stock_info.sec_type,
                            is_active=True
                        )
                        session.add(new_stock)
                
                session.commit()
                logger.info(f"Batch upserted {len(stocks_data)} stocks")
                return True
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to batch upsert stocks: {e}")
            return False
    
    def get_all_stocks(self) -> List[StockDB]:
        """获取所有活跃股票"""
        try:
            with self.get_session() as session:
                return session.query(StockDB).filter(StockDB.is_active == True).all()
        except SQLAlchemyError as e:
            logger.error(f"Failed to get all stocks: {e}")
            return []
    
    
    def get_stock_by_code(self, code: str) -> Optional[StockDB]:
        """根据代码获取股票"""
        try:
            with self.get_session() as session:
                return session.query(StockDB).filter(
                    and_(StockDB.code == code, StockDB.is_active == True)
                ).first()
        except SQLAlchemyError as e:
            logger.error(f"Failed to get stock {code}: {e}")
            return None
    
    # ==================== 行情数据操作 ====================
    # 注意: quotes表已被移除，行情数据统一从K线表获取
    
    # ==================== 统计信息 ====================
    
    def get_stats(self) -> dict:
        """获取数据库统计信息"""
        try:
            from .models import KLineDailyDB
            with self.get_session() as session:
                stats = {
                    "stocks": session.query(StockDB).filter(StockDB.is_active == True).count(),
                    "klines_daily": session.query(KLineDailyDB).count(),
                    "strategies": session.query(StrategyDB).count(),
                }
                return stats
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to get database stats: {e}")
            return {"stocks": 0, "klines_daily": 0, "strategies": 0}

    # ==================== K线数据操作 ====================
    # 注意: 旧的KLineDB已被多个周期表代替，请使用 KLineRepository 处理K线数据
    
    # ==================== 策略相关方法 ====================

    def create_strategy(self, strategy_data: dict) -> Optional[int]:
        """创建新策略"""
        try:
            with self.get_session() as session:
                strategy = StrategyDB(**strategy_data)
                session.add(strategy)
                session.commit()
                session.refresh(strategy)
                logger.info(f"Created strategy: {strategy.name}")
                return strategy.id

        except SQLAlchemyError as e:
            logger.error(f"Failed to create strategy: {e}")
            return None

    def get_strategy(self, strategy_id: int) -> Optional[StrategyDB]:
        """获取策略"""
        try:
            with self.get_session() as session:
                return session.query(StrategyDB).filter(StrategyDB.id == strategy_id).first()

        except SQLAlchemyError as e:
            logger.error(f"Failed to get strategy {strategy_id}: {e}")
            return None

    def get_all_strategies(self) -> List[StrategyDB]:
        """获取所有策略"""
        try:
            with self.get_session() as session:
                return session.query(StrategyDB).order_by(StrategyDB.created_at.desc()).all()

        except SQLAlchemyError as e:
            logger.error(f"Failed to get all strategies: {e}")
            return []

    def get_enabled_strategies(self) -> List[StrategyDB]:
        """获取所有启用的策略"""
        try:
            with self.get_session() as session:
                return session.query(StrategyDB).filter(StrategyDB.enabled == True).all()

        except SQLAlchemyError as e:
            logger.error(f"Failed to get enabled strategies: {e}")
            return []

    def update_strategy(self, strategy_id: int, strategy_data: dict) -> bool:
        """更新策略"""
        try:
            with self.get_session() as session:
                strategy = session.query(StrategyDB).filter(StrategyDB.id == strategy_id).first()
                if strategy:
                    for key, value in strategy_data.items():
                        if hasattr(strategy, key):
                            setattr(strategy, key, value)
                    session.commit()
                    logger.info(f"Updated strategy: {strategy_id}")
                    return True
                return False

        except SQLAlchemyError as e:
            logger.error(f"Failed to update strategy {strategy_id}: {e}")
            return False

    def update_strategy_execution(self, strategy_id: int, execution_time) -> bool:
        """更新策略执行记录"""
        try:
            with self.get_session() as session:
                strategy = session.query(StrategyDB).filter(StrategyDB.id == strategy_id).first()
                if strategy:
                    strategy.last_execution_time = execution_time
                    strategy.execution_count += 1
                    session.commit()
                    return True
                return False

        except SQLAlchemyError as e:
            logger.error(f"Failed to update strategy execution {strategy_id}: {e}")
            return False

    def delete_strategy(self, strategy_id: int) -> bool:
        """删除策略"""
        try:
            with self.get_session() as session:
                strategy = session.query(StrategyDB).filter(StrategyDB.id == strategy_id).first()
                if strategy and not strategy.is_system_default:
                    session.delete(strategy)
                    session.commit()
                    logger.info(f"Deleted strategy: {strategy_id}")
                    return True
                return False

        except SQLAlchemyError as e:
            logger.error(f"Failed to delete strategy {strategy_id}: {e}")
            return False

    # ==================== 选股结果相关方法 ====================

    def save_selection_result(self, result_data: dict) -> Optional[int]:
        """保存选股结果"""
        try:
            with self.get_session() as session:
                result = SelectionResultDB(**result_data)
                session.add(result)
                session.commit()
                session.refresh(result)
                return result.id

        except SQLAlchemyError as e:
            logger.error(f"Failed to save selection result: {e}")
            return None

    def get_strategy_results(self, strategy_id: int, limit: int = 20) -> List[SelectionResultDB]:
        """获取策略的执行结果"""
        try:
            with self.get_session() as session:
                return (session.query(SelectionResultDB)
                       .filter(SelectionResultDB.strategy_id == strategy_id)
                       .order_by(SelectionResultDB.execution_time.desc())
                       .limit(limit)
                       .all())

        except SQLAlchemyError as e:
            logger.error(f"Failed to get strategy results for {strategy_id}: {e}")
            return []

    def get_latest_selection_results(self, strategy_id: Optional[int] = None) -> List[SelectionResultDB]:
        """获取最新的选股结果"""
        try:
            with self.get_session() as session:
                query = session.query(SelectionResultDB)

                if strategy_id:
                    query = query.filter(SelectionResultDB.strategy_id == strategy_id)

                # 获取最新执行时间
                latest_time_subquery = (session.query(SelectionResultDB.execution_time)
                                       .order_by(SelectionResultDB.execution_time.desc())
                                       .limit(1)
                                       .subquery())

                return (query.filter(SelectionResultDB.execution_time == latest_time_subquery.c.execution_time)
                       .order_by(SelectionResultDB.score.desc())
                       .all())

        except SQLAlchemyError as e:
            logger.error(f"Failed to get latest selection results: {e}")
            return []

    def cleanup_old_selection_results(self, days_to_keep: int = 30) -> int:
        """清理过期的选股结果"""
        try:
            from datetime import datetime, timedelta
            cutoff_date = datetime.now() - timedelta(days=days_to_keep)

            with self.get_session() as session:
                deleted_count = (session.query(SelectionResultDB)
                               .filter(SelectionResultDB.execution_time < cutoff_date)
                               .delete())
                session.commit()
                logger.info(f"Cleaned up {deleted_count} old selection results")
                return deleted_count

        except SQLAlchemyError as e:
            logger.error(f"Failed to cleanup old selection results: {e}")
            return 0

    # ==================== 交易计划相关方法 ====================

    def create_trading_plan(self, plan_data: dict) -> Optional[int]:
        """创建交易计划"""
        try:
            import uuid
            from datetime import datetime
            
            with self.get_session() as session:
                # 生成唯一ID
                plan_id = str(uuid.uuid4())
                
                # 计算计划评分和风险收益比
                plan_score = self._calculate_plan_score(plan_data)
                risk_reward_ratio = self._calculate_risk_reward_ratio(plan_data)
                
                plan = TradingPlanDB(
                    plan_id=plan_id,
                    stock_code=plan_data.get('stock_code'),
                    stock_name=plan_data.get('stock_name'),
                    plan_type=plan_data.get('plan_type'),
                    trade_direction=plan_data.get('trade_direction'),
                    trade_type=plan_data.get('trade_type'),
                    buy_reason=plan_data.get('buy_reason'),
                    target_price=plan_data.get('target_price'),
                    position_size=plan_data.get('position_size'),
                    max_position_ratio=plan_data.get('max_position_ratio', 10.0),
                    stop_loss_price=plan_data.get('stop_loss_price'),
                    stop_loss_ratio=plan_data.get('stop_loss_ratio'),
                    take_profit_price=plan_data.get('take_profit_price'),
                    take_profit_ratio=plan_data.get('take_profit_ratio'),
                    batch_profit_plan=plan_data.get('batch_profit_plan'),
                    expected_hold_period=plan_data.get('expected_hold_period'),
                    planned_entry_date=plan_data.get('planned_entry_date'),
                    planned_exit_date=plan_data.get('planned_exit_date'),
                    related_strategy_id=plan_data.get('related_strategy_id'),
                    related_playbook_id=plan_data.get('related_playbook_id'),
                    plan_score=plan_score,
                    risk_reward_ratio=risk_reward_ratio,
                    confidence_level=plan_data.get('confidence_level', 'medium')
                )
                
                session.add(plan)
                session.commit()
                session.refresh(plan)
                
                logger.info(f"Created trading plan: {plan.plan_id}")
                return plan.id
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to create trading plan: {e}")
            return None

    def get_trading_plan(self, plan_id: str) -> Optional[TradingPlanDB]:
        """获取交易计划"""
        try:
            with self.get_session() as session:
                return session.query(TradingPlanDB).filter(
                    TradingPlanDB.plan_id == plan_id
                ).first()
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to get trading plan {plan_id}: {e}")
            return None

    def get_all_trading_plans(self, status: Optional[str] = None) -> List[TradingPlanDB]:
        """获取所有交易计划"""
        try:
            with self.get_session() as session:
                query = session.query(TradingPlanDB)
                
                if status:
                    query = query.filter(TradingPlanDB.status == status)
                
                return query.order_by(TradingPlanDB.created_at.desc()).all()
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to get trading plans: {e}")
            return []

    def update_trading_plan(self, plan_id: str, update_data: dict) -> bool:
        """更新交易计划"""
        try:
            with self.get_session() as session:
                plan = session.query(TradingPlanDB).filter(
                    TradingPlanDB.plan_id == plan_id
                ).first()
                
                if plan:
                    # 如果计划已锁定，不允许修改
                    if plan.is_locked:
                        logger.warning(f"Trading plan {plan_id} is locked and cannot be updated")
                        return False
                    
                    for key, value in update_data.items():
                        if hasattr(plan, key):
                            setattr(plan, key, value)
                    
                    # 重新计算评分
                    plan.plan_score = self._calculate_plan_score(update_data)
                    if 'stop_loss_price' in update_data and 'take_profit_price' in update_data:
                        plan.risk_reward_ratio = self._calculate_risk_reward_ratio(update_data)
                    
                    session.commit()
                    logger.info(f"Updated trading plan: {plan_id}")
                    return True
                
                return False
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to update trading plan {plan_id}: {e}")
            return False

    def lock_trading_plan(self, plan_id: str, lock_reason: str = "防止情绪化修改") -> bool:
        """锁定交易计划"""
        try:
            with self.get_session() as session:
                plan = session.query(TradingPlanDB).filter(
                    TradingPlanDB.plan_id == plan_id
                ).first()
                
                if plan:
                    plan.is_locked = True
                    plan.lock_reason = lock_reason
                    session.commit()
                    logger.info(f"Locked trading plan: {plan_id}")
                    return True
                
                return False
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to lock trading plan {plan_id}: {e}")
            return False

    def unlock_trading_plan(self, plan_id: str) -> bool:
        """解锁交易计划"""
        try:
            with self.get_session() as session:
                plan = session.query(TradingPlanDB).filter(
                    TradingPlanDB.plan_id == plan_id
                ).first()
                
                if plan:
                    plan.is_locked = False
                    plan.lock_reason = None
                    session.commit()
                    logger.info(f"Unlocked trading plan: {plan_id}")
                    return True
                
                return False
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to unlock trading plan {plan_id}: {e}")
            return False

    # ==================== 交易记录相关方法 ====================

    def create_trade_record(self, trade_data: dict) -> Optional[int]:
        """创建交易记录"""
        try:
            import uuid
            from datetime import datetime
            
            with self.get_session() as session:
                trade_id = str(uuid.uuid4())
                
                # 计算执行评分和偏离度
                execution_score = self._calculate_execution_score(trade_data)
                plan_deviation_ratio = self._calculate_plan_deviation(trade_data)
                
                # 检测是否为情绪化交易
                is_emotional = self._detect_emotional_trade(trade_data)
                
                trade = TradeRecordDB(
                    trade_id=trade_id,
                    plan_id=trade_data.get('plan_id'),
                    stock_code=trade_data.get('stock_code'),
                    stock_name=trade_data.get('stock_name'),
                    trade_direction=trade_data.get('trade_direction'),
                    trade_type=trade_data.get('trade_type'),
                    actual_price=trade_data.get('actual_price'),
                    actual_quantity=trade_data.get('actual_quantity'),
                    actual_amount=trade_data.get('actual_amount'),
                    commission=trade_data.get('commission', 0.0),
                    executed_at=trade_data.get('executed_at'),
                    execution_score=execution_score,
                    plan_deviation_ratio=plan_deviation_ratio,
                    is_emotional_trade=is_emotional,
                    emotional_factors=trade_data.get('emotional_factors'),
                    execution_notes=trade_data.get('execution_notes'),
                    deviation_reason=trade_data.get('deviation_reason')
                )
                
                session.add(trade)
                session.commit()
                session.refresh(trade)
                
                # 更新持仓记录
                self._update_position(trade_data, trade_id)
                
                logger.info(f"Created trade record: {trade.trade_id}")
                return trade.id
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to create trade record: {e}")
            return None

    def get_trade_records(self, plan_id: Optional[str] = None, limit: int = 50) -> List[TradeRecordDB]:
        """获取交易记录"""
        try:
            with self.get_session() as session:
                query = session.query(TradeRecordDB)
                
                if plan_id:
                    query = query.filter(TradeRecordDB.plan_id == plan_id)
                
                return query.order_by(TradeRecordDB.executed_at.desc()).limit(limit).all()
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to get trade records: {e}")
            return []

    # ==================== 情绪记录相关方法 ====================

    def create_emotion_record(self, emotion_data: dict) -> Optional[int]:
        """创建情绪记录"""
        try:
            import uuid
            from datetime import datetime
            
            with self.get_session() as session:
                record_id = str(uuid.uuid4())
                
                record = EmotionRecordDB(
                    record_id=record_id,
                    trade_id=emotion_data.get('trade_id'),
                    plan_id=emotion_data.get('plan_id'),
                    emotion_type=emotion_data.get('emotion_type'),
                    emotion_intensity=emotion_data.get('emotion_intensity'),
                    emotion_description=emotion_data.get('emotion_description'),
                    trigger_factors=emotion_data.get('trigger_factors'),
                    trigger_source=emotion_data.get('trigger_source'),
                    recorded_at=emotion_data.get('recorded_at', datetime.utcnow()),
                    trade_phase=emotion_data.get('trade_phase'),
                    intervention_taken=emotion_data.get('intervention_taken', False),
                    intervention_type=emotion_data.get('intervention_type'),
                    intervention_effectiveness=emotion_data.get('intervention_effectiveness'),
                    rationality_score=emotion_data.get('rationality_score', 5.0),
                    confidence_score=emotion_data.get('confidence_score', 5.0),
                    stress_level=emotion_data.get('stress_level', 5.0)
                )
                
                session.add(record)
                session.commit()
                session.refresh(record)
                
                logger.info(f"Created emotion record: {record.record_id}")
                return record.id
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to create emotion record: {e}")
            return None

    def get_emotion_records(self, trade_id: Optional[str] = None, limit: int = 100) -> List[EmotionRecordDB]:
        """获取情绪记录"""
        try:
            with self.get_session() as session:
                query = session.query(EmotionRecordDB)
                
                if trade_id:
                    query = query.filter(EmotionRecordDB.trade_id == trade_id)
                
                return query.order_by(EmotionRecordDB.recorded_at.desc()).limit(limit).all()
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to get emotion records: {e}")
            return []

    # ==================== 交易统计相关方法 ====================

    def get_trading_statistics(self) -> dict:
        """获取交易统计信息"""
        try:
            with self.get_session() as session:
                # 基础统计
                total_trades = session.query(TradeRecordDB).count()
                emotional_trades = session.query(TradeRecordDB).filter(
                    TradeRecordDB.is_emotional_trade == True
                ).count()
                
                # 计算成功率（盈利交易比例）
                successful_trades = 0
                total_profit_loss = 0.0
                max_profit = 0.0
                max_loss = 0.0
                
                trades = session.query(TradeRecordDB).all()
                for trade in trades:
                    # 简化的盈亏计算（需要根据实际业务逻辑调整）
                    if trade.trade_direction == 'buy':
                        profit_loss = 0  # 需要后续完善
                    else:
                        profit_loss = 0
                    
                    total_profit_loss += profit_loss
                    
                    if profit_loss > 0:
                        successful_trades += 1
                        max_profit = max(max_profit, profit_loss)
                    else:
                        max_loss = min(max_loss, profit_loss)
                
                success_rate = (successful_trades / total_trades * 100) if total_trades > 0 else 0
                emotional_trades_ratio = (emotional_trades / total_trades * 100) if total_trades > 0 else 0
                average_profit_loss = total_profit_loss / total_trades if total_trades > 0 else 0
                
                # 计算平均执行评分
                avg_execution_score = session.query(
                    session.query(TradeRecordDB.execution_score).label('score')
                ).all()
                avg_score = sum([s.score for s in avg_execution_score]) / len(avg_execution_score) if avg_execution_score else 0
                
                # 获取当前纪律评分
                latest_discipline = session.query(TradingDisciplineDB).order_by(
                    TradingDisciplineDB.score_date.desc()
                ).first()
                
                return {
                    "total_trades": total_trades,
                    "successful_trades": successful_trades,
                    "success_rate": round(success_rate, 2),
                    "total_profit_loss": round(total_profit_loss, 2),
                    "average_profit_loss": round(average_profit_loss, 2),
                    "max_profit": round(max_profit, 2),
                    "max_loss": round(max_loss, 2),
                    "emotional_trades_count": emotional_trades,
                    "emotional_trades_ratio": round(emotional_trades_ratio, 2),
                    "plan_compliance_rate": round(100 - emotional_trades_ratio, 2),  # 简化计算
                    "average_execution_score": round(avg_score, 2),
                    "current_discipline_score": latest_discipline.total_score if latest_discipline else 0
                }
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to get trading statistics: {e}")
            return {}

    # ==================== 私有辅助方法 ====================

    def _calculate_plan_score(self, plan_data: dict) -> float:
        """计算计划完整性评分"""
        score = 0
        max_score = 100
        
        # 必填项检查 (60分)
        required_fields = ['buy_reason', 'target_price', 'position_size', 'stop_loss_price']
        for field in required_fields:
            if plan_data.get(field):
                score += 15
        
        # 可选项加分 (20分)
        optional_fields = ['take_profit_price', 'expected_hold_period', 'batch_profit_plan']
        for field in optional_fields:
            if plan_data.get(field):
                score += 7  # 约6.7分每个
        
        # 仓位合理性 (10分)
        position_size = plan_data.get('position_size', 0)
        if 0 < position_size <= 20:  # 合理仓位范围
            score += 10
        elif 20 < position_size <= 50:
            score += 5
        
        # 风险收益比 (10分)
        if self._calculate_risk_reward_ratio(plan_data) >= 2:
            score += 10
        elif self._calculate_risk_reward_ratio(plan_data) >= 1:
            score += 5
        
        return min(score, max_score)

    def _calculate_risk_reward_ratio(self, plan_data: dict) -> float:
        """计算风险收益比"""
        try:
            target_price = plan_data.get('target_price', 0)
            stop_loss_price = plan_data.get('stop_loss_price', 0)
            take_profit_price = plan_data.get('take_profit_price', target_price)
            
            if stop_loss_price <= 0 or target_price <= 0:
                return 0
            
            risk = abs(target_price - stop_loss_price)
            reward = abs(take_profit_price - target_price)
            
            return reward / risk if risk > 0 else 0
            
        except:
            return 0

    def _calculate_execution_score(self, trade_data: dict) -> float:
        """计算执行评分"""
        score = 100
        
        # 偏离计划扣分
        deviation = self._calculate_plan_deviation(trade_data)
        score -= min(deviation * 2, 50)  # 最多扣50分
        
        # 情绪化交易扣分
        if self._detect_emotional_trade(trade_data):
            score -= 30
        
        return max(score, 0)

    def _calculate_plan_deviation(self, trade_data: dict) -> float:
        """计算计划偏离度"""
        # 简化的偏离度计算，需要根据实际业务逻辑完善
        return 0.0

    def _detect_emotional_trade(self, trade_data: dict) -> bool:
        """检测情绪化交易"""
        # 简化的情绪化交易检测，需要根据实际业务逻辑完善
        emotional_indicators = trade_data.get('emotional_factors', {})
        return len(emotional_indicators) > 0

    def _update_position(self, trade_data: dict, trade_id: str):
        """更新持仓记录"""
        # 简化的持仓更新逻辑，需要根据实际业务逻辑完善
        pass

    def close(self):
        """关闭数据库连接"""
        if self.engine:
            self.engine.dispose()
            logger.info("Database connection closed")


# 全局数据库服务实例
db_service = DatabaseService()

# 依赖注入函数
def get_db():
    """获取数据库会话的依赖注入函数"""
    db = db_service.get_session()
    try:
        yield db
    finally:
        db.close()
