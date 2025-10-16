"""
多账号轮询Provider
支持使用多个API Key轮询访问，成倍扩展API额度
"""
import time
from typing import List, Optional, Type
from loguru import logger

from app.core.interfaces import IMarketDataProvider, KLineData
from app.models import StockInfo


class AccountStats:
    """账号统计信息"""
    
    def __init__(self, account_id: str):
        self.account_id = account_id
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.total_response_time = 0.0
        self.consecutive_failures = 0
        self.last_error_time = 0.0
        self.last_use_time = 0.0
    
    @property
    def success_rate(self) -> float:
        """成功率"""
        if self.total_requests == 0:
            return 1.0
        return self.successful_requests / self.total_requests
    
    @property
    def avg_response_time(self) -> float:
        """平均响应时间"""
        if self.successful_requests == 0:
            return 0.0
        return self.total_response_time / self.successful_requests
    
    @property
    def is_available(self) -> bool:
        """是否可用"""
        # 连续失败5次，冷却60秒
        if self.consecutive_failures >= 5:
            if time.time() - self.last_error_time < 60:
                return False
            # 60秒后重置
            self.consecutive_failures = 0
        return True
    
    def record_success(self, response_time: float):
        """记录成功"""
        self.total_requests += 1
        self.successful_requests += 1
        self.total_response_time += response_time
        self.consecutive_failures = 0
        self.last_use_time = time.time()
    
    def record_failure(self):
        """记录失败"""
        self.total_requests += 1
        self.failed_requests += 1
        self.consecutive_failures += 1
        self.last_error_time = time.time()
        self.last_use_time = time.time()


