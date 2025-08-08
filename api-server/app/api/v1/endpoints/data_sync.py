"""
数据同步API接口
提供手动触发数据同步和查看同步状态的功能
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from typing import Dict, Any, List
from datetime import datetime
from loguru import logger

from ....services.data_sync_service import DataSyncService
from ....core.market_data.yahoo_provider import YahooFinanceProvider
from ....repositories.stock_repository import StockRepository
from ....repositories.kline_repository import KLineRepository

router = APIRouter()

# 创建服务实例
yahoo_provider = YahooFinanceProvider(rate_limit_delay=0.2)
stock_repository = StockRepository()
kline_repository = KLineRepository()
data_sync_service = DataSyncService(yahoo_provider, stock_repository, kline_repository)


@router.post("/sync/trigger")
async def trigger_data_sync(
    background_tasks: BackgroundTasks,
    force_full: bool = Query(False, description="是否强制全量同步"),
    run_in_background: bool = Query(True, description="是否在后台运行")
) -> Dict[str, Any]:
    """
    手动触发数据同步
    
    Args:
        force_full: 是否强制全量同步（否则增量同步）
        run_in_background: 是否在后台运行
    
    Returns:
        同步任务信息
    """
    try:
        logger.info(f"🚀 手动触发数据同步: force_full={force_full}, background={run_in_background}")
        
        # 检查是否正在同步
        if data_sync_service.is_syncing:
            raise HTTPException(
                status_code=409,
                detail="数据同步正在进行中，请稍后再试"
            )
        
        if run_in_background:
            # 后台运行
            background_tasks.add_task(data_sync_service.sync_all_watchlist_data, force_full)
            
            return {
                "success": True,
                "message": "数据同步任务已启动",
                "sync_type": "full" if force_full else "incremental",
                "mode": "background",
                "start_time": datetime.now().isoformat(),
                "status": "started"
            }
        else:
            # 前台运行（等待完成）
            sync_result = await data_sync_service.sync_all_watchlist_data(force_full)
            
            return {
                "success": True,
                "message": "数据同步完成",
                "sync_result": sync_result
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"触发数据同步失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"触发数据同步失败: {str(e)}"
        )


@router.get("/sync/status")
async def get_sync_status() -> Dict[str, Any]:
    """获取数据同步状态"""
    try:
        status = await data_sync_service.get_sync_status()
        
        # 获取自选股数量
        stocks = await stock_repository.get_all_stocks()
        stock_count = len(stocks) if stocks else 0
        
        # 获取K线数据统计
        kline_stats = await kline_repository.get_data_statistics()
        
        return {
            "success": True,
            "sync_status": status,
            "watchlist_count": stock_count,
            "data_statistics": kline_stats,
            "current_time": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"获取同步状态失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"获取同步状态失败: {str(e)}"
        )


@router.post("/sync/cleanup")
async def cleanup_old_data(
    days_to_keep: int = Query(90, description="保留数据的天数", ge=7, le=365)
) -> Dict[str, Any]:
    """清理过期数据"""
    try:
        logger.info(f"🧹 开始清理过期数据，保留最近 {days_to_keep} 天")
        
        deleted_count = await data_sync_service.cleanup_old_data(days_to_keep)
        
        return {
            "success": True,
            "message": f"清理完成，删除了 {deleted_count} 条过期数据",
            "deleted_count": deleted_count,
            "days_kept": days_to_keep,
            "cleanup_time": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"清理过期数据失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"清理过期数据失败: {str(e)}"
        )


## 删除测试接口，保持整洁


## 删除计划配置接口，待未来引入调度器后再实现

@router.get("/sync/last-result")
async def get_last_sync_result() -> Dict[str, Any]:
    try:
        return {"success": True, "data": data_sync_service.get_last_result()}
    except Exception as e:
        logger.error(f"获取最近一次同步结果失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取失败: {str(e)}")


@router.post("/sync/retry-failed")
async def retry_failed_symbols(background_tasks: BackgroundTasks, force_full: bool = Query(False)) -> Dict[str, Any]:
    try:
        last = data_sync_service.get_last_result()
        failed_symbols: List[str] = []
        details = (last or {}).get("details", {})
        for sym, info in details.items():
            if not info.get("success"):
                failed_symbols.append(sym)
        if not failed_symbols:
            return {"success": True, "message": "无失败股票可重试", "data": {"failed_symbols": []}}

        # 后台重试
        background_tasks.add_task(data_sync_service.sync_specific_symbols, failed_symbols, force_full)
        return {"success": True, "message": "已发起失败重试", "data": {"failed_symbols": failed_symbols}}
    except Exception as e:
        logger.error(f"重试失败股票触发失败: {e}")
        raise HTTPException(status_code=500, detail=f"重试触发失败: {str(e)}")
