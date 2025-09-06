"""
数据同步API接口
提供手动触发数据同步和查看同步状态的功能
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from typing import Dict, Any, List
from datetime import datetime
from loguru import logger

from ....services.data_sync_service import DataSyncService
from ....services.smart_sync_service import SmartSyncService
from ....core.market_data.yahoo_provider import YahooFinanceProvider
from ....repositories.stock_repository import StockRepository
from ....repositories.kline_repository import KLineRepository

router = APIRouter()

# 创建服务实例
yahoo_provider = YahooFinanceProvider(rate_limit_delay=0.2)
stock_repository = StockRepository()
kline_repository = KLineRepository()
data_sync_service = DataSyncService(yahoo_provider, stock_repository, kline_repository)
smart_sync_service = SmartSyncService(yahoo_provider, stock_repository, kline_repository)


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
        
        # 创建数据同步任务
        task_type = "full" if force_full else "incremental"
        task_id = await data_sync_service.create_sync_task(
            task_type=task_type,
            force_full_sync=force_full
        )
        
        if run_in_background:
            # 后台运行
            background_tasks.add_task(
                data_sync_service.sync_all_watchlist_data, 
                force_full, 
                task_id
            )
            
            return {
                "success": True,
                "message": "数据同步任务已启动",
                "task_id": task_id,
                "sync_type": task_type,
                "mode": "background",
                "start_time": datetime.now().isoformat(),
                "status": "started"
            }
        else:
            # 前台运行（等待完成）
            sync_result = await data_sync_service.sync_all_watchlist_data(force_full, task_id)
            
            return {
                "success": True,
                "message": "数据同步完成",
                "task_id": task_id,
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
            "sync_status": { **status, "last_sync_time": data_sync_service.get_last_sync_time() },
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


@router.get("/sync/task/{task_id}")
async def get_task_status(task_id: str) -> Dict[str, Any]:
    """获取指定任务的状态"""
    try:
        task_status = await data_sync_service.get_task_status(task_id)
        
        if not task_status:
            raise HTTPException(
                status_code=404,
                detail=f"未找到任务: {task_id}"
            )
        
        return {
            "success": True,
            "data": task_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取任务状态失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"获取任务状态失败: {str(e)}"
        )


@router.get("/sync/tasks/running")
async def get_running_tasks() -> Dict[str, Any]:
    """获取正在运行的任务列表"""
    try:
        running_tasks = await data_sync_service.task_repository.get_running_tasks()
        
        tasks_data = []
        for task in running_tasks:
            tasks_data.append({
                "task_id": task.task_id,
                "status": task.status,
                "progress": task.progress,
                "total_stocks": task.total_stocks,
                "processed_stocks": task.processed_stocks,
                "success_stocks": task.success_stocks,
                "failed_stocks": task.failed_stocks,
                "task_type": task.task_type,
                "start_time": task.start_time.isoformat() if task.start_time else None,
                "created_at": task.created_at.isoformat() if task.created_at else None
            })
        
        return {
            "success": True,
            "data": tasks_data,
            "count": len(tasks_data)
        }
        
    except Exception as e:
        logger.error(f"获取运行中任务失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"获取运行中任务失败: {str(e)}"
        )


@router.get("/sync/tasks/recent")
async def get_recent_tasks(limit: int = Query(10, ge=1, le=50)) -> Dict[str, Any]:
    """获取最近的任务列表"""
    try:
        recent_tasks = await data_sync_service.task_repository.get_recent_tasks(limit)
        
        tasks_data = []
        for task in recent_tasks:
            tasks_data.append({
                "task_id": task.task_id,
                "status": task.status,
                "progress": task.progress,
                "total_stocks": task.total_stocks,
                "processed_stocks": task.processed_stocks,
                "success_stocks": task.success_stocks,
                "failed_stocks": task.failed_stocks,
                "daily_records": task.daily_records,
                "hourly_records": task.hourly_records,
                "task_type": task.task_type,
                "force_full_sync": task.force_full_sync,
                "start_time": task.start_time.isoformat() if task.start_time else None,
                "end_time": task.end_time.isoformat() if task.end_time else None,
                "duration_seconds": task.duration_seconds,
                "created_at": task.created_at.isoformat() if task.created_at else None
            })
        
        return {
            "success": True,
            "data": tasks_data,
            "count": len(tasks_data)
        }
        
    except Exception as e:
        logger.error(f"获取最近任务失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"获取最近任务失败: {str(e)}"
        )


@router.post("/sync/task/{task_id}/cancel")
async def cancel_task(task_id: str) -> Dict[str, Any]:
    """取消指定的数据同步任务"""
    try:
        success = await data_sync_service.task_repository.cancel_task(task_id)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"未找到任务或任务无法取消: {task_id}"
            )
        
        return {
            "success": True,
            "message": f"任务 {task_id} 已取消",
            "task_id": task_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"取消任务失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"取消任务失败: {str(e)}"
        )


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


# ==================== 智能同步API ====================

@router.post("/sync/smart")
async def trigger_smart_sync(
    background_tasks: BackgroundTasks,
    stock_codes: List[str] = Query(None, description="指定要同步的股票代码列表，为空则同步所有"),
    force_analysis: bool = Query(True, description="是否强制重新分析同步需求"),
    run_in_background: bool = Query(True, description="是否在后台运行")
) -> Dict[str, Any]:
    """
    触发智能数据同步
    
    智能同步会分析每个股票每个时间周期的数据缺口，只同步真正需要的数据。
    
    Args:
        stock_codes: 指定要同步的股票代码列表，为空则同步所有自选股
        force_analysis: 是否强制重新分析同步需求
        run_in_background: 是否在后台运行
    
    Returns:
        同步任务信息
    """
    try:
        logger.info(f"🚀 触发智能数据同步: stocks={stock_codes}, force_analysis={force_analysis}")
        
        # 检查是否正在同步
        if smart_sync_service.is_syncing:
            raise HTTPException(
                status_code=409,
                detail="智能同步正在进行中，请稍后再试"
            )
        
        if run_in_background:
            # 后台运行
            background_tasks.add_task(
                smart_sync_service.execute_smart_sync,
                stock_codes,
                force_analysis
            )
            
            return {
                "success": True,
                "message": "智能同步任务已启动",
                "sync_type": "smart_incremental",
                "mode": "background",
                "target_stocks": stock_codes or "all",
                "start_time": datetime.now().isoformat(),
                "status": "started"
            }
        else:
            # 前台运行（等待完成）
            sync_result = await smart_sync_service.execute_smart_sync(stock_codes, force_analysis)
            
            return {
                "success": True,
                "message": "智能同步完成",
                "sync_result": sync_result
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"触发智能同步失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"触发智能同步失败: {str(e)}"
        )


@router.get("/sync/smart/analyze")
async def analyze_sync_needs(
    stock_codes: List[str] = Query(None, description="指定要分析的股票代码列表，为空则分析所有")
) -> Dict[str, Any]:
    """
    分析数据同步需求
    
    分析每个股票每个时间周期的数据缺口，返回详细的同步计划。
    
    Args:
        stock_codes: 指定要分析的股票代码列表
    
    Returns:
        详细的同步需求分析结果
    """
    try:
        logger.info(f"🔍 分析同步需求: {stock_codes or 'all stocks'}")
        
        sync_plans = await smart_sync_service.analyze_sync_needs(stock_codes)
        
        # 统计信息
        total_stocks = len(sync_plans)
        stocks_need_sync = 0
        total_ranges = 0
        
        for stock_code, timeframe_plans in sync_plans.items():
            stock_needs_sync = False
            for timeframe, plan in timeframe_plans.items():
                if plan.needs_sync:
                    stock_needs_sync = True
                    total_ranges += len(plan.sync_ranges)
            
            if stock_needs_sync:
                stocks_need_sync += 1
        
        # 转换为可序列化的格式
        serializable_plans = {}
        for stock_code, timeframe_plans in sync_plans.items():
            serializable_plans[stock_code] = {}
            for timeframe, plan in timeframe_plans.items():
                serializable_plans[stock_code][timeframe] = {
                    "needs_sync": plan.needs_sync,
                    "reason": plan.reason,
                    "sync_ranges": [
                        {
                            "start_date": range.start_date.isoformat(),
                            "end_date": range.end_date.isoformat(),
                            "reason": range.reason
                        }
                        for range in plan.sync_ranges
                    ]
                }
        
        return {
            "success": True,
            "analysis_time": datetime.now().isoformat(),
            "summary": {
                "total_stocks": total_stocks,
                "stocks_need_sync": stocks_need_sync,
                "total_sync_ranges": total_ranges
            },
            "sync_plans": serializable_plans
        }
        
    except Exception as e:
        logger.error(f"分析同步需求失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"分析同步需求失败: {str(e)}"
        )


@router.get("/sync/smart/overview")
async def get_smart_sync_overview() -> Dict[str, Any]:
    """
    获取智能同步状态概览
    
    Returns:
        智能同步的整体状态信息
    """
    try:
        overview = await smart_sync_service.get_sync_overview()
        
        return {
            "success": True,
            "overview": overview,
            "current_time": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"获取智能同步概览失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"获取智能同步概览失败: {str(e)}"
        )


@router.post("/sync/smart/initialize")
async def initialize_sync_status() -> Dict[str, Any]:
    """
    初始化所有股票的同步状态
    
    为所有自选股创建同步状态记录，并更新边界信息。
    
    Returns:
        初始化结果
    """
    try:
        logger.info("🔧 初始化股票同步状态...")
        
        # 获取所有自选股
        stocks = await stock_repository.get_all_stocks()
        if not stocks:
            return {
                "success": True,
                "message": "自选股列表为空，无需初始化",
                "initialized_count": 0
            }
        
        stock_codes = [stock.code if hasattr(stock, 'code') else stock.symbol for stock in stocks]
        
        # 初始化同步状态
        success = await smart_sync_service.sync_status_repo.initialize_all_stocks(stock_codes)
        
        if success:
            return {
                "success": True,
                "message": f"成功初始化 {len(stock_codes)} 只股票的同步状态",
                "initialized_count": len(stock_codes),
                "stock_codes": stock_codes,
                "initialization_time": datetime.now().isoformat()
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="初始化同步状态失败"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"初始化同步状态失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"初始化同步状态失败: {str(e)}"
        )
