#!/usr/bin/env python3
"""
初始化默认策略数据
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import db_service
from app.models import StrategyDB
import json
from datetime import datetime

def init_default_strategies():
    """初始化默认策略数据"""
    
    default_strategies = [
        {
            "name": "EMA55回踩企稳策略",
            "description": "主升浪回踩EMA55不破，1小时级别企稳，适合中短线操作",
            "category": "回调买入",
            "impl_type": "ema55_pullback",
            "configuration": json.dumps({
                "ema_period": 55,
                "pullback_threshold": 0.03,
                "volume_threshold": 1.2,
                "min_price": 5.0,
                "max_price": 500.0
            }),
            "timeframe": "1h",
            "enabled": True,
            "is_system_default": True,
            "execution_count": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "均线缠绕突破策略",
            "description": "多条均线缠绕后向上突破，回踩不破均线支撑",
            "category": "形态策略",
            "impl_type": "ma_entanglement",
            "configuration": json.dumps({
                "ma_periods": [20, 50, 120],
                "entanglement_range": 0.02,
                "breakout_volume": 1.5,
                "confirmation_candles": 3
            }),
            "timeframe": "1d",
            "enabled": True,
            "is_system_default": True,
            "execution_count": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "龙头战法",
            "description": "专注于各行业龙头股票，在技术面突破时进行买入操作",
            "category": "龙头策略",
            "impl_type": "leader_strategy",
            "configuration": json.dumps({
                "market_cap_min": 10000000000,  # 100亿市值以上
                "industry_rank": 3,  # 行业前3
                "rsi_range": [30, 70],
                "volume_surge": 1.8
            }),
            "timeframe": "1d",
            "enabled": True,
            "is_system_default": True,
            "execution_count": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "动量追踪策略",
            "description": "跟踪市场动量，在趋势确立后进行追涨操作",
            "category": "动量策略",
            "impl_type": "momentum_strategy",
            "configuration": json.dumps({
                "momentum_period": 20,
                "rsi_threshold": 60,
                "macd_signal": "bullish",
                "volume_confirmation": True
            }),
            "timeframe": "1d",
            "enabled": False,  # 默认禁用，风险较高
            "is_system_default": True,
            "execution_count": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "低位反转策略",
            "description": "寻找超跌反弹机会，适合熊市或震荡市使用",
            "category": "反转策略",
            "impl_type": "reversal_strategy",
            "configuration": json.dumps({
                "oversold_rsi": 25,
                "price_drop_threshold": 0.15,
                "support_level_test": 3,
                "volume_divergence": True
            }),
            "timeframe": "1d",
            "enabled": False,  # 默认禁用，需要谨慎使用
            "is_system_default": True,
            "execution_count": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    created_count = 0
    for strategy_data in default_strategies:
        try:
            # 检查是否已存在同名策略
            existing = None
            with db_service.get_session() as session:
                existing = session.query(StrategyDB).filter(
                    StrategyDB.name == strategy_data["name"]
                ).first()
            
            if existing:
                print(f"⚠️  策略 '{strategy_data['name']}' 已存在，跳过")
                continue
            
            # 创建新策略
            strategy_id = db_service.create_strategy(strategy_data)
            if strategy_id:
                created_count += 1
                print(f"✅ 创建策略: {strategy_data['name']} (ID: {strategy_id})")
            else:
                print(f"❌ 创建策略失败: {strategy_data['name']}")
                
        except Exception as e:
            print(f"❌ 创建策略 '{strategy_data['name']}' 时出错: {e}")
    
    print(f"\n🎉 初始化完成，共创建 {created_count} 个策略")
    
    # 显示所有策略
    all_strategies = db_service.get_all_strategies()
    print(f"\n📊 当前数据库中共有 {len(all_strategies)} 个策略:")
    for s in all_strategies:
        status = "✅ 启用" if s.enabled else "❌ 禁用"
        print(f"  - {s.name} ({s.category}) {status}")

if __name__ == "__main__":
    print("🚀 开始初始化默认策略...")
    init_default_strategies()
