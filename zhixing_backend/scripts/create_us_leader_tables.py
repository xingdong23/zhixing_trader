"""
创建美股龙头策略相关数据表
Create US Leader Strategy Tables
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine, text
from loguru import logger
from app.config import settings


def create_us_leader_tables():
    """创建美股龙头策略所需的数据表"""
    
    engine = create_engine(settings.database_url)
    
    logger.info("开始创建美股龙头策略数据表...")
    
    try:
        with engine.connect() as conn:
            # 1. 美股热点板块表
            logger.info("创建 us_sector_hotspot 表...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS us_sector_hotspot (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    date DATE NOT NULL,
                    sector_name VARCHAR(100) NOT NULL COMMENT '板块名称',
                    sector_type VARCHAR(50) COMMENT '类型:GICS/Concept/ETF',
                    
                    -- 热度评分
                    heat_score FLOAT COMMENT '热度分数0-100',
                    heat_rank INT COMMENT '热度排名',
                    heat_stage VARCHAR(20) COMMENT '阶段:新晋/持续/退潮',
                    
                    -- 板块指标
                    sector_return_1d FLOAT COMMENT '1日涨跌幅',
                    sector_return_5d FLOAT COMMENT '5日涨跌幅',
                    relative_strength FLOAT COMMENT '相对SPY强度',
                    volume_ratio FLOAT COMMENT '成交量倍数',
                    
                    -- 个股统计
                    total_stocks INT COMMENT '板块内股票总数',
                    gainers_count INT COMMENT '上涨股票数',
                    losers_count INT COMMENT '下跌股票数',
                    big_movers_count INT COMMENT '大涨股票数(>5%)',
                    
                    -- 持续性
                    consecutive_up_days INT COMMENT '连续上涨天数',
                    sector_age INT COMMENT '板块启动天数',
                    
                    -- 催化剂
                    main_catalyst VARCHAR(200) COMMENT '主要催化剂',
                    catalyst_type VARCHAR(50) COMMENT '催化剂类型',
                    catalyst_strength VARCHAR(20) COMMENT '强度:强/中/弱',
                    news_count INT COMMENT '相关新闻数',
                    
                    -- ETF表现
                    related_etf VARCHAR(20) COMMENT '相关ETF代码',
                    etf_return FLOAT COMMENT 'ETF涨跌幅',
                    etf_volume_ratio FLOAT COMMENT 'ETF成交量倍数',
                    
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    
                    INDEX idx_date_score (date, heat_score DESC),
                    INDEX idx_sector_date (sector_name, date),
                    INDEX idx_heat_rank (heat_rank),
                    UNIQUE KEY uk_date_sector (date, sector_name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='美股热点板块表'
            """))
            conn.commit()
            logger.info("✅ us_sector_hotspot 表创建成功")
            
            # 2. 美股龙头股表
            logger.info("创建 us_leading_stocks 表...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS us_leading_stocks (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    date DATE NOT NULL,
                    symbol VARCHAR(20) NOT NULL COMMENT '股票代码',
                    name VARCHAR(200) COMMENT '股票名称',
                    sector_name VARCHAR(100) COMMENT '所属板块',
                    
                    -- 龙头评分
                    leader_score FLOAT COMMENT '龙头分数0-100',
                    sector_rank INT COMMENT '板块内排名',
                    is_confirmed_leader BOOLEAN COMMENT '是否确认龙头',
                    
                    -- 生命周期
                    life_cycle VARCHAR(20) COMMENT '生命周期:Birth/Growth/Consolidation/Decline',
                    cycle_stage_days INT COMMENT '当前阶段天数',
                    days_since_sector_start INT COMMENT '距板块启动天数',
                    
                    -- 涨幅表现
                    return_1d FLOAT COMMENT '1日涨跌幅',
                    return_5d FLOAT COMMENT '5日涨跌幅',
                    return_since_start FLOAT COMMENT '累计涨幅',
                    max_return_since_start FLOAT COMMENT '最大涨幅',
                    current_drawdown FLOAT COMMENT '当前回撤',
                    
                    -- 技术形态
                    tech_pattern VARCHAR(50) COMMENT '技术形态',
                    pattern_score FLOAT COMMENT '形态分数',
                    support_level FLOAT COMMENT '支撑位',
                    resistance_level FLOAT COMMENT '阻力位',
                    
                    -- K线数据
                    open_price FLOAT,
                    high_price FLOAT,
                    low_price FLOAT,
                    close_price FLOAT,
                    volume BIGINT,
                    
                    -- 成交量指标
                    volume_ratio FLOAT COMMENT '量比(vs 20日均量)',
                    avg_volume_20d BIGINT COMMENT '20日平均成交量',
                    volume_trend VARCHAR(20) COMMENT '放量/缩量/平量',
                    
                    -- 均线
                    ma5 FLOAT,
                    ma10 FLOAT,
                    ma20 FLOAT,
                    above_ma20 BOOLEAN,
                    ma_pattern VARCHAR(50) COMMENT '多头/空头',
                    
                    -- 市值
                    market_cap FLOAT COMMENT '市值(亿美元)',
                    float_shares BIGINT COMMENT '流通股数',
                    shares_outstanding BIGINT COMMENT '总股本',
                    
                    -- 催化剂
                    catalyst_type VARCHAR(50) COMMENT 'FDA/Earnings/Product等',
                    catalyst_detail TEXT COMMENT '催化剂详情',
                    catalyst_score FLOAT COMMENT '催化剂评分',
                    
                    -- 盘前盘后
                    premarket_change FLOAT COMMENT '盘前涨跌幅',
                    afterhours_change FLOAT COMMENT '盘后涨跌幅',
                    
                    -- 期权数据
                    options_volume BIGINT COMMENT '期权成交量',
                    put_call_ratio FLOAT COMMENT 'Put/Call比率',
                    options_activity VARCHAR(20) COMMENT '活跃度:高/中/低',
                    
                    -- 机构持仓
                    institutional_ownership FLOAT COMMENT '机构持股比例',
                    institutional_change FLOAT COMMENT '机构持仓变化',
                    
                    -- 交易信号
                    trade_signal VARCHAR(10) COMMENT 'BUY/SELL/HOLD',
                    signal_strength VARCHAR(20) COMMENT '强/中/弱',
                    signal_reason TEXT COMMENT '信号理由',
                    confidence_level FLOAT COMMENT '置信度0-100',
                    
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    
                    INDEX idx_date_symbol (date, symbol),
                    INDEX idx_sector_rank (sector_name, date, sector_rank),
                    INDEX idx_leader_score (leader_score DESC),
                    INDEX idx_signal (date, trade_signal, signal_strength),
                    UNIQUE KEY uk_date_symbol (date, symbol)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='美股龙头股表'
            """))
            conn.commit()
            logger.info("✅ us_leading_stocks 表创建成功")
            
            # 3. 美股交易信号表
            logger.info("创建 us_trading_signals 表...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS us_trading_signals (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    signal_date DATE NOT NULL,
                    signal_time DATETIME NOT NULL,
                    symbol VARCHAR(20) NOT NULL COMMENT '股票代码',
                    sector_name VARCHAR(100) COMMENT '所属板块',
                    
                    -- 信号类型
                    signal_type VARCHAR(10) COMMENT 'BUY/SELL',
                    signal_strength VARCHAR(20) COMMENT '强/中/弱/试探',
                    priority INT COMMENT '优先级1-5',
                    
                    -- 信号依据
                    sector_heat_score FLOAT COMMENT '板块热度',
                    leader_score FLOAT COMMENT '龙头分数',
                    life_cycle VARCHAR(20) COMMENT '生命周期',
                    tech_pattern VARCHAR(50) COMMENT '技术形态',
                    catalyst_type VARCHAR(50) COMMENT '催化剂',
                    
                    -- 价格信息
                    signal_price FLOAT COMMENT '信号价格',
                    current_price FLOAT COMMENT '当前价格',
                    entry_price_low FLOAT COMMENT '建议入场价下限',
                    entry_price_high FLOAT COMMENT '建议入场价上限',
                    
                    -- 风险管理
                    stop_loss_price FLOAT COMMENT '止损价',
                    stop_loss_pct FLOAT COMMENT '止损幅度',
                    target_price_1 FLOAT COMMENT '第一目标价',
                    target_price_2 FLOAT COMMENT '第二目标价',
                    target_price_3 FLOAT COMMENT '第三目标价',
                    
                    -- 仓位建议
                    position_ratio FLOAT COMMENT '建议仓位比例',
                    max_position_size INT COMMENT '最大股数',
                    
                    -- 风险评估
                    risk_level VARCHAR(20) COMMENT '高/中/低',
                    risk_reward_ratio FLOAT COMMENT '风险收益比',
                    
                    -- 信号理由
                    reason TEXT COMMENT '详细理由',
                    key_points JSON COMMENT '关键要点',
                    
                    -- 信号状态
                    status VARCHAR(20) COMMENT 'active/executed/expired/cancelled',
                    executed_at DATETIME COMMENT '执行时间',
                    executed_price FLOAT COMMENT '执行价格',
                    
                    -- 结果跟踪
                    max_profit_pct FLOAT COMMENT '最大盈利',
                    final_profit_pct FLOAT COMMENT '最终盈利',
                    hold_days INT COMMENT '持仓天数',
                    
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    
                    INDEX idx_signal_date (signal_date DESC),
                    INDEX idx_symbol_date (symbol, signal_date),
                    INDEX idx_status (status),
                    INDEX idx_priority (priority, signal_date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='美股交易信号表'
            """))
            conn.commit()
            logger.info("✅ us_trading_signals 表创建成功")
            
            logger.info("=" * 60)
            logger.info("✅ 所有数据表创建成功！")
            logger.info("=" * 60)
            logger.info("创建的表：")
            logger.info("  1. us_sector_hotspot     - 美股热点板块表")
            logger.info("  2. us_leading_stocks     - 美股龙头股表")
            logger.info("  3. us_trading_signals    - 美股交易信号表")
            logger.info("=" * 60)
            
    except Exception as e:
        logger.error(f"创建数据表失败: {e}")
        raise


if __name__ == "__main__":
    create_us_leader_tables()

