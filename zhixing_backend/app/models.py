"""
数据模型定义
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, Date, Index, create_engine, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()


# ==================== SQLAlchemy 数据库模型 ====================

class StockDB(Base):
    """股票信息表"""
    __tablename__ = "stocks"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    market = Column(String(10), nullable=False)  # US, HK, CN
    group_id = Column(String(50))
    group_name = Column(String(100))
    lot_size = Column(Integer, default=100)
    sec_type = Column(String(20), default="STOCK")

    # 用户自定义标签和属性
    market_cap = Column(String(20))  # large, mid, small
    watch_level = Column(String(20))  # high, medium, low
    notes = Column(Text)  # 用户备注

    added_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)


class QuoteDB(Base):
    """行情数据表"""
    __tablename__ = "quotes"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), index=True, nullable=False)
    cur_price = Column(Float, nullable=False)
    prev_close_price = Column(Float)
    open_price = Column(Float)
    high_price = Column(Float)
    low_price = Column(Float)
    volume = Column(Integer)
    turnover = Column(Float)
    change_val = Column(Float)
    change_rate = Column(Float)
    amplitude = Column(Float)
    update_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class KLineDB(Base):
    """K线数据表"""
    __tablename__ = "klines"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), index=True, nullable=False)
    period = Column(String(10), nullable=False)  # K_1M, K_5M, K_DAY, etc.
    time_key = Column(String(20), nullable=False)
    open_price = Column(Float, nullable=False)
    close_price = Column(Float, nullable=False)
    high_price = Column(Float, nullable=False)
    low_price = Column(Float, nullable=False)
    volume = Column(Integer)
    turnover = Column(Float)
    pe = Column(Float)
    change_rate = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)


class StrategyDB(Base):
    """选股策略表"""
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    category = Column(String(50), nullable=False)  # pattern, pullback, breakthrough
    # 策略实现类型（由后端代码实现类在工厂中映射，例如 'ema55_pullback'）
    impl_type = Column(String(100), nullable=False)
    configuration = Column(Text)  # JSON格式的策略配置
    timeframe = Column(String(10), nullable=False)  # 1d, 1h, 15m
    enabled = Column(Boolean, default=True)
    is_system_default = Column(Boolean, default=False)
    execution_count = Column(Integer, default=0)
    last_execution_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SelectionResultDB(Base):
    """选股结果表"""
    __tablename__ = "selection_results"

    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(Integer, nullable=False)
    stock_symbol = Column(String(20), nullable=False)
    execution_time = Column(DateTime, nullable=False)
    score = Column(Float, nullable=False)
    confidence = Column(String(20), nullable=False)  # high, medium, low
    reasons = Column(Text)  # 选中原因，分号分隔
    suggested_action = Column(String(100))
    target_price = Column(Float)
    stop_loss = Column(Float)
    current_price = Column(Float)
    technical_details = Column(Text)  # 技术分析详情
    risk_level = Column(Integer, default=3)  # 1-5，1最低，5最高
    processed = Column(Boolean, default=False)  # 是否已处理
    created_at = Column(DateTime, default=datetime.utcnow)


class ConceptDB(Base):
    """概念表"""
    __tablename__ = "concepts"

    id = Column(Integer, primary_key=True, index=True)
    concept_id = Column(String(50), unique=True, index=True, nullable=False)  # 概念唯一标识
    name = Column(String(100), nullable=False)  # 概念名称
    description = Column(Text)  # 概念描述
    category = Column(String(50))  # 概念分类：行业、主题、技术等
    stock_count = Column(Integer, default=0)  # 关联股票数量
    is_active = Column(Boolean, default=True)  # 是否启用
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ConceptStockRelationDB(Base):
    """概念-股票关联表"""
    __tablename__ = "concept_stock_relations"

    id = Column(Integer, primary_key=True, index=True)
    concept_id = Column(String(50), nullable=False)  # 概念ID
    stock_code = Column(String(20), nullable=False)  # 股票代码
    weight = Column(Float, default=1.0)  # 关联权重，用于排序
    is_primary = Column(Boolean, default=False)  # 是否为主要概念
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CategoryDB(Base):
    """多级分类树表"""
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(String(50), unique=True, index=True, nullable=False)  # 分类唯一标识
    name = Column(String(100), nullable=False)  # 分类名称
    parent_id = Column(String(50), index=True)  # 父分类ID（NULL表示根节点）
    path = Column(String(500))  # 路径（如：/ai/compute/energy/nuclear）
    level = Column(Integer, default=0)  # 层级（0表示根节点）
    sort_order = Column(Integer, default=0)  # 同级排序
    
    # 显示属性
    icon = Column(String(50))  # 图标
    color = Column(String(20))  # 颜色标识
    description = Column(Text)  # 分类描述
    
    # 统计信息
    stock_count = Column(Integer, default=0)  # 直接关联的股票数量
    total_stock_count = Column(Integer, default=0)  # 包含子分类的总股票数量
    
    # 状态
    is_active = Column(Boolean, default=True)
    is_custom = Column(Boolean, default=True)  # 是否用户自定义
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CategoryStockRelationDB(Base):
    """分类-股票关联表"""
    __tablename__ = "category_stock_relations"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(String(50), nullable=False, index=True)  # 分类ID
    stock_code = Column(String(20), nullable=False, index=True)  # 股票代码
    weight = Column(Float, default=1.0)  # 权重（用于计算加权涨跌幅）
    is_primary = Column(Boolean, default=False)  # 是否为主要分类
    notes = Column(Text)  # 备注
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 唯一约束：同一股票在同一分类下只能有一条记录
    __table_args__ = (
        Index('idx_category_stock_unique', 'category_id', 'stock_code', unique=True),
    )


class ExpertDB(Base):
    """专家表"""
    __tablename__ = "experts"

    id = Column(Integer, primary_key=True, index=True)
    expert_id = Column(String(50), unique=True, index=True, nullable=False)  # 专家唯一标识
    name = Column(String(100), nullable=False)  # 专家姓名
    title = Column(String(200))  # 专家头衔
    credibility = Column(Integer, default=50)  # 可信度评分 0-100
    specialties = Column(Text)  # JSON数组：专长领域
    description = Column(Text)  # 专家描述
    is_verified = Column(Boolean, default=False)  # 是否认证
    is_active = Column(Boolean, default=True)  # 是否启用
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ExpertOpinionDB(Base):
    """专家意见表"""
    __tablename__ = "expert_opinions"

    id = Column(Integer, primary_key=True, index=True)
    opinion_id = Column(String(50), unique=True, index=True, nullable=False)  # 意见唯一标识
    stock_code = Column(String(20), nullable=False)  # 股票代码
    expert_id = Column(String(50), nullable=False)  # 专家ID
    title = Column(String(200), nullable=False)  # 意见标题
    content = Column(Text, nullable=False)  # 意见内容
    sentiment = Column(String(20), nullable=False)  # bullish, bearish, neutral
    price_guidances = Column(Text)  # JSON数组：价格指导
    chart_images = Column(Text)  # JSON数组：图表图片URL
    published_at = Column(DateTime, nullable=False)  # 发布时间
    source = Column(String(200))  # 来源
    tags = Column(Text)  # JSON数组：标签
    is_active = Column(Boolean, default=True)  # 是否启用
    priority = Column(String(20), default='medium')  # high, medium, low
    is_bookmarked = Column(Boolean, default=False)  # 是否收藏
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TradingPlaybookDB(Base):
    """交易剧本表"""
    __tablename__ = "trading_playbooks"

    id = Column(Integer, primary_key=True, index=True)
    playbook_id = Column(String(50), unique=True, index=True, nullable=False)  # 剧本唯一标识
    name = Column(String(100), nullable=False)  # 剧本名称
    description = Column(Text)  # 剧本描述
    template = Column(Text, nullable=False)  # JSON格式：剧本模板
    tags = Column(Text)  # JSON数组：标签
    is_system_default = Column(Boolean, default=False)  # 是否系统默认
    is_active = Column(Boolean, default=True)  # 是否启用
    usage_count = Column(Integer, default=0)  # 使用次数
    performance = Column(Text)  # JSON格式：绩效统计
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SelectionStrategyDB(Base):
    """选股策略表（重命名以避免与StrategyDB冲突）"""
    __tablename__ = "selection_strategies"

    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(String(50), unique=True, index=True, nullable=False)  # 策略唯一标识
    name = Column(String(100), nullable=False)  # 策略名称
    description = Column(Text)  # 策略描述
    category = Column(String(50), nullable=False)  # 策略分类：pullback, breakthrough, pattern等
    conditions = Column(Text, nullable=False)  # JSON格式：策略条件
    parameters = Column(Text)  # JSON格式：策略参数
    is_active = Column(Boolean, default=True)  # 是否启用
    is_system_default = Column(Boolean, default=False)  # 是否系统默认
    usage_count = Column(Integer, default=0)  # 使用次数
    success_rate = Column(Float, default=0.0)  # 成功率
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ==================== 交易纪律管理相关模型 ====================

class TradingPlanDB(Base):
    """交易计划表"""
    __tablename__ = "trading_plans"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(String(50), unique=True, index=True, nullable=False)
    
    # 基本信息
    stock_code = Column(String(20), nullable=False)
    stock_name = Column(String(100), nullable=False)
    plan_type = Column(String(20), nullable=False)  # short_term, swing_trading, value_investment
    
    # 交易类型
    trade_direction = Column(String(10), nullable=False)  # buy, sell
    trade_type = Column(String(20), nullable=False)  # short_swing, medium_swing, long_investment
    
    # 计划内容
    buy_reason = Column(Text, nullable=False)  # 买入理由（技术面+基本面+消息面）
    target_price = Column(Float, nullable=False)  # 目标买入价格
    position_size = Column(Float, nullable=False)  # 仓位大小（占总资金比例）
    max_position_ratio = Column(Float, default=10.0)  # 最大仓位比例限制
    
    # 风险控制
    stop_loss_price = Column(Float, nullable=False)  # 止损价格
    stop_loss_ratio = Column(Float, nullable=False)  # 止损比例
    take_profit_price = Column(Float)  # 止盈价格
    take_profit_ratio = Column(Float)  # 止盈比例
    
    # 分批止盈计划
    batch_profit_plan = Column(Text)  # JSON格式：分批止盈计划
    
    # 时间规划
    expected_hold_period = Column(String(20))  # 预期持有周期
    planned_entry_date = Column(DateTime)  # 计划入场时间
    planned_exit_date = Column(DateTime)  # 计划出场时间
    
    # 评估和状态
    plan_score = Column(Float, default=0.0)  # 计划完整性评分（0-100）
    risk_reward_ratio = Column(Float, default=0.0)  # 风险收益比
    confidence_level = Column(String(20), default='medium')  # high, medium, low
    
    # 状态管理
    status = Column(String(20), default='draft')  # draft, active, completed, cancelled
    is_locked = Column(Boolean, default=False)  # 是否锁定（防止情绪化修改）
    lock_reason = Column(String(200))  # 锁定原因
    
    # 关联信息
    related_strategy_id = Column(String(50))  # 关联的策略ID
    related_playbook_id = Column(String(50))  # 关联的剧本ID
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)


class TradeRecordDB(Base):
    """交易记录表"""
    __tablename__ = "trade_records"

    id = Column(Integer, primary_key=True, index=True)
    trade_id = Column(String(50), unique=True, index=True, nullable=False)
    
    # 关联信息
    plan_id = Column(String(50), nullable=False)  # 关联的交易计划ID
    
    # 交易基本信息
    stock_code = Column(String(20), nullable=False)
    stock_name = Column(String(100), nullable=False)
    trade_direction = Column(String(10), nullable=False)  # buy, sell
    trade_type = Column(String(20), nullable=False)  # short_swing, medium_swing, long_investment
    
    # 执行信息
    actual_price = Column(Float, nullable=False)  # 实际成交价格
    actual_quantity = Column(Integer, nullable=False)  # 实际成交数量
    actual_amount = Column(Float, nullable=False)  # 实际成交金额
    commission = Column(Float, default=0.0)  # 手续费
    
    # 执行时间
    executed_at = Column(DateTime, nullable=False)  # 执行时间
    
    # 执行评估
    execution_score = Column(Float, default=0.0)  # 执行评分（0-100）
    plan_deviation_ratio = Column(Float, default=0.0)  # 计划偏离度
    is_emotional_trade = Column(Boolean, default=False)  # 是否情绪化交易
    emotional_factors = Column(Text)  # JSON格式：情绪化因素
    
    # 执行备注
    execution_notes = Column(Text)  # 执行备注
    deviation_reason = Column(Text)  # 偏离计划原因
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PositionDB(Base):
    """持仓记录表"""
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    position_id = Column(String(50), unique=True, index=True, nullable=False)
    
    # 基本信息
    stock_code = Column(String(20), nullable=False)
    stock_name = Column(String(100), nullable=False)
    plan_id = Column(String(50))  # 关联的交易计划ID
    
    # 仓位信息
    quantity = Column(Integer, nullable=False)  # 持有数量
    avg_cost = Column(Float, nullable=False)  # 平均成本
    current_price = Column(Float)  # 当前价格
    market_value = Column(Float)  # 市值
    profit_loss = Column(Float, default=0.0)  # 盈亏金额
    profit_loss_ratio = Column(Float, default=0.0)  # 盈亏比例
    
    # 风险控制
    stop_loss_price = Column(Float)  # 止损价格
    take_profit_price = Column(Float)  # 止盈价格
    
    # 状态管理
    status = Column(String(20), default='open')  # open, closed, partial_closed
    opened_at = Column(DateTime, nullable=False)  # 开仓时间
    closed_at = Column(DateTime)  # 平仓时间
    
    # 持仓监控
    highest_price = Column(Float)  # 持仓期间最高价
    lowest_price = Column(Float)  # 持仓期间最低价
    max_profit_ratio = Column(Float)  # 最大盈利比例
    max_loss_ratio = Column(Float)  # 最大亏损比例
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmotionRecordDB(Base):
    """情绪记录表"""
    __tablename__ = "emotion_records"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(String(50), unique=True, index=True, nullable=False)
    
    # 关联信息
    trade_id = Column(String(50))  # 关联的交易记录ID
    plan_id = Column(String(50))  # 关联的交易计划ID
    
    # 情绪基本信息
    emotion_type = Column(String(20), nullable=False)  # fear, greed, panic, fomo, calm, etc.
    emotion_intensity = Column(Float, nullable=False)  # 情绪强度（1-10）
    emotion_description = Column(Text)  # 情绪描述
    
    # 触发因素
    trigger_factors = Column(Text)  # JSON格式：触发因素
    trigger_source = Column(String(50))  # 触发来源：market_news, price_change, etc.
    
    # 记录时间
    recorded_at = Column(DateTime, default=datetime.utcnow)  # 记录时间
    trade_phase = Column(String(20))  # 交易阶段：pre_trade, in_trade, post_trade
    
    # 干预措施
    intervention_taken = Column(Boolean, default=False)  # 是否采取干预措施
    intervention_type = Column(String(50))  # 干预类型：cooldown_period, reminder, etc.
    intervention_effectiveness = Column(String(20))  # 干预效果：effective, neutral, ineffective
    
    # 心理状态评估
    rationality_score = Column(Float, default=5.0)  # 理性评分（1-10）
    confidence_score = Column(Float, default=5.0)  # 信心评分（1-10）
    stress_level = Column(Float, default=5.0)  # 压力水平（1-10）
    
    created_at = Column(DateTime, default=datetime.utcnow)


class TradingDisciplineDB(Base):
    """交易纪律评分表"""
    __tablename__ = "trading_discipline"

    id = Column(Integer, primary_key=True, index=True)
    discipline_id = Column(String(50), unique=True, index=True, nullable=False)
    
    # 评分基本信息
    score_date = Column(DateTime, nullable=False)  # 评分日期
    total_score = Column(Float, nullable=False)  # 总分（0-100）
    
    # 分项评分
    plan_completeness_score = Column(Float, default=0.0)  # 计划完整性评分
    execution_consistency_score = Column(Float, default=0.0)  # 执行一致性评分
    risk_control_score = Column(Float, default=0.0)  # 风险控制评分
    emotional_control_score = Column(Float, default=0.0)  # 情绪控制评分
    review_quality_score = Column(Float, default=0.0)  # 复盘质量评分
    
    # 统计信息
    total_trades = Column(Integer, default=0)  # 总交易次数
    successful_trades = Column(Integer, default=0)  # 成功交易次数
    emotional_trades = Column(Integer, default=0)  # 情绪化交易次数
    plan_deviation_count = Column(Integer, default=0)  # 计划偏离次数
    
    # 改进趋势
    score_trend = Column(String(20))  # 评分趋势：improving, stable, declining
    improvement_suggestions = Column(Text)  # 改进建议
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TradingReviewDB(Base):
    """交易复盘表"""
    __tablename__ = "trading_reviews"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(String(50), unique=True, index=True, nullable=False)
    
    # 关联信息
    trade_id = Column(String(50), nullable=False)  # 关联的交易记录ID
    plan_id = Column(String(50))  # 关联的交易计划ID
    
    # 复盘基本信息
    review_type = Column(String(20), nullable=False)  # daily, weekly, monthly, ad_hoc
    review_date = Column(DateTime, nullable=False)  # 复盘日期
    
    # 结果分析
    actual_profit_loss = Column(Float, default=0.0)  # 实际盈亏
    actual_profit_loss_ratio = Column(Float, default=0.0)  # 实际盈亏比例
    plan_vs_result = Column(String(20))  # 计划vs结果：better, as_expected, worse
    
    # 纪律评估
    discipline_execution_score = Column(Float, default=0.0)  # 纪律执行评分
    emotional_control_score = Column(Float, default=0.0)  # 情绪控制评分
    risk_management_score = Column(Float, default=0.0)  # 风险管理评分
    
    # 总结和反思
    highlights = Column(Text)  # 亮点
    shortcomings = Column(Text)  # 不足
    lessons_learned = Column(Text)  # 经验教训
    improvement_plan = Column(Text)  # 改进计划
    
    # 心理分析
    psychological_factors = Column(Text)  # 心理因素分析
    emotional_triggers_identified = Column(Text)  # 识别的情绪触发点
    
    # 状态
    is_completed = Column(Boolean, default=False)  # 是否完成
    quality_score = Column(Float, default=0.0)  # 复盘质量评分
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DataSyncTaskDB(Base):
    """数据同步任务表"""
    __tablename__ = "data_sync_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(50), unique=True, index=True, nullable=False)  # 任务唯一标识
    
    # 任务基本信息
    task_type = Column(String(20), nullable=False)  # full, incremental, specific
    trigger_source = Column(String(20), default='manual')  # manual, scheduled, auto
    
    # 任务状态
    status = Column(String(20), default='pending')  # pending, running, completed, failed, cancelled
    progress = Column(Float, default=0.0)  # 进度百分比 0-100
    
    # 任务详情
    total_stocks = Column(Integer, default=0)  # 总股票数量
    processed_stocks = Column(Integer, default=0)  # 已处理股票数量
    success_stocks = Column(Integer, default=0)  # 成功股票数量
    failed_stocks = Column(Integer, default=0)  # 失败股票数量
    
    # 数据统计
    daily_records = Column(Integer, default=0)  # 日线数据记录数
    hourly_records = Column(Integer, default=0)  # 小时线数据记录数
    
    # 任务配置
    force_full_sync = Column(Boolean, default=False)  # 是否强制全量同步
    target_symbols = Column(Text)  # JSON格式：目标股票列表（为空表示全部）
    
    # 时间记录
    start_time = Column(DateTime, nullable=False)  # 开始时间
    end_time = Column(DateTime)  # 结束时间
    duration_seconds = Column(Float)  # 执行耗时（秒）
    
    # 结果详情
    result_summary = Column(Text)  # JSON格式：结果摘要
    error_details = Column(Text)  # JSON格式：错误详情
    sync_details = Column(Text)  # JSON格式：详细同步结果
    
    # 元数据
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class StockSyncStatusDB(Base):
    """股票同步状态表"""
    __tablename__ = "stock_sync_status"

    id = Column(Integer, primary_key=True, index=True)
    stock_code = Column(String(20), index=True, nullable=False)  # 股票代码
    timeframe = Column(String(10), nullable=False)  # 时间周期：1d, 1h
    
    # 边界信息
    earliest_data_date = Column(Date)  # 数据库中最早数据日期
    latest_data_date = Column(Date)    # 数据库中最新数据日期
    target_start_date = Column(Date)   # 目标开始日期
    target_end_date = Column(Date)     # 目标结束日期（今天）
    
    # 同步状态
    sync_status = Column(String(20), default='pending')  # pending, syncing, completed, failed, partial
    last_sync_time = Column(DateTime)  # 最后同步时间
    last_successful_sync = Column(DateTime)  # 最后成功同步时间
    
    # 数据统计
    total_records = Column(Integer, default=0)  # 总记录数
    expected_records = Column(Integer, default=0)  # 预期记录数（基于交易日历）
    
    # 失败重试
    failed_ranges = Column(Text)  # JSON格式：失败的时间范围
    retry_count = Column(Integer, default=0)  # 重试次数
    last_error = Column(Text)  # 最后一次错误信息
    
    # 元数据
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 唯一约束
    __table_args__ = (
        Index('idx_stock_timeframe', 'stock_code', 'timeframe', unique=True),
    )


# ==================== Pydantic 响应模型 ====================

class StockInfo(BaseModel):
    """股票基础信息"""
    code: str
    name: str
    market: str  # US, HK, CN
    lot_size: int = 100
    sec_type: str = "STOCK"


class WatchlistGroup(BaseModel):
    """自选股分组"""
    group_id: str
    group_name: str
    stocks: List[StockInfo]


class QuoteData(BaseModel):
    """行情数据"""
    code: str
    name: str
    cur_price: float
    prev_close_price: Optional[float] = None
    open_price: Optional[float] = None
    high_price: Optional[float] = None
    low_price: Optional[float] = None
    volume: Optional[int] = None
    turnover: Optional[float] = None
    change_val: Optional[float] = None
    change_rate: Optional[float] = None
    amplitude: Optional[float] = None
    update_time: Optional[str] = None


class KLineData(BaseModel):
    """K线数据"""
    code: str
    time_key: str
    open_price: float
    close_price: float
    high_price: float
    low_price: float
    volume: Optional[int] = None
    turnover: Optional[float] = None
    pe: Optional[float] = None
    change_rate: Optional[float] = None


class TechnicalIndicator(BaseModel):
    """技术指标"""
    code: str
    time_key: str
    ma5: Optional[float] = None
    ma10: Optional[float] = None
    ma20: Optional[float] = None
    ma60: Optional[float] = None
    ema8: Optional[float] = None
    ema21: Optional[float] = None
    macd_dif: Optional[float] = None
    macd_dea: Optional[float] = None
    macd_macd: Optional[float] = None
    rsi: Optional[float] = None
    kdj_k: Optional[float] = None
    kdj_d: Optional[float] = None
    kdj_j: Optional[float] = None


class StrategyCreate(BaseModel):
    """创建策略请求"""
    name: str
    description: str
    category: str
    impl_type: str
    configuration: Dict[str, Any] = {}
    timeframe: str = "1d"
    enabled: bool = True


class StrategyUpdate(BaseModel):
    """更新策略请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    impl_type: Optional[str] = None
    configuration: Optional[Dict[str, Any]] = None
    timeframe: Optional[str] = None
    enabled: Optional[bool] = None


