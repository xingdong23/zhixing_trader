"""
内存版K线数据仓库
用于演示和测试，实际生产环境应该使用数据库
"""
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from collections import defaultdict
from loguru import logger

from ..core.interfaces import IKLineRepository, KLineData


class MemoryKLineRepository(IKLineRepository):
    """内存版K线数据仓库"""
    
    def __init__(self):
        # 数据结构: {symbol: {timeframe: [kline_data]}}
        self._data: Dict[str, Dict[str, List[Dict]]] = defaultdict(lambda: defaultdict(list))
        self._last_update: Dict[str, datetime] = {}
    
    async def save_kline_data(self, kline_data: Dict[str, Any]) -> bool:
        """保存K线数据"""
        try:
            symbol = kline_data['symbol']
            timeframe = kline_data['timeframe']
            
            # 检查是否已存在相同时间的数据
            existing_data = self._data[symbol][timeframe]
            kline_datetime = kline_data['datetime']
            
            # 查找是否已存在
            for i, existing in enumerate(existing_data):
                if existing['datetime'] == kline_datetime:
                    # 更新现有数据
                    existing_data[i] = kline_data
                    logger.debug(f"更新K线数据: {symbol} {timeframe} {kline_datetime}")
                    return True
            
            # 添加新数据
            existing_data.append(kline_data)
            
            # 按时间排序
            existing_data.sort(key=lambda x: x['datetime'])
            
            # 更新最后更新时间
            self._last_update[f"{symbol}_{timeframe}"] = datetime.now()
            
            logger.debug(f"保存K线数据: {symbol} {timeframe} {kline_datetime}")
            return True
            
        except Exception as e:
            logger.error(f"保存K线数据失败: {e}")
            return False
    
    async def get_kline_data(
        self, 
        symbol: str, 
        timeframe: str, 
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: Optional[int] = None
    ) -> List[KLineData]:
        """获取K线数据"""
        try:
            if symbol not in self._data or timeframe not in self._data[symbol]:
                return []
            
            data_list = self._data[symbol][timeframe]
            
            # 时间过滤
            if start_date or end_date:
                filtered_data = []
                for item in data_list:
                    item_date = item['datetime']
                    if start_date and item_date < start_date:
                        continue
                    if end_date and item_date > end_date:
                        continue
                    filtered_data.append(item)
                data_list = filtered_data
            
            # 限制数量
            if limit:
                data_list = data_list[-limit:]  # 取最新的数据
            
            # 转换为KLineData对象
            kline_objects = []
            for item in data_list:
                kline = KLineData(
                    datetime=item['datetime'],
                    open=item['open'],
                    high=item['high'],
                    low=item['low'],
                    close=item['close'],
                    volume=item['volume'],
                    symbol=item['symbol']
                )
                kline_objects.append(kline)
            
            return kline_objects
            
        except Exception as e:
            logger.error(f"获取K线数据失败: {e}")
            return []
    
    async def get_latest_kline(self, symbol: str, timeframe: str) -> Optional[KLineData]:
        """获取最新的K线数据"""
        try:
            data_list = await self.get_kline_data(symbol, timeframe, limit=1)
            return data_list[0] if data_list else None
        except Exception as e:
            logger.error(f"获取最新K线数据失败: {e}")
            return None
    
    async def cleanup_old_data(self, cutoff_date: datetime) -> int:
        """清理过期数据"""
        deleted_count = 0
        
        try:
            for symbol in list(self._data.keys()):
                for timeframe in list(self._data[symbol].keys()):
                    data_list = self._data[symbol][timeframe]
                    original_count = len(data_list)
                    
                    # 过滤掉过期数据
                    self._data[symbol][timeframe] = [
                        item for item in data_list 
                        if item['datetime'] >= cutoff_date
                    ]
                    
                    deleted_count += original_count - len(self._data[symbol][timeframe])
                    
                    # 如果没有数据了，删除这个timeframe
                    if not self._data[symbol][timeframe]:
                        del self._data[symbol][timeframe]
                
                # 如果这个symbol没有数据了，删除这个symbol
                if not self._data[symbol]:
                    del self._data[symbol]
            
            logger.info(f"清理了 {deleted_count} 条过期K线数据")
            return deleted_count
            
        except Exception as e:
            logger.error(f"清理过期数据失败: {e}")
            return 0
    
    async def get_data_statistics(self) -> Dict[str, Any]:
        """获取数据统计信息"""
        try:
            stats = {
                "total_symbols": len(self._data),
                "total_records": 0,
                "timeframes": set(),
                "symbols": list(self._data.keys()),
                "data_by_timeframe": {},
                "latest_updates": {}
            }
            
            for symbol, timeframe_data in self._data.items():
                for timeframe, data_list in timeframe_data.items():
                    stats["timeframes"].add(timeframe)
                    stats["total_records"] += len(data_list)
                    
                    if timeframe not in stats["data_by_timeframe"]:
                        stats["data_by_timeframe"][timeframe] = 0
                    stats["data_by_timeframe"][timeframe] += len(data_list)
                    
                    # 最新更新时间
                    key = f"{symbol}_{timeframe}"
                    if key in self._last_update:
                        stats["latest_updates"][key] = self._last_update[key].isoformat()
            
            stats["timeframes"] = list(stats["timeframes"])
            
            return stats
            
        except Exception as e:
            logger.error(f"获取数据统计失败: {e}")
            return {}
    
    async def get_symbols_with_data(self, timeframe: str) -> List[str]:
        """获取有指定时间周期数据的股票列表"""
        symbols = []
        for symbol, timeframe_data in self._data.items():
            if timeframe in timeframe_data and timeframe_data[timeframe]:
                symbols.append(symbol)
        return symbols
    
    async def check_data_freshness(self, symbol: str, timeframe: str, max_age_hours: int = 24) -> bool:
        """检查数据是否新鲜"""
        try:
            key = f"{symbol}_{timeframe}"
            if key not in self._last_update:
                return False
            
            age = datetime.now() - self._last_update[key]
            return age.total_seconds() < max_age_hours * 3600
            
        except Exception as e:
            logger.error(f"检查数据新鲜度失败: {e}")
            return False
    
    def get_memory_usage(self) -> Dict[str, Any]:
        """获取内存使用情况"""
        import sys
        
        total_records = 0
        for symbol_data in self._data.values():
            for data_list in symbol_data.values():
                total_records += len(data_list)
        
        # 估算内存使用（每条记录约100字节）
        estimated_memory_mb = total_records * 100 / (1024 * 1024)
        
        return {
            "total_records": total_records,
            "estimated_memory_mb": round(estimated_memory_mb, 2),
            "symbols_count": len(self._data),
            "python_memory_mb": round(sys.getsizeof(self._data) / (1024 * 1024), 2)
        }