class MultiAccountProvider(IMarketDataProvider):
    """
    多账号轮询Provider
    
    使用多个API Key轮询访问同一个数据源，成倍扩展API额度
    
    特性:
    - 轮询策略：按顺序轮流使用不同账号
    - 自动跳过：跳过达到限额或故障的账号
    - 健康监控：追踪每个账号的使用情况
    - 自动恢复：故障账号自动恢复重试
    
    使用示例:
        # 创建多账号Provider
        finnhub_multi = MultiAccountProvider(
            api_keys=["key1", "key2", "key3"],
            provider_class=FinnhubProvider,
            provider_name="Finnhub",
            rate_limit_delay=1.0
        )
        
        # 使用方式与单账号完全相同
        data = await finnhub_multi.get_stock_data("AAPL", "5d", "1d")
    """
    
    def __init__(
        self,
        api_keys: List[str],
        provider_class: Type[IMarketDataProvider],
        provider_name: str = "Provider",
        **provider_kwargs
    ):
        """
        初始化多账号Provider
        
        Args:
            api_keys: API Key列表
            provider_class: Provider类（如FinnhubProvider）
            provider_name: Provider名称（用于日志）
            **provider_kwargs: 传递给Provider的其他参数
        """
        if not api_keys:
            raise ValueError("至少需要一个API Key")
        
        self.provider_name = provider_name
        self.api_keys = api_keys
        self.current_index = 0
        
        # 为每个API Key创建Provider实例
        self.providers: List[IMarketDataProvider] = []
        self.stats: List[AccountStats] = []
        
        for i, api_key in enumerate(api_keys):
            account_id = f"{provider_name}-{i+1}"
            
            # 创建Provider实例
            provider = provider_class(api_key=api_key, **provider_kwargs)
            self.providers.append(provider)
            
            # 创建统计对象
            stats = AccountStats(account_id)
            self.stats.append(stats)
            
            logger.info(f"[MultiAccount] 添加账号: {account_id}")
        
        logger.info(
            f"[MultiAccount:{provider_name}] 初始化完成，"
            f"共 {len(self.providers)} 个账号"
        )
    
    def _get_next_provider(self) -> Optional[tuple]:
        """
        获取下一个可用的Provider
        
        Returns:
            (provider, stats) 或 None
        """
        # 尝试所有账号
        attempts = 0
        
        while attempts < len(self.providers):
            provider = self.providers[self.current_index]
            stats = self.stats[self.current_index]
            
            # 移动到下一个索引
            self.current_index = (self.current_index + 1) % len(self.providers)
            attempts += 1
            
            # 检查是否可用
            if stats.is_available:
                logger.debug(
                    f"[MultiAccount:{self.provider_name}] "
                    f"选择账号: {stats.account_id} "
                    f"(成功率:{stats.success_rate*100:.1f}%)"
                )
                return provider, stats
            else:
                logger.debug(
                    f"[MultiAccount:{self.provider_name}] "
                    f"跳过账号: {stats.account_id} "
                    f"(连续失败:{stats.consecutive_failures}次)"
                )
        
        # 所有账号都不可用
        logger.error(
            f"[MultiAccount:{self.provider_name}] "
            f"所有账号都不可用"
        )
        return None
    
    async def _execute_with_retry(self, method_name: str, *args, **kwargs):
        """
        使用轮询策略执行方法
        
        Args:
            method_name: 方法名
            *args, **kwargs: 方法参数
            
        Returns:
            方法返回值
        """
        max_retries = len(self.providers)
        
        for attempt in range(max_retries):
            result = self._get_next_provider()
            
            if not result:
                break
            
            provider, stats = result
            
            try:
                # 记录开始时间
                start_time = time.time()
                
                # 调用方法
                method = getattr(provider, method_name)
                result = await method(*args, **kwargs)
                
                # 记录成功
                response_time = time.time() - start_time
                stats.record_success(response_time)
                
                logger.debug(
                    f"[MultiAccount:{self.provider_name}] "
                    f"{stats.account_id} 成功 - "
                    f"耗时:{response_time:.2f}s"
                )
                
                return result
            
            except Exception as e:
                # 记录失败
                stats.record_failure()
                
                logger.warning(
                    f"[MultiAccount:{self.provider_name}] "
                    f"{stats.account_id} 失败: {e} - "
                    f"尝试下一个账号..."
                )
                
                # 继续尝试下一个账号
                continue
        
        # 所有账号都失败
        logger.error(
            f"[MultiAccount:{self.provider_name}] "
            f"所有账号都失败"
        )
        return None
    
    async def get_stock_data(
        self,
        symbol: str,
        period: str = "1mo",
        interval: str = "1d"
    ) -> List[KLineData]:
        """获取股票K线数据（多账号轮询）"""
        result = await self._execute_with_retry(
            'get_stock_data',
            symbol, period, interval
        )
        return result if result is not None else []
    
    async def get_stock_info(self, symbol: str) -> Optional[StockInfo]:
        """获取股票信息（多账号轮询）"""
        return await self._execute_with_retry('get_stock_info', symbol)
    
    async def validate_symbol(self, symbol: str) -> bool:
        """验证股票代码（多账号轮询）"""
        result = await self._execute_with_retry('validate_symbol', symbol)
        return result if result is not None else False
    
    async def get_multiple_stocks_data(
        self,
        symbols: List[str],
        period: str = "1mo",
        interval: str = "1d"
    ) -> dict:
        """批量获取股票数据（多账号轮询）"""
        result = await self._execute_with_retry(
            'get_multiple_stocks_data',
            symbols, period, interval
        )
        return result if result is not None else {}
    
    def get_statistics(self) -> dict:
        """
        获取所有账号的统计信息
        
        Returns:
            统计信息字典
        """
        stats = {
            "provider_name": self.provider_name,
            "total_accounts": len(self.providers),
            "accounts": {}
        }
        
        total_requests = 0
        total_success = 0
        total_failed = 0
        
        for stat in self.stats:
            stats["accounts"][stat.account_id] = {
                "total_requests": stat.total_requests,
                "successful_requests": stat.successful_requests,
                "failed_requests": stat.failed_requests,
                "success_rate": f"{stat.success_rate*100:.2f}%",
                "avg_response_time": f"{stat.avg_response_time:.2f}s",
                "consecutive_failures": stat.consecutive_failures,
                "is_available": stat.is_available,
            }
            
            total_requests += stat.total_requests
            total_success += stat.successful_requests
            total_failed += stat.failed_requests
        
        stats["summary"] = {
            "total_requests": total_requests,
            "successful_requests": total_success,
            "failed_requests": total_failed,
            "success_rate": f"{(total_success/total_requests*100 if total_requests > 0 else 0):.2f}%",
        }
        
        return stats
    
    def print_statistics(self):
        """打印统计信息"""
        stats = self.get_statistics()
        
        print("\n" + "="*80)
        print(f"  {stats['provider_name']} - 多账号统计")
        print("="*80)
        print(f"总账号数: {stats['total_accounts']}")
        
        summary = stats['summary']
        print(f"\n📊 汇总:")
        print(f"   总请求: {summary['total_requests']}")
        print(f"   成功: {summary['successful_requests']}")
        print(f"   失败: {summary['failed_requests']}")
        print(f"   成功率: {summary['success_rate']}")
        
        print(f"\n📋 各账号详情:")
        for account_id, account_stats in stats['accounts'].items():
            status = "✅" if account_stats['is_available'] else "❌"
            print(f"\n   {status} {account_id}:")
            print(f"      请求: {account_stats['total_requests']}")
            print(f"      成功: {account_stats['successful_requests']}")
            print(f"      失败: {account_stats['failed_requests']}")
            print(f"      成功率: {account_stats['success_rate']}")
            print(f"      平均响应: {account_stats['avg_response_time']}")
            
            if account_stats['consecutive_failures'] > 0:
                print(f"      ⚠️  连续失败: {account_stats['consecutive_failures']}次")
        
        print("\n" + "="*80)

