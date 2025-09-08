"""
数据同步服务
负责定时同步自选股的K线数据到本地数据库
"""
import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from loguru import logger

from ..core.interfaces import (
    IMarketDataProvider, IStockRepository, IKLineRepository, KLineData
)
from ..repositories.data_sync_task_repository import DataSyncTaskRepository


class DataSyncService:
    """数据同步服务"""
    
    def __init__(
        self,
        market_data_provider: IMarketDataProvider,
        stock_repository: IStockRepository,
        kline_repository: IKLineRepository
    ):
        self.market_data_provider = market_data_provider
        self.stock_repository = stock_repository
        self.kline_repository = kline_repository
        self.task_repository = DataSyncTaskRepository()
        self.is_syncing = False
        # 最近一次同步结果（内存保存，便于前端查看失败详情/重试）
        self._last_result: Optional[Dict[str, any]] = None
        self._last_sync_time: Optional[datetime] = None
        self._current_task_id: Optional[str] = None
    
    async def sync_all_watchlist_data(
        self, 
        force_full_sync: bool = False,
        task_id: Optional[str] = None
    ) -> Dict[str, any]:
        """
        同步所有自选股数据
        
        Args:
            force_full_sync: 是否强制全量同步（否则增量同步）
            task_id: 任务ID，如果提供则更新任务状态
        
        Returns:
            同步结果统计
        """
        if self.is_syncing:
            logger.warning("数据同步正在进行中，跳过本次同步")
            return {"status": "skipped", "reason": "sync_in_progress"}
        
        self.is_syncing = True
        self._current_task_id = task_id
        sync_start_time = datetime.now()
        
        # 如果有任务ID，更新任务状态为运行中
        if task_id:
            await self.task_repository.update_task(
                task_id, 
                status='running',
                progress=0.0
            )
        
        try:
            logger.info("🔄 开始同步自选股数据...")
            
            # 1. 获取自选股列表
            stocks = await self.stock_repository.get_all_stocks()
            if not stocks:
                logger.warning("自选股列表为空，无需同步")
                result = {"status": "skipped", "reason": "no_stocks"}
                
                if task_id:
                    await self.task_repository.update_task(
                        task_id,
                        status='completed',
                        end_time=datetime.now(),
                        result_summary=result
                    )
                
                return result
            
            symbols = [stock.code if hasattr(stock, 'code') else stock.symbol for stock in stocks]
            logger.info(f"📊 找到 {len(symbols)} 只自选股需要同步: {', '.join(symbols)}")
            
            # 设置任务总股票数量
            if task_id:
                await self.task_repository.set_task_total_stocks(task_id, len(symbols))
            
            # 2. 同步结果统计
            sync_results = {
                "total_stocks": len(symbols),
                "success_stocks": 0,
                "failed_stocks": 0,
                "daily_records": 0,
                "hourly_records": 0,
                "sync_type": "full" if force_full_sync else "incremental",
                "start_time": sync_start_time.isoformat(),
                "details": {}
            }
            
            # 3. 逐个同步股票数据
            for i, symbol in enumerate(symbols):
                try:
                    stock_result = await self._sync_single_stock(symbol, force_full_sync)
                    sync_results["details"][symbol] = stock_result
                    
                    success = stock_result["success"]
                    daily_count = stock_result.get("daily_count", 0)
                    hourly_count = stock_result.get("hourly_count", 0)
                    
                    if success:
                        sync_results["success_stocks"] += 1
                        sync_results["daily_records"] += daily_count
                        sync_results["hourly_records"] += hourly_count
                    else:
                        sync_results["failed_stocks"] += 1
                    
                    # 更新任务进度
                    if task_id:
                        await self.task_repository.increment_processed_stocks(
                            task_id, 
                            success=success,
                            daily_count=daily_count,
                            hourly_count=hourly_count
                        )
                    
                    # 避免API限制，添加延迟
                    await asyncio.sleep(0.2)
                    
                except Exception as e:
                    logger.error(f"同步股票 {symbol} 失败: {e}")
                    sync_results["failed_stocks"] += 1
                    sync_results["details"][symbol] = {
                        "success": False,
                        "error": str(e),
                        "daily_count": 0,
                        "hourly_count": 0
                    }
                    
                    # 更新任务进度（失败）
                    if task_id:
                        await self.task_repository.increment_processed_stocks(
                            task_id, 
                            success=False
                        )
            
            # 4. 完成统计
            sync_end_time = datetime.now()
            sync_duration = (sync_end_time - sync_start_time).total_seconds()
            
            sync_results.update({
                "status": "completed",
                "end_time": sync_end_time.isoformat(),
                "duration_seconds": round(sync_duration, 2),
                "success_rate": round(sync_results["success_stocks"] / len(symbols) * 100, 1) if symbols else 0
            })
            
            # 更新任务完成状态
            if task_id:
                await self.task_repository.update_task(
                    task_id,
                    status='completed',
                    progress=100.0,
                    end_time=sync_end_time,
                    duration_seconds=sync_duration,
                    result_summary=sync_results,
                    sync_details=sync_results["details"]
                )
            
            logger.info(f"✅ 数据同步完成: {sync_results['success_stocks']}/{len(symbols)} 成功, "
                       f"日线 {sync_results['daily_records']} 条, "
                       f"小时线 {sync_results['hourly_records']} 条, "
                       f"耗时 {sync_duration:.1f}秒")
            
            # 保存最后一次结果
            self._last_result = sync_results
            self._last_sync_time = sync_end_time
            return sync_results
            
        except Exception as e:
            logger.error(f"数据同步失败: {e}")
            error_result = {
                "status": "failed",
                "error": str(e),
                "end_time": datetime.now().isoformat()
            }
            
            # 更新任务失败状态
            if task_id:
                await self.task_repository.update_task(
                    task_id,
                    status='failed',
                    end_time=datetime.now(),
                    error_details={"error": str(e)}
                )
            
            self._last_result = error_result
            self._last_sync_time = datetime.now()
            return self._last_result
        
        finally:
            self.is_syncing = False
            self._current_task_id = None

    async def sync_specific_symbols(self, symbols: List[str], force_full_sync: bool = False) -> Dict[str, any]:
        """只同步指定股票清单（用于重试失败项）"""
        if self.is_syncing:
            return {"status": "skipped", "reason": "sync_in_progress"}

        self.is_syncing = True
        sync_start_time = datetime.now()
        try:
            results = {
                "total_stocks": len(symbols),
                "success_stocks": 0,
                "failed_stocks": 0,
                "daily_records": 0,
                "hourly_records": 0,
                "sync_type": "full" if force_full_sync else "incremental",
                "start_time": sync_start_time.isoformat(),
                "details": {},
            }
            for symbol in symbols:
                try:
                    stock_result = await self._sync_single_stock(symbol, force_full_sync)
                    results["details"][symbol] = stock_result
                    if stock_result.get("success"):
                        results["success_stocks"] += 1
                        results["daily_records"] += stock_result.get("daily_count", 0)
                        results["hourly_records"] += stock_result.get("hourly_count", 0)
                    else:
                        results["failed_stocks"] += 1
                    await asyncio.sleep(0.2)
                except Exception as e:
                    results["failed_stocks"] += 1
                    results["details"][symbol] = {"success": False, "error": str(e), "daily_count": 0, "hourly_count": 0}

            sync_end_time = datetime.now()
            duration = (sync_end_time - sync_start_time).total_seconds()
            results.update({
                "status": "completed",
                "end_time": sync_end_time.isoformat(),
                "duration_seconds": round(duration, 2),
                "success_rate": round((results["success_stocks"] / max(1, len(symbols))) * 100, 1),
            })
            self._last_result = results
            self._last_sync_time = sync_end_time
            return results
        except Exception as e:
            now = datetime.now()
            self._last_result = {"status": "failed", "error": str(e), "end_time": now.isoformat()}
            self._last_sync_time = now
            return self._last_result
        finally:
            self.is_syncing = False

    def get_last_result(self) -> Dict[str, any]:
        return self._last_result or {"status": "none"}

    def get_last_sync_time(self) -> Optional[str]:
        return self._last_sync_time.isoformat() if self._last_sync_time else None
    
    async def _sync_single_stock(self, symbol: str, force_full_sync: bool) -> Dict[str, any]:
        """同步单只股票数据"""
        try:
            logger.debug(f"📡 同步股票 {symbol} 数据...")
            
            result = {
                "success": False,
                "daily_count": 0,
                "hourly_count": 0,
                "error": None
            }
            
            # 1. 同步日线数据
            if force_full_sync:
                # 全量同步：获取2年数据，确保有足够的历史数据用于技术分析
                daily_data = await self.market_data_provider.get_stock_data(symbol, "2y", "1d")
            else:
                # 增量同步：获取更多历史数据（兜底200天），确保策略有足够的数据进行分析
                last_daily = await self.kline_repository.get_last_datetime(symbol, "1d")
                if last_daily:
                    # Yahoo provider按 period/interval 拉取，无法按时间过滤，这里取200天，保存时去重
                    daily_data = await self.market_data_provider.get_stock_data(symbol, "200d", "1d")
                else:
                    # 首次同步时获取足够的历史数据
                    daily_data = await self.market_data_provider.get_stock_data(symbol, "1y", "1d")
            
            if daily_data:
                daily_saved = await self._save_kline_data(symbol, daily_data, "1d")
                result["daily_count"] = daily_saved
                logger.debug(f"📊 {symbol} 日线数据: 获取 {len(daily_data)} 条, 保存 {daily_saved} 条")
            
            # 2. 同步小时线数据
            if force_full_sync:
                # 全量同步：获取更多小时线数据（约6个月），确保技术分析有足够的数据
                hourly_data = await self.market_data_provider.get_stock_data(symbol, "180d", "1h")
            else:
                # 增量同步：获取更多历史数据（兜底30天），确保策略有足够的小时线数据进行分析
                last_hourly = await self.kline_repository.get_last_datetime(symbol, "1h")
                if last_hourly:
                    hourly_data = await self.market_data_provider.get_stock_data(symbol, "30d", "1h")
                else:
                    # 首次同步时获取足够的历史数据
                    hourly_data = await self.market_data_provider.get_stock_data(symbol, "90d", "1h")
            
            if hourly_data:
                hourly_saved = await self._save_kline_data(symbol, hourly_data, "1h")
                result["hourly_count"] = hourly_saved
                logger.debug(f"📊 {symbol} 小时线数据: 获取 {len(hourly_data)} 条, 保存 {hourly_saved} 条")
            
            result["success"] = True
            return result
            
        except Exception as e:
            logger.error(f"同步股票 {symbol} 失败: {e}")
            return {
                "success": False,
                "daily_count": 0,
                "hourly_count": 0,
                "error": str(e)
            }
    
    async def _save_kline_data(self, symbol: str, kline_data: List[KLineData], timeframe: str) -> int:
        """保存K线数据到数据库"""
        saved_count = 0
        
        for kline in kline_data:
            try:
                # 检查是否已存在（简化实现，实际应该检查数据库）
                # 这里假设数据库有去重机制
                
                data_dict = {
                    'symbol': symbol,
                    'timeframe': timeframe,
                    'datetime': kline.datetime,
                    'open': kline.open,
                    'high': kline.high,
                    'low': kline.low,
                    'close': kline.close,
                    'volume': kline.volume,
                    'data_source': 'yahoo',
                    'sync_time': datetime.now()
                }
                
                # 保存到数据库
                success = await self.kline_repository.save_kline_data(data_dict)
                if success:
                    saved_count += 1
                
            except Exception as e:
                logger.error(f"保存K线数据失败: {e}")
                continue
        
        return saved_count
    
    async def get_sync_status(self) -> Dict[str, any]:
        """获取同步状态"""
        # 获取运行中的任务
        running_tasks = await self.task_repository.get_running_tasks()
        current_task = running_tasks[0] if running_tasks else None
        
        # 获取最近的任务
        recent_tasks = await self.task_repository.get_recent_tasks(1)
        last_task = recent_tasks[0] if recent_tasks else None
        
        return {
            "is_syncing": self.is_syncing,
            "current_task_id": self._current_task_id,
            "current_task": {
                "task_id": current_task.task_id,
                "status": current_task.status,
                "progress": current_task.progress,
                "processed_stocks": current_task.processed_stocks,
                "total_stocks": current_task.total_stocks,
                "success_stocks": current_task.success_stocks,
                "failed_stocks": current_task.failed_stocks,
                "start_time": current_task.start_time.isoformat() if current_task.start_time else None
            } if current_task else None,
            "last_task": {
                "task_id": last_task.task_id,
                "status": last_task.status,
                "progress": last_task.progress,
                "end_time": last_task.end_time.isoformat() if last_task.end_time else None,
                "duration_seconds": last_task.duration_seconds,
                "success_stocks": last_task.success_stocks,
                "failed_stocks": last_task.failed_stocks,
                "total_stocks": last_task.total_stocks
            } if last_task else None,
            "last_sync_time": self._last_sync_time.isoformat() if self._last_sync_time else None,
        }
    
    async def get_task_status(self, task_id: str) -> Optional[Dict[str, any]]:
        """获取指定任务的状态"""
        task = await self.task_repository.get_task(task_id)
        if not task:
            return None
        
        return {
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
            "result_summary": task.result_summary,
            "error_details": task.error_details,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "updated_at": task.updated_at.isoformat() if task.updated_at else None
        }
    
    async def create_sync_task(
        self, 
        task_type: str = "incremental", 
        force_full_sync: bool = False,
        target_symbols: Optional[List[str]] = None
    ) -> str:
        """创建新的数据同步任务"""
        return await self.task_repository.create_task(
            task_type=task_type,
            force_full_sync=force_full_sync,
            target_symbols=target_symbols,
            trigger_source='manual'
        )
    
    async def cleanup_old_data(self, days_to_keep: int = 90) -> int:
        """清理过期数据"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days_to_keep)
            deleted_count = await self.kline_repository.cleanup_old_data(cutoff_date)
            logger.info(f"🧹 清理了 {deleted_count} 条过期K线数据")
            return deleted_count
        except Exception as e:
            logger.error(f"清理过期数据失败: {e}")
            return 0
