"""
初始化示例数据脚本
将本地示例数据导入到数据库中
"""
import sys
import os
from datetime import datetime
from loguru import logger

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ..database import db_service
from app.models import (
    ExpertDB, ExpertOpinionDB, TradingPlaybookDB, 
    SelectionStrategyDB, ConceptDB, ConceptStockRelationDB, StockDB
)


def init_experts():
    """初始化专家数据"""
    logger.info("开始初始化专家数据...")
    
    sample_experts = [
        {
            "expert_id": "expert_1",
            "name": "巴菲特",
            "title": "股神·价值投资大师",
            "credibility": 95,
            "specialties": ["价值投资", "长期投资", "基本面分析"],
            "description": "伯克希尔·哈撒韦公司CEO，全球最成功的价值投资者之一",
            "is_verified": True
        },
        {
            "expert_id": "expert_2",
            "name": "段永平",
            "title": "步步高创始人·投资家",
            "credibility": 90,
            "specialties": ["价值投资", "消费股", "科技股"],
            "description": "步步高、OPPO、vivo创始人，网易、苹果等重仓投资者",
            "is_verified": True
        },
        {
            "expert_id": "expert_3",
            "name": "张磊",
            "title": "高瓴资本创始人",
            "credibility": 88,
            "specialties": ["成长投资", "科技股", "医疗健康"],
            "description": "高瓴资本创始人兼CEO，专注长期价值投资",
            "is_verified": True
        },
        {
            "expert_id": "expert_4",
            "name": "林园",
            "title": "私募基金经理",
            "credibility": 82,
            "specialties": ["医药股", "消费股", "价值投资"],
            "description": "知名私募基金经理，擅长医药和消费领域投资",
            "is_verified": True
        }
    ]
    
    with db_service.get_session() as session:
        for expert_data in sample_experts:
            # 检查是否已存在
            existing = session.query(ExpertDB).filter(
                ExpertDB.expert_id == expert_data["expert_id"]
            ).first()
            
            if not existing:
                expert_db = ExpertDB(
                    expert_id=expert_data["expert_id"],
                    name=expert_data["name"],
                    title=expert_data["title"],
                    credibility=expert_data["credibility"],
                    specialties=str(expert_data["specialties"]),
                    description=expert_data["description"],
                    is_verified=expert_data["is_verified"],
                    is_active=True
                )
                session.add(expert_db)
                logger.info(f"添加专家: {expert_data['name']}")
            else:
                logger.info(f"专家已存在: {expert_data['name']}")
        
        session.commit()
    
    logger.info("专家数据初始化完成")


def init_playbooks():
    """初始化交易剧本数据"""
    logger.info("开始初始化交易剧本数据...")
    
    sample_playbooks = [
        {
            "playbook_id": "default_playbook_1",
            "name": "回踩多头排列",
            "description": "股价在多头排列的均线系统中出现短期回调，触及关键支撑位后重新向上的经典买入机会",
            "template": {
                "buyingLogicTemplate": {
                    "technical": "1. 股价处于多头排列状态（5日>10日>20日>60日均线）\n2. 股价回踩至关键均线获得支撑\n3. 成交量在回踩过程中萎缩，反弹时放量\n4. MACD在零轴上方或即将金叉\n5. RSI在30-50区间，未进入超卖",
                    "fundamental": "1. 公司基本面良好，无重大负面消息\n2. 行业景气度较高或处于上升周期\n3. 财务指标健康，现金流稳定\n4. 市盈率处于合理区间",
                    "news": "1. 无重大利空消息\n2. 市场整体情绪稳定或偏乐观\n3. 相关政策环境友好\n4. 行业内无系统性风险"
                },
                "riskManagementTemplate": {
                    "stopLossRatio": 0.08,
                    "takeProfitRatio": 0.20
                },
                "recommendedEmotion": "CONFIDENT",
                "recommendedSource": "SELF_ANALYSIS"
            },
            "tags": ["技术分析", "趋势跟踪", "均线系统", "中短线"],
            "is_system_default": True
        },
        {
            "playbook_id": "default_playbook_2",
            "name": "突破平台整理",
            "description": "股价经过一段时间的横盘整理后，向上突破平台阻力位的买入机会",
            "template": {
                "buyingLogicTemplate": {
                    "technical": "1. 股价经过至少3周的横盘整理\n2. 整理期间成交量逐步萎缩\n3. 突破时成交量明显放大（至少是前期平均量的2倍）\n4. 突破后股价站稳平台上沿\n5. 技术指标配合（如MACD金叉、RSI突破50）",
                    "fundamental": "1. 整理期间基本面保持稳定或改善\n2. 无重大利空因素\n3. 行业景气度良好",
                    "news": "1. 可能有催化剂事件（如业绩预告、政策利好等）\n2. 市场情绪积极\n3. 资金面宽松"
                },
                "riskManagementTemplate": {
                    "stopLossRatio": 0.10,
                    "takeProfitRatio": 0.25
                },
                "recommendedEmotion": "CONFIDENT",
                "recommendedSource": "SELF_ANALYSIS"
            },
            "tags": ["突破", "平台整理", "放量", "中长线"],
            "is_system_default": True
        }
    ]
    
    with db_service.get_session() as session:
        for playbook_data in sample_playbooks:
            # 检查是否已存在
            existing = session.query(TradingPlaybookDB).filter(
                TradingPlaybookDB.playbook_id == playbook_data["playbook_id"]
            ).first()
            
            if not existing:
                playbook_db = TradingPlaybookDB(
                    playbook_id=playbook_data["playbook_id"],
                    name=playbook_data["name"],
                    description=playbook_data["description"],
                    template=str(playbook_data["template"]),
                    tags=str(playbook_data["tags"]),
                    is_system_default=playbook_data["is_system_default"],
                    is_active=True,
                    usage_count=0,
                    performance=str({})
                )
                session.add(playbook_db)
                logger.info(f"添加交易剧本: {playbook_data['name']}")
            else:
                logger.info(f"交易剧本已存在: {playbook_data['name']}")
        
        session.commit()
    
    logger.info("交易剧本数据初始化完成")


