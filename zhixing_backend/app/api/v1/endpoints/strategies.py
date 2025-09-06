"""
策略API端点
"""
from fastapi import APIRouter, HTTPException, Depends, Query
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
    """从数据库返回策略列表（不含任何Demo/硬编码）"""
    try:
        from ....database import db_service
        from ....models import StrategyDB
        import json

        records = db_service.get_all_strategies()
        strategies = []
        for s in records:
            strategies.append({
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "category": s.category,
                "impl_type": s.impl_type,
                "configuration": json.loads(s.configuration) if s.configuration else {},
                "timeframe": s.timeframe,
                "enabled": s.enabled,
                "is_system_default": s.is_system_default,
                "execution_count": s.execution_count,
                "last_execution_time": s.last_execution_time.isoformat() if s.last_execution_time else None,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            })

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


## 禁用通过接口创建策略，策略需在代码与数据库中定义


@router.post("/{strategy_id}/execute")
async def execute_strategy(strategy_id: int, strategy_service: StrategyService = Depends(get_strategy_service)) -> Dict[str, Any]:
    """执行策略（从已注册的实现运行）"""
    try:
        logger.info(f"执行策略 {strategy_id}")
        results = await strategy_service.execute_strategy(strategy_id)

        formatted = [
            {
                "stock_symbol": r.stock_symbol,
                "score": r.score,
                "confidence": r.confidence,
                "reasons": r.reasons,
                "suggested_action": r.suggested_action,
                "target_price": r.target_price,
                "stop_loss": r.stop_loss,
                "current_price": r.current_price,
                "technical_details": r.technical_details,
                "risk_level": r.risk_level,
            }
            for r in results
        ]

        return {
            "success": True,
            "data": formatted,
            "message": f"策略执行完成，筛选出 {len(formatted)} 只股票"
        }

    except Exception as e:
        logger.exception(f"执行策略失败: {e}")
        raise HTTPException(status_code=500, detail=f"执行策略失败: {str(e)}")


@router.post("/{strategy_id}/execute-async")
async def execute_strategy_async(strategy_id: int, strategy_service: StrategyService = Depends(get_strategy_service)) -> Dict[str, Any]:
    """异步执行策略，返回 task_id 供前端轮询进度"""
    try:
        task_id = await strategy_service.execute_strategy_async(strategy_id)
        return { "success": True, "data": { "task_id": task_id }, "message": "任务已启动" }
    except Exception as e:
        logger.exception(f"异步执行策略失败: {e}")
        raise HTTPException(status_code=500, detail=f"异步执行策略失败: {str(e)}")


@router.get("/exec/status")
async def get_exec_status(task_id: str = Query(...), strategy_service: StrategyService = Depends(get_strategy_service)) -> Dict[str, Any]:
    try:
        status = strategy_service.get_task_status(task_id)
        return { "success": True, "data": status }
    except Exception as e:
        logger.error(f"获取策略任务状态失败: {e}")
        raise HTTPException(status_code=500, detail="获取策略任务状态失败")


@router.get("/exec/last-status")
async def get_last_exec_status(strategy_id: int = Query(...), strategy_service: StrategyService = Depends(get_strategy_service)) -> Dict[str, Any]:
    try:
        status = strategy_service.get_last_task_status(strategy_id)
        return { "success": True, "data": status }
    except Exception as e:
        logger.error(f"获取策略最近任务状态失败: {e}")
        raise HTTPException(status_code=500, detail="获取策略最近任务状态失败")


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