class StrategyResponse(BaseModel):
    """策略响应"""
    id: int
    name: str
    description: str
    category: str
    impl_type: str
    configuration: Dict[str, Any]
    timeframe: str
    enabled: bool
    is_system_default: bool
    execution_count: int
    last_execution_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class SelectionResultResponse(BaseModel):
    """选股结果响应"""
    id: int
    strategy_id: int
    strategy_name: Optional[str] = None
    stock_symbol: str
    execution_time: datetime
    score: float
    confidence: str
    reasons: List[str]
    suggested_action: str
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    current_price: Optional[float] = None
    technical_details: Optional[str] = None
    risk_level: int
    processed: bool


class ApiResponse(BaseModel):
    """API响应格式"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None
    timestamp: str


class PaginatedResponse(BaseModel):
    """分页响应格式"""
    success: bool
    data: List[Any]
    pagination: Dict[str, int]
    error: Optional[str] = None
    message: Optional[str] = None
    timestamp: str







# ==================== 交易纪律管理相关Pydantic模型 ====================

class TradingPlanCreate(BaseModel):
    """创建交易计划请求"""
    stock_code: str
    stock_name: str
    plan_type: str  # short_term, swing_trading, value_investment
    trade_direction: str  # buy, sell
    trade_type: str  # short_swing, medium_swing, long_investment
    buy_reason: str
    target_price: float
    position_size: float
    max_position_ratio: float = 10.0
    stop_loss_price: float
    stop_loss_ratio: float
    take_profit_price: Optional[float] = None
    take_profit_ratio: Optional[float] = None
    batch_profit_plan: Optional[Dict[str, Any]] = None
    expected_hold_period: Optional[str] = None
    planned_entry_date: Optional[datetime] = None
    planned_exit_date: Optional[datetime] = None
    related_strategy_id: Optional[str] = None
    related_playbook_id: Optional[str] = None


class TradingPlanUpdate(BaseModel):
    """更新交易计划请求"""
    buy_reason: Optional[str] = None
    target_price: Optional[float] = None
    position_size: Optional[float] = None
    stop_loss_price: Optional[float] = None
    stop_loss_ratio: Optional[float] = None
    take_profit_price: Optional[float] = None
    take_profit_ratio: Optional[float] = None
    batch_profit_plan: Optional[Dict[str, Any]] = None
    expected_hold_period: Optional[str] = None
    status: Optional[str] = None
    is_locked: Optional[bool] = None
    lock_reason: Optional[str] = None


class TradingPlanResponse(BaseModel):
    """交易计划响应"""
    id: int
    plan_id: str
    stock_code: str
    stock_name: str
    plan_type: str
    trade_direction: str
    trade_type: str
    buy_reason: str
    target_price: float
    position_size: float
    max_position_ratio: float
    stop_loss_price: float
    stop_loss_ratio: float
    take_profit_price: Optional[float] = None
    take_profit_ratio: Optional[float] = None
    batch_profit_plan: Optional[Dict[str, Any]] = None
    expected_hold_period: Optional[str] = None
    planned_entry_date: Optional[datetime] = None
    planned_exit_date: Optional[datetime] = None
    plan_score: float
    risk_reward_ratio: float
    confidence_level: str
    status: str
    is_locked: bool
    lock_reason: Optional[str] = None
    related_strategy_id: Optional[str] = None
    related_playbook_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None


class TradeRecordCreate(BaseModel):
    """创建交易记录请求"""
    plan_id: str
    stock_code: str
    stock_name: str
    trade_direction: str
    trade_type: str
    actual_price: float
    actual_quantity: int
    actual_amount: float
    commission: float = 0.0
    executed_at: datetime
    execution_notes: Optional[str] = None
    deviation_reason: Optional[str] = None


class TradeRecordResponse(BaseModel):
    """交易记录响应"""
    id: int
    trade_id: str
    plan_id: str
    stock_code: str
    stock_name: str
    trade_direction: str
    trade_type: str
    actual_price: float
    actual_quantity: int
    actual_amount: float
    commission: float
    executed_at: datetime
    execution_score: float
    plan_deviation_ratio: float
    is_emotional_trade: bool
    emotional_factors: Optional[Dict[str, Any]] = None
    execution_notes: Optional[str] = None
    deviation_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class PositionResponse(BaseModel):
    """持仓记录响应"""
    id: int
    position_id: str
    stock_code: str
    stock_name: str
    plan_id: Optional[str] = None
    quantity: int
    avg_cost: float
    current_price: Optional[float] = None
    market_value: Optional[float] = None
    profit_loss: float
    profit_loss_ratio: float
    stop_loss_price: Optional[float] = None
    take_profit_price: Optional[float] = None
    status: str
    opened_at: datetime
    closed_at: Optional[datetime] = None
    highest_price: Optional[float] = None
    lowest_price: Optional[float] = None
    max_profit_ratio: Optional[float] = None
    max_loss_ratio: Optional[float] = None
    created_at: datetime
    updated_at: datetime


class EmotionRecordCreate(BaseModel):
    """创建情绪记录请求"""
    trade_id: Optional[str] = None
    plan_id: Optional[str] = None
    emotion_type: str
    emotion_intensity: float
    emotion_description: str
    trigger_factors: Optional[Dict[str, Any]] = None
    trigger_source: Optional[str] = None
    recorded_at: Optional[datetime] = None
    trade_phase: Optional[str] = None
    intervention_taken: bool = False
    intervention_type: Optional[str] = None
    intervention_effectiveness: Optional[str] = None
    rationality_score: float = 5.0
    confidence_score: float = 5.0
    stress_level: float = 5.0


class EmotionRecordResponse(BaseModel):
    """情绪记录响应"""
    id: int
    record_id: str
    trade_id: Optional[str] = None
    plan_id: Optional[str] = None
    emotion_type: str
    emotion_intensity: float
    emotion_description: str
    trigger_factors: Optional[Dict[str, Any]] = None
    trigger_source: Optional[str] = None
    recorded_at: datetime
    trade_phase: Optional[str] = None
    intervention_taken: bool
    intervention_type: Optional[str] = None
    intervention_effectiveness: Optional[str] = None
    rationality_score: float
    confidence_score: float
    stress_level: float
    created_at: datetime


class TradingDisciplineResponse(BaseModel):
    """交易纪律评分响应"""
    id: int
    discipline_id: str
    score_date: datetime
    total_score: float
    plan_completeness_score: float
    execution_consistency_score: float
    risk_control_score: float
    emotional_control_score: float
    review_quality_score: float
    total_trades: int
    successful_trades: int
    emotional_trades: int
    plan_deviation_count: int
    score_trend: Optional[str] = None
    improvement_suggestions: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class TradingReviewCreate(BaseModel):
    """创建交易复盘请求"""
    trade_id: str
    plan_id: Optional[str] = None
    review_type: str
    review_date: datetime
    actual_profit_loss: float = 0.0
    actual_profit_loss_ratio: float = 0.0
    plan_vs_result: Optional[str] = None
    discipline_execution_score: float = 0.0
    emotional_control_score: float = 0.0
    risk_management_score: float = 0.0
    highlights: Optional[str] = None
    shortcomings: Optional[str] = None
    lessons_learned: Optional[str] = None
    improvement_plan: Optional[str] = None
    psychological_factors: Optional[str] = None
    emotional_triggers_identified: Optional[str] = None


class TradingReviewResponse(BaseModel):
    """交易复盘响应"""
    id: int
    review_id: str
    trade_id: str
    plan_id: Optional[str] = None
    review_type: str
    review_date: datetime
    actual_profit_loss: float
    actual_profit_loss_ratio: float
    plan_vs_result: Optional[str] = None
    discipline_execution_score: float
    emotional_control_score: float
    risk_management_score: float
    highlights: Optional[str] = None
    shortcomings: Optional[str] = None
    lessons_learned: Optional[str] = None
    improvement_plan: Optional[str] = None
    psychological_factors: Optional[str] = None
    emotional_triggers_identified: Optional[str] = None
    is_completed: bool
    quality_score: float
    created_at: datetime
    updated_at: datetime


class TradingStatsResponse(BaseModel):
    """交易统计响应"""
    total_trades: int
    successful_trades: int
    success_rate: float
    total_profit_loss: float
    average_profit_loss: float
    max_profit: float
    max_loss: float
    emotional_trades_count: int
    emotional_trades_ratio: float
    plan_compliance_rate: float
    average_execution_score: float
    current_discipline_score: float
    best_performing_stock: Optional[str] = None
    worst_performing_stock: Optional[str] = None
    monthly_stats: Optional[Dict[str, Any]] = None


# ==================== 分类树相关Pydantic模型 ====================

class CategoryCreate(BaseModel):
    """创建分类请求"""
    name: str
    parent_id: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    """更新分类请求"""
    name: Optional[str] = None
    parent_id: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryResponse(BaseModel):
    """分类响应"""
    id: int
    category_id: str
    name: str
    parent_id: Optional[str] = None
    path: Optional[str] = None
    level: int
    sort_order: int
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    stock_count: int
    total_stock_count: int
    is_active: bool
    is_custom: bool
    created_at: datetime
    updated_at: datetime


class CategoryTreeNode(BaseModel):
    """分类树节点"""
    id: int
    category_id: str
    name: str
    parent_id: Optional[str] = None
    path: Optional[str] = None
    level: int
    sort_order: int
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    stock_count: int
    total_stock_count: int
    is_active: bool
    is_custom: bool
    children: List['CategoryTreeNode'] = []
    
    # 热力图数据
    avg_change_percent: Optional[float] = None  # 平均涨跌幅
    total_market_value: Optional[float] = None  # 总市值
    rising_count: int = 0  # 上涨股票数
    falling_count: int = 0  # 下跌股票数


class CategoryStockRelationCreate(BaseModel):
    """创建分类-股票关联请求"""
    category_id: str
    stock_code: str
    weight: float = 1.0
    is_primary: bool = False
    notes: Optional[str] = None


class CategoryHeatmapData(BaseModel):
    """分类热力图数据"""
    category_id: str
    name: str
    path: str
    level: int
    parent_id: Optional[str] = None
    
    # 统计数据
    stock_count: int
    avg_change_percent: float  # 平均涨跌幅
    weighted_change_percent: float  # 加权涨跌幅
    total_market_value: float  # 总市值
    
    # 详细统计
    rising_count: int  # 上涨数量
    falling_count: int  # 下跌数量
    unchanged_count: int  # 平盘数量
    
    # 极值
    max_change_percent: float  # 最大涨幅
    min_change_percent: float  # 最大跌幅
    
    # 颜色映射（前端使用）
    heat_level: int  # 热度等级 1-10
    color: str  # 颜色值


# 解决Pydantic模型循环引用
CategoryTreeNode.model_rebuild()


# ==================== 数据同步任务相关Pydantic模型 ====================

class DataSyncTaskCreate(BaseModel):
    """创建数据同步任务请求"""
    task_type: str  # full, incremental, specific
    force_full_sync: bool = False
    target_symbols: Optional[List[str]] = None
    trigger_source: str = 'manual'


class DataSyncTaskResponse(BaseModel):
    """数据同步任务响应"""
    id: int
    task_id: str
    task_type: str
    trigger_source: str
    status: str
    progress: float
    total_stocks: int
    processed_stocks: int
    success_stocks: int
    failed_stocks: int
    daily_records: int
    hourly_records: int
    force_full_sync: bool
    target_symbols: Optional[List[str]] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    result_summary: Optional[Dict[str, Any]] = None
    error_details: Optional[Dict[str, Any]] = None
    sync_details: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime


class DataSyncTaskUpdate(BaseModel):
    """更新数据同步任务请求"""
    status: Optional[str] = None
    progress: Optional[float] = None
    processed_stocks: Optional[int] = None
    success_stocks: Optional[int] = None
    failed_stocks: Optional[int] = None
    daily_records: Optional[int] = None
    hourly_records: Optional[int] = None
    end_time: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    result_summary: Optional[Dict[str, Any]] = None
    error_details: Optional[Dict[str, Any]] = None
    sync_details: Optional[Dict[str, Any]] = None