def init_selection_strategies():
    """初始化选股策略数据"""
    logger.info("开始初始化选股策略数据...")
    
    sample_strategies = [
        {
            "strategy_id": "ema55_strategy_1",
            "name": "EMA55回踩企稳策略",
            "description": "主升浪后回踩EMA55不破，1小时级别企稳确认",
            "category": "pullback",
            "conditions": {
                "technical": [
                    {
                        "type": "indicator",
                        "parameter": "main_uptrend",
                        "operator": ">=",
                        "value": 20,
                        "description": "前期主升浪涨幅超过20%"
                    },
                    {
                        "type": "moving_average",
                        "parameter": "ema55_support",
                        "operator": ">=",
                        "value": 0.97,
                        "description": "回踩EMA55不破（3%容错）"
                    },
                    {
                        "type": "pattern",
                        "parameter": "hourly_stabilization",
                        "operator": "=",
                        "value": 1,
                        "description": "1小时级别出现企稳信号"
                    },
                    {
                        "type": "volume",
                        "parameter": "pullback_volume_shrink",
                        "operator": "<=",
                        "value": 0.8,
                        "description": "回踩过程成交量萎缩"
                    }
                ],
                "fundamental": [],
                "price": []
            },
            "parameters": {
                "timeframe": "1h",
                "volumeThreshold": 0.8,
                "priceChangeThreshold": -8.0,
                "stabilizationHours": 4,
                "emaLength": 55
            },
            "is_system_default": True
        }
    ]
    
    with db_service.get_session() as session:
        for strategy_data in sample_strategies:
            # 检查是否已存在
            existing = session.query(SelectionStrategyDB).filter(
                SelectionStrategyDB.strategy_id == strategy_data["strategy_id"]
            ).first()
            
            if not existing:
                strategy_db = SelectionStrategyDB(
                    strategy_id=strategy_data["strategy_id"],
                    name=strategy_data["name"],
                    description=strategy_data["description"],
                    category=strategy_data["category"],
                    conditions=str(strategy_data["conditions"]),
                    parameters=str(strategy_data["parameters"]),
                    is_active=True,
                    is_system_default=strategy_data["is_system_default"],
                    usage_count=0,
                    success_rate=0.0
                )
                session.add(strategy_db)
                logger.info(f"添加选股策略: {strategy_data['name']}")
            else:
                logger.info(f"选股策略已存在: {strategy_data['name']}")
        
        session.commit()
    
    logger.info("选股策略数据初始化完成")


def init_sample_concepts():
    """初始化示例概念数据"""
    logger.info("开始初始化示例概念数据...")
    
    sample_concepts = [
        {"name": "新能源汽车", "description": "电动汽车、混合动力汽车等新能源汽车相关公司", "category": "行业"},
        {"name": "人工智能", "description": "AI技术、机器学习、深度学习相关公司", "category": "技术"},
        {"name": "芯片半导体", "description": "半导体设计、制造、设备相关公司", "category": "行业"},
        {"name": "云计算", "description": "云服务、云基础设施相关公司", "category": "技术"},
        {"name": "生物医药", "description": "生物技术、制药、医疗设备公司", "category": "行业"}
    ]
    
    with db_service.get_session() as session:
        for concept_data in sample_concepts:
            # 检查是否已存在
            existing = session.query(ConceptDB).filter(
                ConceptDB.name == concept_data["name"]
            ).first()
            
            if not existing:
                concept_id = f"concept_{concept_data['name'].lower().replace(' ', '_')}_{int(datetime.now().timestamp())}"
                concept_db = ConceptDB(
                    concept_id=concept_id,
                    name=concept_data["name"],
                    description=concept_data["description"],
                    category=concept_data["category"],
                    stock_count=0,
                    is_active=True
                )
                session.add(concept_db)
                logger.info(f"添加概念: {concept_data['name']}")
            else:
                logger.info(f"概念已存在: {concept_data['name']}")
        
        session.commit()
    
    logger.info("示例概念数据初始化完成")


def main():
    """主函数"""
    logger.info("开始初始化示例数据...")
    
    try:
        # 确保数据库表已创建
        db_service.create_tables()
        
        # 初始化各类数据
        init_experts()
        init_playbooks()
        init_selection_strategies()
        init_sample_concepts()
        
        logger.info("所有示例数据初始化完成！")
        
    except Exception as e:
        logger.error(f"初始化示例数据失败: {e}")
        raise


if __name__ == "__main__":
    main()
