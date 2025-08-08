"""
数据同步服务
负责定时同步自选股的K线数据到本地数据库
"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from loguru import logger

from ..core.interfaces import (
    IMarketDataProvider, IStockRepository, IKLineRepository, KLineData
)


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
        self.is_syncing = False
        # 最近一次同步结果（内存保存，便于前端查看失败详情/重试）
        self._last_result: Optional[Dict[str, any]] = None
        self._last_sync_time: Optional[datetime] = None
    
    async def sync_all_watchlist_data(self, force_full_sync: bool = False) -> Dict[str, any]:
        """
        同步所有自选股数据
        
        Args:
            force_full_sync: 是否强制全量同步（否则增量同步）
        
        Returns:
            同步结果统计
        """
        if self.is_syncing:
            logger.warning("数据同步正在进行中，跳过本次同步")
            return {"status": "skipped", "reason": "sync_in_progress"}
        
        self.is_syncing = True
        sync_start_time = datetime.now()
        
        try:
            logger.info("🔄 开始同步自选股数据...")
            
            # 1. 获取自选股列表
            stocks = await self.stock_repository.get_all_stocks()
            if not stocks:
                logger.warning("自选股列表为空，无需同步")
                return {"status": "skipped", "reason": "no_stocks"}
            
            symbols = [stock.code if hasattr(stock, 'code') else stock.symbol for stock in stocks]
            logger.info(f"📊 找到 {len(symbols)} 只自选股需要同步: {', '.join(symbols)}")
            
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
            for symbol in symbols:
                try:
                    stock_result = await self._sync_single_stock(symbol, force_full_sync)
                    sync_results["details"][symbol] = stock_result
                    
                    if stock_result["success"]:
                        sync_results["success_stocks"] += 1
                        sync_results["daily_records"] += stock_result["daily_count"]
                        sync_results["hourly_records"] += stock_result["hourly_count"]
                    else:
                        sync_results["failed_stocks"] += 1
                    
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
            
            # 4. 完成统计
            sync_end_time = datetime.now()
            sync_duration = (sync_end_time - sync_start_time).total_seconds()
            
            sync_results.update({
                "status": "completed",
                "end_time": sync_end_time.isoformat(),
                "duration_seconds": round(sync_duration, 2),
                "success_rate": round(sync_results["success_stocks"] / len(symbols) * 100, 1)
            })
            
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
            self._last_result = {
                "status": "failed",
                "error": str(e),
                "end_time": datetime.now().isoformat()
            }
            self._last_sync_time = datetime.now()
            return self._last_result
        
        finally:
            self.is_syncing = False

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
                # 全量同步：获取1年数据
                daily_data = await self.market_data_provider.get_stock_data(symbol, "1y", "1d")
            else:
                # 增量同步：仅获取本地最新时间之后的数据（兜底30天）
                last_daily = await self.kline_repository.get_last_datetime(symbol, "1d")
                if last_daily:
                    # Yahoo provider按 period/interval 拉取，无法按时间过滤，这里仍然取30天，保存时去重
                    daily_data = await self.market_data_provider.get_stock_data(symbol, "30d", "1d")
                else:
                    daily_data = await self.market_data_provider.get_stock_data(symbol, "30d", "1d")
            
            if daily_data:
                daily_saved = await self._save_kline_data(symbol, daily_data, "1d")
                result["daily_count"] = daily_saved
                logger.debug(f"📊 {symbol} 日线数据: 获取 {len(daily_data)} 条, 保存 {daily_saved} 条")
            
            # 2. 同步小时线数据
            if force_full_sync:
                # 全量同步：获取60天小时线
                hourly_data = await self.market_data_provider.get_stock_data(symbol, "60d", "1h")
            else:
                # 增量同步：仅获取本地最新时间之后的数据（兜底7天）
                last_hourly = await self.kline_repository.get_last_datetime(symbol, "1h")
                if last_hourly:
                    hourly_data = await self.market_data_provider.get_stock_data(symbol, "7d", "1h")
                else:
                    hourly_data = await self.market_data_provider.get_stock_data(symbol, "7d", "1h")
            
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
        return {
            "is_syncing": self.is_syncing,
            "last_sync_time": None,  # TODO: 从数据库获取
            "next_sync_time": None,  # TODO: 计算下次同步时间
            "total_records": None,   # TODO: 从数据库统计
        }
    
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
