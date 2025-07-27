"""
数据同步API接口
提供手动触发数据同步和查看同步状态的功能
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from typing import Dict, Any
from datetime import datetime
from loguru import logger

from ....services.data_sync_service import DataSyncService
from ....core.market_data.yahoo_provider import YahooFinanceProvider
from ....repositories.memory_stock_repository import MemoryStockRepository
from ....repositories.memory_kline_repository import MemoryKLineRepository

router = APIRouter()

# 创建服务实例
yahoo_provider = YahooFinanceProvider(rate_limit_delay=0.2)
stock_repository = MemoryStockRepository()
kline_repository = MemoryKLineRepository()
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


@router.get("/sync/test")
async def test_sync_single_stock(
    symbol: str = Query(..., description="股票代码"),
    timeframe: str = Query("1d", description="时间周期")
) -> Dict[str, Any]:
    """测试单只股票数据同步"""
    try:
        logger.info(f"🧪 测试同步股票 {symbol} 数据")
        
        # 获取数据
        if timeframe == "1d":
            data = await yahoo_provider.get_stock_data(symbol, "30d", "1d")
        elif timeframe == "1h":
            data = await yahoo_provider.get_stock_data(symbol, "7d", "1h")
        else:
            raise HTTPException(status_code=400, detail="不支持的时间周期")
        
        if not data:
            return {
                "success": False,
                "message": f"未能获取股票 {symbol} 的数据"
            }
        
        # 保存数据
        saved_count = await data_sync_service._save_kline_data(symbol, data, timeframe)
        
        return {
            "success": True,
            "symbol": symbol,
            "timeframe": timeframe,
            "fetched_count": len(data),
            "saved_count": saved_count,
            "sample_data": {
                "first": {
                    "datetime": data[0].datetime.isoformat(),
                    "close": data[0].close
                } if data else None,
                "last": {
                    "datetime": data[-1].datetime.isoformat(),
                    "close": data[-1].close
                } if data else None
            },
            "test_time": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"测试同步失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"测试同步失败: {str(e)}"
        )


@router.get("/sync/schedule")
async def get_sync_schedule() -> Dict[str, Any]:
    """获取同步计划配置"""
    return {
        "success": True,
        "schedule_config": {
            "enabled": False,  # TODO: 从配置读取
            "daily_sync_time": "09:00",  # 每天9点同步
            "weekend_sync": False,  # 周末不同步
            "incremental_sync": True,  # 默认增量同步
            "full_sync_frequency": "weekly",  # 每周全量同步一次
        },
        "next_scheduled_sync": None,  # TODO: 计算下次同步时间
        "timezone": "Asia/Shanghai"
    }


@router.post("/sync/schedule")
async def update_sync_schedule(
    enabled: bool = Query(True, description="是否启用定时同步"),
    daily_time: str = Query("09:00", description="每日同步时间"),
    weekend_sync: bool = Query(False, description="是否周末同步")
) -> Dict[str, Any]:
    """更新同步计划配置"""
    # TODO: 实现定时任务配置
    return {
        "success": True,
        "message": "同步计划配置已更新",
        "config": {
            "enabled": enabled,
            "daily_sync_time": daily_time,
            "weekend_sync": weekend_sync,
            "updated_time": datetime.now().isoformat()
        }
    }
