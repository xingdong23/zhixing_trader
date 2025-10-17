"""
智能同步服务
基于边界数据检测缺口，实现精确的增量同步
"""
import json
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any, Tuple, NamedTuple
from dataclasses import dataclass
from loguru import logger

from ..core.interfaces import IMarketDataProvider, IStockRepository, IKLineRepository
from ..repositories.stock_sync_status_repository import StockSyncStatusRepository


@dataclass
class SyncRange:
    """同步范围"""
    start_date: date
    end_date: date
    reason: str  # 'historical_gap', 'latest_gap', 'failed_retry'
    
    def __str__(self):
        return f"{self.start_date} to {self.end_date} ({self.reason})"


@dataclass
class StockSyncPlan:
    """单个股票的同步计划"""
    stock_code: str
    timeframe: str
    needs_sync: bool
    sync_ranges: List[SyncRange]
    reason: str


class SmartSyncService:
    """智能同步服务"""
    
    def __init__(
        self,
        market_data_provider: IMarketDataProvider,
        stock_repository: IStockRepository,
        kline_repository: IKLineRepository
    ):
        self.market_data_provider = market_data_provider
        self.stock_repository = stock_repository
        self.kline_repository = kline_repository
        self.sync_status_repo = StockSyncStatusRepository()
        self.is_syncing = False
    
    async def analyze_sync_needs(self, stock_codes: List[str] = None) -> Dict[str, Dict[str, StockSyncPlan]]:
        """分析所有股票的同步需求"""
        try:
            # 如果没有指定股票，则获取所有自选股
            if not stock_codes:
                stocks = await self.stock_repository.get_all_stocks()
                stock_codes = [stock.code if hasattr(stock, 'code') else stock.symbol for stock in stocks]
            
            sync_plans = {}
            
            for stock_code in stock_codes:
                sync_plans[stock_code] = {}
                
                for timeframe in ['1d', '1h']:
                    # 更新边界信息
                    await self.sync_status_repo.update_boundary_info(stock_code, timeframe)
                    
                    # 计算同步计划
                    plan = await self._calculate_stock_sync_plan(stock_code, timeframe)
                    sync_plans[stock_code][timeframe] = plan
            
            return sync_plans
            
        except Exception as e:
            logger.error(f"分析同步需求失败: {e}")
            return {}
    
    async def _calculate_stock_sync_plan(self, stock_code: str, timeframe: str) -> StockSyncPlan:
        """计算单个股票单个周期的同步计划"""
        try:
            # 获取同步状态
            status = await self.sync_status_repo.get_sync_status(stock_code, timeframe)
            if not status:
                # 如果没有状态记录，创建一个
                status = await self.sync_status_repo.get_or_create_sync_status(stock_code, timeframe)
                await self.sync_status_repo.update_boundary_info(stock_code, timeframe)
                status = await self.sync_status_repo.get_sync_status(stock_code, timeframe)
            
            sync_ranges = []
            reasons = []
            
            today = date.today()
            target_start = status.target_start_date
            target_end = today
            
            # 1. 检查历史数据缺口（前向缺口）
            if not status.earliest_data_date or status.earliest_data_date > target_start:
                historical_end = status.earliest_data_date or target_end
                if historical_end > target_start:
                    sync_ranges.append(SyncRange(
                        start_date=target_start,
                        end_date=historical_end - timedelta(days=1),  # 避免重复
                        reason='historical_gap'
                    ))
                    reasons.append('缺少历史数据')
            
            # 2. 检查最新数据缺口（后向缺口）
            if not status.latest_data_date or status.latest_data_date < target_end:
                latest_start = status.latest_data_date or target_start
                if latest_start < target_end:
                    # 如果有最新数据，从下一天开始同步
                    if status.latest_data_date:
                        latest_start = status.latest_data_date + timedelta(days=1)
                    
                    sync_ranges.append(SyncRange(
                        start_date=latest_start,
                        end_date=target_end,
                        reason='latest_gap'
                    ))
                    reasons.append('缺少最新数据')
            
            # 3. 检查失败重试
            if status.failed_ranges:
                try:
                    failed_list = json.loads(status.failed_ranges)
                    for failed_range in failed_list:
                        start_date = datetime.strptime(failed_range['start'], '%Y-%m-%d').date()
                        end_date = datetime.strptime(failed_range['end'], '%Y-%m-%d').date()
                        sync_ranges.append(SyncRange(
                            start_date=start_date,
                            end_date=end_date,
                            reason='failed_retry'
                        ))
                    reasons.append(f'重试失败范围({len(failed_list)}个)')
                except Exception as e:
                    logger.error(f"解析失败范围失败: {e}")
            
            # 4. 优化同步范围（合并相邻或重叠的范围）
            optimized_ranges = self._optimize_sync_ranges(sync_ranges)
            
            needs_sync = len(optimized_ranges) > 0
            reason = '; '.join(reasons) if reasons else '数据已最新'
            
            return StockSyncPlan(
                stock_code=stock_code,
                timeframe=timeframe,
                needs_sync=needs_sync,
                sync_ranges=optimized_ranges,
                reason=reason
            )
            
        except Exception as e:
            logger.error(f"计算同步计划失败: {stock_code} {timeframe}: {e}")
            return StockSyncPlan(
                stock_code=stock_code,
                timeframe=timeframe,
                needs_sync=False,
                sync_ranges=[],
                reason=f'计算失败: {str(e)}'
            )
    
    def _optimize_sync_ranges(self, ranges: List[SyncRange]) -> List[SyncRange]:
        """优化同步范围：合并相邻或重叠的范围"""
        if not ranges:
            return []
        
        # 按开始日期排序
        sorted_ranges = sorted(ranges, key=lambda r: r.start_date)
        optimized = [sorted_ranges[0]]
        
        for current in sorted_ranges[1:]:
            last = optimized[-1]
            
            # 如果当前范围与上一个范围相邻或重叠，则合并
            if current.start_date <= last.end_date + timedelta(days=1):
                # 合并范围
                merged_end = max(last.end_date, current.end_date)
                merged_reason = f"{last.reason}+{current.reason}"
                
                optimized[-1] = SyncRange(
                    start_date=last.start_date,
                    end_date=merged_end,
                    reason=merged_reason
                )
            else:
                optimized.append(current)
        
        return optimized
    
    async def execute_smart_sync(
        self, 
        stock_codes: List[str] = None,
        force_analysis: bool = True
    ) -> Dict[str, Any]:
        """执行智能同步"""
        if self.is_syncing:
            return {"status": "skipped", "reason": "sync_in_progress"}
        
        self.is_syncing = True
        sync_start_time = datetime.now()
        
        try:
            logger.info("🚀 开始智能数据同步...")
            
            # 1. 分析同步需求
            if force_analysis:
                sync_plans = await self.analyze_sync_needs(stock_codes)
            else:
                # 从数据库获取需要同步的股票
                sync_plans = await self._get_pending_sync_plans()
            
            # 2. 统计需要同步的任务
            total_tasks = 0
            stocks_to_sync = {}
            
            for stock_code, timeframe_plans in sync_plans.items():
                for timeframe, plan in timeframe_plans.items():
                    if plan.needs_sync:
                        total_tasks += len(plan.sync_ranges)
                        if stock_code not in stocks_to_sync:
                            stocks_to_sync[stock_code] = {}
                        stocks_to_sync[stock_code][timeframe] = plan
            
            if total_tasks == 0:
                logger.info("✅ 所有数据已是最新，无需同步")
                return {
                    "status": "completed",
                    "message": "所有数据已是最新",
                    "total_tasks": 0,
                    "duration_seconds": 0
                }
            
            logger.info(f"📊 发现 {len(stocks_to_sync)} 只股票需要同步，共 {total_tasks} 个任务")
            
            # 3. 执行同步
            sync_results = {
                "total_stocks": len(stocks_to_sync),
                "total_tasks": total_tasks,
                "completed_tasks": 0,
                "failed_tasks": 0,
                "start_time": sync_start_time.isoformat(),
                "details": {}
            }
            
            for stock_code, timeframe_plans in stocks_to_sync.items():
                stock_results = {}
                
                for timeframe, plan in timeframe_plans.items():
                    # 更新状态为同步中
                    await self.sync_status_repo.update_sync_status(
                        stock_code, timeframe, status='syncing'
                    )
                    
                    # 执行同步
                    timeframe_result = await self._sync_stock_timeframe(
                        stock_code, timeframe, plan.sync_ranges
                    )
                    
                    stock_results[timeframe] = timeframe_result
                    
                    # 更新统计
                    if timeframe_result.get('success', False):
                        sync_results["completed_tasks"] += timeframe_result.get('completed_ranges', 0)
                    else:
                        sync_results["failed_tasks"] += len(plan.sync_ranges)
                
                sync_results["details"][stock_code] = stock_results
            
            # 4. 完成统计
            sync_end_time = datetime.now()
            duration = (sync_end_time - sync_start_time).total_seconds()
            
            sync_results.update({
                "status": "completed",
                "end_time": sync_end_time.isoformat(),
                "duration_seconds": round(duration, 2),
                "success_rate": round(
                    sync_results["completed_tasks"] / max(1, total_tasks) * 100, 1
                )
            })
            
            logger.info(f"✅ 智能同步完成: {sync_results['completed_tasks']}/{total_tasks} 任务成功, "
                       f"耗时 {duration:.1f}秒")
            
            return sync_results
            
        except Exception as e:
            logger.error(f"智能同步失败: {e}")
            return {
                "status": "failed",
                "error": str(e),
                "end_time": datetime.now().isoformat()
            }
        finally:
            self.is_syncing = False
    
    async def _sync_stock_timeframe(
        self, 
        stock_code: str, 
        timeframe: str, 
        sync_ranges: List[SyncRange]
    ) -> Dict[str, Any]:
        """同步单个股票的单个时间周期"""
        try:
            logger.info(f"🔄 同步 {stock_code} {timeframe}: {len(sync_ranges)} 个范围")
            
            result = {
                "success": False,
                "completed_ranges": 0,
                "failed_ranges": [],
                "total_records": 0,
                "error": None
            }
            
            failed_ranges = []
            
            for sync_range in sync_ranges:
                try:
                    # 计算合适的Yahoo API参数
                    period, interval = self._calculate_yahoo_params(sync_range, timeframe)
                    
                    logger.debug(f"📡 获取数据: {stock_code} {period} {interval} "
                               f"({sync_range.start_date} to {sync_range.end_date})")
                    
                    # 获取数据
                    kline_data = await self.market_data_provider.get_stock_data(
                        stock_code, period, interval
                    )
                    
                    if not kline_data:
                        logger.warning(f"未获取到数据: {stock_code} {timeframe}")
                        failed_ranges.append({
                            'start': sync_range.start_date.isoformat(),
                            'end': sync_range.end_date.isoformat(),
                            'error': '未获取到数据'
                        })
                        continue
                    
                    # 过滤数据到目标范围
                    filtered_data = self._filter_data_by_range(kline_data, sync_range)
                    
                    if not filtered_data:
                        logger.warning(f"过滤后无数据: {stock_code} {timeframe} {sync_range}")
                        continue
                    
                    # 保存数据
                    saved_count = await self._save_kline_data(stock_code, filtered_data, timeframe)
                    
                    result["total_records"] += saved_count
                    result["completed_ranges"] += 1
                    
                    logger.debug(f"✅ 范围完成: {sync_range} - 保存 {saved_count} 条")
                    
                except Exception as e:
                    logger.error(f"同步范围失败: {sync_range}: {e}")
                    failed_ranges.append({
                        'start': sync_range.start_date.isoformat(),
                        'end': sync_range.end_date.isoformat(),
                        'error': str(e)
                    })
            
            # 更新同步状态
            if failed_ranges:
                await self.sync_status_repo.update_sync_status(
                    stock_code, timeframe, 
                    status='partial',
                    failed_ranges=failed_ranges,
                    increment_retry=True
                )
                result["failed_ranges"] = failed_ranges
                result["success"] = result["completed_ranges"] > 0
            else:
                # 更新边界信息
                await self.sync_status_repo.update_boundary_info(stock_code, timeframe)
                await self.sync_status_repo.update_sync_status(
                    stock_code, timeframe, status='completed'
                )
                result["success"] = True
            
            return result
            
        except Exception as e:
            logger.error(f"同步股票时间周期失败: {stock_code} {timeframe}: {e}")
            await self.sync_status_repo.update_sync_status(
                stock_code, timeframe, 
                status='failed',
                error_message=str(e),
                increment_retry=True
            )
            return {
                "success": False,
                "completed_ranges": 0,
                "failed_ranges": [],
                "total_records": 0,
                "error": str(e)
            }
    
    def _calculate_yahoo_params(self, sync_range: SyncRange, timeframe: str) -> Tuple[str, str]:
        """计算Yahoo API的period和interval参数"""
        days_diff = (sync_range.end_date - sync_range.start_date).days
        
        interval = timeframe
        
        # 根据时间范围选择合适的period
        if days_diff <= 7:
            period = "7d"
        elif days_diff <= 30:
            period = "1mo"
        elif days_diff <= 90:
            period = "3mo"
        elif days_diff <= 180:
            period = "6mo"
        elif days_diff <= 365:
            period = "1y"
        else:
            # 超过1年的数据，分批获取
            period = "1y"
        
        return period, interval
    
    def _filter_data_by_range(self, kline_data: List, sync_range: SyncRange) -> List:
        """按时间范围过滤K线数据"""
        filtered = []
        
        for kline in kline_data:
            kline_date = kline.datetime.date()
            if sync_range.start_date <= kline_date <= sync_range.end_date:
                filtered.append(kline)
        
        return filtered
    
    async def _save_kline_data(self, symbol: str, kline_data: List, timeframe: str) -> int:
        """保存K线数据到数据库"""
        saved_count = 0
        
        for kline in kline_data:
            try:
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
                
                # 保存到数据库（已有去重逻辑）
                success = await self.kline_repository.save_kline_data(data_dict)
                if success:
                    saved_count += 1
                
            except Exception as e:
                logger.error(f"保存K线数据失败: {e}")
                continue
        
        return saved_count
    
    async def _get_pending_sync_plans(self) -> Dict[str, Dict[str, StockSyncPlan]]:
        """从数据库获取待同步的计划"""
        # 这里可以实现从数据库快速获取待同步项目的逻辑
        # 暂时返回空，使用force_analysis=True
        return {}
    
    async def get_sync_overview(self) -> Dict[str, Any]:
        """获取同步状态概览"""
        try:
            all_status = await self.sync_status_repo.get_all_sync_status()
            
            # 统计信息
            total_stocks = len(set(s['stock_code'] for s in all_status))
            completed_count = len([s for s in all_status if s['sync_status'] == 'completed'])
            failed_count = len([s for s in all_status if s['sync_status'] == 'failed'])
            pending_count = len([s for s in all_status if s['sync_status'] == 'pending'])
            
            return {
                "total_stocks": total_stocks,
                "total_records": len(all_status),
                "completed": completed_count,
                "failed": failed_count,
                "pending": pending_count,
                "is_syncing": self.is_syncing,
                "details": all_status
            }
            
        except Exception as e:
            logger.error(f"获取同步概览失败: {e}")
            return {
                "total_stocks": 0,
                "total_records": 0,
                "completed": 0,
                "failed": 0,
                "pending": 0,
                "is_syncing": False,
                "details": []
            }
