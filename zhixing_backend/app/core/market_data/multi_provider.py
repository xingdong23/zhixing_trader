"""
多数据源智能路由Provider
支持多个数据源的负载均衡、故障转移和优先级路由
"""
import random
import time
from typing import List, Optional, Dict
from loguru import logger

from app.core.interfaces import IMarketDataProvider, KLineData, StockInfo


class ProviderStats:
    """数据源统计信息"""
    
    def __init__(self, name: str, priority: int = 1, weight: int = 10):
        self.name = name
        self.priority = priority  # 优先级，数字越小优先级越高
        self.weight = weight  # 权重，用于负载均衡
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.total_response_time = 0.0
        self.last_error_time = 0.0
        self.consecutive_failures = 0
    
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
        """是否可用（连续失败少于5次且距离上次错误超过60秒）"""
        if self.consecutive_failures >= 5:
            # 如果连续失败5次，需要等待一段时间后再尝试
            if time.time() - self.last_error_time < 60:
                return False
            # 60秒后重置连续失败计数
            self.consecutive_failures = 0
        return True
    
    def record_success(self, response_time: float):
        """记录成功请求"""
        self.total_requests += 1
        self.successful_requests += 1
        self.total_response_time += response_time
        self.consecutive_failures = 0
    
    def record_failure(self):
        """记录失败请求"""
        self.total_requests += 1
        self.failed_requests += 1
        self.consecutive_failures += 1
        self.last_error_time = time.time()
    
    def get_score(self) -> float:
        """
        计算数据源得分（用于选择最优数据源）
        
        得分越高越好
        """
        if not self.is_available:
            return 0.0
        
        # 优先级权重 (40%)
        priority_score = (5 - self.priority) / 5 * 0.4
        
        # 成功率权重 (30%)
        success_score = self.success_rate * 0.3
        
        # 配置权重 (20%)
        weight_score = self.weight / 100 * 0.2
        
        # 响应速度权重 (10%) - 响应时间越短越好
        if self.avg_response_time > 0:
            speed_score = min(1.0 / self.avg_response_time, 1.0) * 0.1
        else:
            speed_score = 0.1
        
        total_score = priority_score + success_score + weight_score + speed_score
        
        logger.debug(
            f"[MultiProvider] {self.name} 得分: {total_score:.3f} "
            f"(优先级:{priority_score:.3f}, 成功率:{success_score:.3f}, "
            f"权重:{weight_score:.3f}, 速度:{speed_score:.3f})"
        )
        
        return total_score


