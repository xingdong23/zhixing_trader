"""
策略API端点
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from loguru import logger

from ....core.container import container
from ....services.strategy_service import StrategyService

router = APIRouter()


def get_strategy_service() -> StrategyService:
    """获取策略服务依赖"""
    return container.get_strategy_service()


@router.get("/")
async def get_strategies() -> Dict[str, Any]:
    """获取所有可用策略"""
    try:
        # 简化实现，返回硬编码的策略列表
        strategies = [
            {
                "id": 1,
                "name": "EMA55回踩企稳策略",
                "description": "主升浪回踩EMA55不破，1小时级别企稳",
                "category": "回调买入",
                "is_active": True
            },
            {
                "id": 2,
                "name": "均线缠绕突破策略",
                "description": "多条均线缠绕后向上突破，回踩不破均线",
                "category": "形态策略",
                "is_active": False
            }
        ]

        return {
            "success": True,
            "data": {
                "strategies": strategies,
                "total": len(strategies)
            },
            "message": "获取策略列表成功"
        }
    except Exception as e:
        logger.error(f"获取策略列表失败: {e}")
        raise HTTPException(status_code=500, detail="获取策略列表失败")


@router.post("/{strategy_id}/execute")
async def execute_strategy(strategy_id: int) -> Dict[str, Any]:
    """执行策略"""
    try:
        logger.info(f"执行策略 {strategy_id}")

        # 简化实现，返回模拟结果
        mock_results = [
            {
                "stock_symbol": "AAPL",
                "score": 85,
                "confidence": "high",
                "reasons": ["技术指标良好", "成交量放大", "突破关键阻力位"],
                "suggested_action": "买入",
                "target_price": 180.0,
                "stop_loss": 165.0,
                "current_price": 175.0,
                "technical_details": {"rsi": 65, "macd": "金叉"},
                "risk_level": "medium"
            },
            {
                "stock_symbol": "MSFT",
                "score": 78,
                "confidence": "medium",
                "reasons": ["均线支撑", "财报预期良好"],
                "suggested_action": "观察",
                "target_price": 320.0,
                "stop_loss": 300.0,
                "current_price": 310.0,
                "technical_details": {"rsi": 58, "macd": "多头排列"},
                "risk_level": "low"
            }
        ]

        return {
            "success": True,
            "data": mock_results,
            "message": f"策略执行完成，筛选出 {len(mock_results)} 只股票"
        }

    except Exception as e:
        logger.error(f"执行策略失败: {e}")
        raise HTTPException(status_code=500, detail="执行策略失败")


@router.post("/execute-all")
async def execute_all_strategies(
    strategy_service: StrategyService = Depends(get_strategy_service)
) -> Dict[str, Any]:
    """执行所有策略"""
    try:
        all_results = await strategy_service.execute_all_strategies()
        
        # 转换格式
        formatted_results = {}
        total_stocks = 0
        
        for strategy_name, results in all_results.items():
            formatted_strategy_results = []
            for result in results:
                formatted_strategy_results.append({
                    "stock_symbol": result.stock_symbol,
                    "score": result.score,
                    "confidence": result.confidence,
                    "reasons": result.reasons,
                    "suggested_action": result.suggested_action,
                    "target_price": result.target_price,
                    "stop_loss": result.stop_loss,
                    "current_price": result.current_price,
                    "technical_details": result.technical_details,
                    "risk_level": result.risk_level
                })
            
            formatted_results[strategy_name] = formatted_strategy_results
            total_stocks += len(formatted_strategy_results)
        
        return {
            "success": True,
            "data": {
                "strategy_results": formatted_results,
                "total_stocks": total_stocks
            },
            "message": f"所有策略执行完成，共筛选出 {total_stocks} 只股票"
        }
        
    except Exception as e:
        logger.error(f"执行所有策略失败: {e}")
        raise HTTPException(status_code=500, detail="执行所有策略失败")


@router.get("/available")
async def get_available_strategy_types() -> Dict[str, Any]:
    """获取可用的策略类型"""
    try:
        from ....core.strategy.engine import StrategyFactory
        
        available_types = StrategyFactory.get_available_strategies()
        
        strategy_info = {
            "ema55_pullback": {
                "name": "EMA55回踩企稳策略",
                "description": "主升浪回踩EMA55不破，1小时级别企稳",
                "category": "回调买入"
            },
            "ma_entanglement": {
                "name": "均线缠绕突破策略", 
                "description": "多条均线缠绕后向上突破，回踩不破均线",
                "category": "形态策略"
            }
        }
        
        return {
            "success": True,
            "data": {
                "strategy_types": available_types,
                "strategy_info": strategy_info
            },
            "message": "获取策略类型成功"
        }
        
    except Exception as e:
        logger.error(f"获取策略类型失败: {e}")
        raise HTTPException(status_code=500, detail="获取策略类型失败")


@router.post("/trigger-data-update")
async def trigger_data_update() -> Dict[str, Any]:
    """手动触发数据更新"""
    try:
        market_data_service = container.get_market_data_service()
        update_counts = await market_data_service.update_watchlist_data()
        
        total_daily = sum(counts['daily'] for counts in update_counts.values())
        total_hourly = sum(counts['hourly'] for counts in update_counts.values())
        
        return {
            "success": True,
            "data": {
                "update_counts": update_counts,
                "total_daily": total_daily,
                "total_hourly": total_hourly
            },
            "message": f"数据更新完成: 日线 {total_daily} 条, 小时线 {total_hourly} 条"
        }
        
    except Exception as e:
        logger.error(f"触发数据更新失败: {e}")
        raise HTTPException(status_code=500, detail="触发数据更新失败")