class MultiProvider(IMarketDataProvider):
    """
    多数据源智能路由Provider
    
    特性:
    - 优先级路由: 优先使用高优先级数据源
    - 负载均衡: 按权重分配请求
    - 故障转移: 自动切换到可用数据源
    - 健康监控: 追踪成功率和响应时间
    - 智能选择: 综合评分选择最优数据源
    """
    
    def __init__(self, providers: List[tuple]):
        """
        初始化多数据源Provider
        
        Args:
            providers: [(provider, name, priority, weight), ...]
                provider: IMarketDataProvider实例
                name: 数据源名称
                priority: 优先级 (1-5，数字越小优先级越高)
                weight: 权重 (1-100，用于负载均衡)
        """
        self.providers: List[IMarketDataProvider] = []
        self.stats: Dict[str, ProviderStats] = {}
        
        for item in providers:
            if len(item) == 4:
                provider, name, priority, weight = item
            else:
                provider, name = item[0], item[1]
                priority, weight = 1, 10
            
            self.providers.append(provider)
            self.stats[name] = ProviderStats(name, priority, weight)
        
        logger.info(f"[MultiProvider] 初始化完成，共 {len(self.providers)} 个数据源")
    
    def _select_provider(self) -> Optional[tuple]:
        """
        智能选择数据源
        
        Returns:
            (provider, stats) 或 None
        """
        # 计算每个数据源的得分
        candidates = []
        
        for provider, (name, stats) in zip(self.providers, self.stats.items()):
            if stats.is_available:
                score = stats.get_score()
                candidates.append((provider, stats, score))
        
        if not candidates:
            logger.error("[MultiProvider] 没有可用的数据源")
            return None
        
        # 按得分排序
        candidates.sort(key=lambda x: x[2], reverse=True)
        
        # 使用加权随机选择（偏向高分）
        # 取前3个候选，按得分加权随机
        top_candidates = candidates[:3]
        total_score = sum(c[2] for c in top_candidates)
        
        if total_score == 0:
            # 如果所有得分都是0，随机选择
            selected = random.choice(top_candidates)
        else:
            # 加权随机
            rand = random.uniform(0, total_score)
            cumsum = 0
            selected = top_candidates[0]
            
            for candidate in top_candidates:
                cumsum += candidate[2]
                if rand <= cumsum:
                    selected = candidate
                    break
        
        provider, stats, score = selected
        logger.debug(f"[MultiProvider] 选择数据源: {stats.name} (得分: {score:.3f})")
        
        return provider, stats
    
    async def _try_with_fallback(self, func_name: str, *args, **kwargs):
        """
        尝试调用方法，支持故障转移
        
        Args:
            func_name: 方法名
            *args, **kwargs: 方法参数
            
        Returns:
            方法返回值
        """
        # 记录所有尝试
        attempts = []
        
        # 最多尝试所有数据源
        max_attempts = len(self.providers)
        
        for attempt in range(max_attempts):
            # 选择数据源
            selected = self._select_provider()
            
            if not selected:
                break
            
            provider, stats = selected
            
            # 检查是否已经尝试过
            if stats.name in attempts:
                continue
            
            attempts.append(stats.name)
            
            try:
                # 记录开始时间
                start_time = time.time()
                
                # 调用方法
                func = getattr(provider, func_name)
                result = await func(*args, **kwargs)
                
                # 记录响应时间
                response_time = time.time() - start_time
                stats.record_success(response_time)
                
                logger.info(
                    f"[MultiProvider] {stats.name} 成功 - "
                    f"耗时: {response_time:.2f}s, "
                    f"成功率: {stats.success_rate*100:.1f}%"
                )
                
                return result
            
            except Exception as e:
                # 记录失败
                stats.record_failure()
                
                logger.warning(
                    f"[MultiProvider] {stats.name} 失败: {e} - "
                    f"连续失败: {stats.consecutive_failures}次, "
                    f"尝试下一个数据源..."
                )
                
                continue
        
        # 所有数据源都失败
        logger.error(f"[MultiProvider] 所有数据源都失败，尝试过: {', '.join(attempts)}")
        return None
    
    async def get_stock_data(
        self,
        symbol: str,
        period: str = "1mo",
        interval: str = "1d"
    ) -> List[KLineData]:
        """获取股票K线数据（带故障转移）"""
        result = await self._try_with_fallback(
            'get_stock_data',
            symbol, period, interval
        )
        return result if result is not None else []
    
    async def get_stock_info(self, symbol: str) -> Optional[StockInfo]:
        """获取股票信息（带故障转移）"""
        return await self._try_with_fallback('get_stock_info', symbol)
    
    async def validate_symbol(self, symbol: str) -> bool:
        """验证股票代码（带故障转移）"""
        result = await self._try_with_fallback('validate_symbol', symbol)
        return result if result is not None else False
    
    async def get_multiple_stocks_data(
        self,
        symbols: List[str],
        period: str = "1mo",
        interval: str = "1d"
    ) -> dict:
        """批量获取股票数据（带故障转移）"""
        result = await self._try_with_fallback(
            'get_multiple_stocks_data',
            symbols, period, interval
        )
        return result if result is not None else {}
    
    def get_statistics(self) -> dict:
        """
        获取所有数据源的统计信息
        
        Returns:
            统计信息字典
        """
        stats = {}
        
        for name, stat in self.stats.items():
            stats[name] = {
                'priority': stat.priority,
                'weight': stat.weight,
                'total_requests': stat.total_requests,
                'successful_requests': stat.successful_requests,
                'failed_requests': stat.failed_requests,
                'success_rate': f"{stat.success_rate*100:.2f}%",
                'avg_response_time': f"{stat.avg_response_time:.2f}s",
                'consecutive_failures': stat.consecutive_failures,
                'is_available': stat.is_available,
                'score': f"{stat.get_score():.3f}"
            }
        
        return stats
    
    def print_statistics(self):
        """打印统计信息"""
        print("\n" + "="*80)
        print("  多数据源统计信息")
        print("="*80)
        
        for name, stat in self.stats.items():
            print(f"\n📊 {name}:")
            print(f"   优先级: {stat.priority}")
            print(f"   权重: {stat.weight}")
            print(f"   总请求: {stat.total_requests}")
            print(f"   成功: {stat.successful_requests}")
            print(f"   失败: {stat.failed_requests}")
            print(f"   成功率: {stat.success_rate*100:.2f}%")
            print(f"   平均响应: {stat.avg_response_time:.2f}s")
            print(f"   连续失败: {stat.consecutive_failures}")
            print(f"   当前状态: {'✅ 可用' if stat.is_available else '❌ 不可用'}")
            print(f"   综合得分: {stat.get_score():.3f}")
        
        print("\n" + "="*80)

