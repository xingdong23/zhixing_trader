"""
混合数据提供者
实现多数据源策略，自动故障转移和负载均衡
"""
from typing import List, Dict, Optional, Any, Dict
from loguru import logger
from datetime import datetime

from ..interfaces import IMarketDataProvider, KLineData
from .yahoo_provider import YahooFinanceProvider
from .alphavantage_provider import AlphaVantageProvider


class HybridProvider(IMarketDataProvider):
    """
    混合数据提供者
    
    策略：
    1. 优先使用雅虎财经（免费、无限额）
    2. 雅虎失败时自动切换到 Alpha Vantage
    3. 记录每个数据源的成功率，动态调整优先级
    """
    
    def __init__(
        self,
        yahoo_provider: Optional[YahooFinanceProvider] = None,
        alphavantage_provider: Optional[AlphaVantageProvider] = None,
        primary_provider: str = "yahoo"
    ):
        """
        初始化混合数据提供者
        
        Args:
            yahoo_provider: 雅虎财经提供者实例
            alphavantage_provider: Alpha Vantage 提供者实例
            primary_provider: 主要数据源 ("yahoo" 或 "alphavantage")
        """
        self.yahoo = yahoo_provider or YahooFinanceProvider(rate_limit_delay=0.2)
        self.alphavantage = alphavantage_provider or AlphaVantageProvider(rate_limit_delay=12.0)
        
        # 设置提供者优先级
        if primary_provider == "alphavantage":
            self.providers = [self.alphavantage, self.yahoo]
            self.provider_names = ["alphavantage", "yahoo"]
        else:
            self.providers = [self.yahoo, self.alphavantage]
            self.provider_names = ["yahoo", "alphavantage"]
        
        # 统计信息
        self.stats = {
            "yahoo": {"success": 0, "failure": 0},
            "alphavantage": {"success": 0, "failure": 0}
        }
    
    def _record_success(self, provider_name: str):
        """记录成功"""
        if provider_name in self.stats:
            self.stats[provider_name]["success"] += 1
    
    def _record_failure(self, provider_name: str):
        """记录失败"""
        if provider_name in self.stats:
            self.stats[provider_name]["failure"] += 1
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        result = {}
        for name, stats in self.stats.items():
            total = stats["success"] + stats["failure"]
            success_rate = (stats["success"] / total * 100) if total > 0 else 0
            result[name] = {
                "success": stats["success"],
                "failure": stats["failure"],
                "total": total,
                "success_rate": f"{success_rate:.2f}%"
            }
        return result
    
    async def get_stock_data(self, symbol: str, period: str, interval: str) -> List[KLineData]:
        """
        获取股票K线数据（带故障转移）
        
        Args:
            symbol: 股票代码
            period: 时间范围
            interval: 时间间隔
        
        Returns:
            K线数据列表
        """
        for provider, provider_name in zip(self.providers, self.provider_names):
            try:
                logger.debug(f"[HybridProvider] 尝试使用 {provider_name} 获取 {symbol} 数据")
                
                data = await provider.get_stock_data(symbol, period, interval)
                
                if data and len(data) > 0:
                    logger.info(f"[HybridProvider] ✅ {provider_name} 成功获取 {symbol} 的 {len(data)} 条数据")
                    self._record_success(provider_name)
                    return data
                else:
                    logger.warning(f"[HybridProvider] {provider_name} 返回空数据")
                    self._record_failure(provider_name)
            
            except Exception as e:
                logger.error(f"[HybridProvider] {provider_name} 获取数据失败: {e}")
                self._record_failure(provider_name)
        
        # 所有数据源都失败
        logger.error(f"[HybridProvider] ❌ 所有数据源均无法获取 {symbol} 的数据")
        return []
    
    async def get_stock_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        获取股票基本信息（带故障转移）
        
        Args:
            symbol: 股票代码
        
        Returns:
            股票信息字典
        """
        for provider, provider_name in zip(self.providers, self.provider_names):
            try:
                logger.debug(f"[HybridProvider] 尝试使用 {provider_name} 获取 {symbol} 基本信息")
                
                info = await provider.get_stock_info(symbol)
                
                if info:
                    logger.info(f"[HybridProvider] ✅ {provider_name} 成功获取 {symbol} 基本信息")
                    self._record_success(provider_name)
                    return info
                else:
                    logger.warning(f"[HybridProvider] {provider_name} 返回空信息")
                    self._record_failure(provider_name)
            
            except Exception as e:
                logger.error(f"[HybridProvider] {provider_name} 获取基本信息失败: {e}")
                self._record_failure(provider_name)
        
        # 所有数据源都失败
        logger.error(f"[HybridProvider] ❌ 所有数据源均无法获取 {symbol} 的基本信息")
        return None
    
    async def validate_symbol(self, symbol: str) -> bool:
        """
        验证股票代码（带故障转移）
        
        Args:
            symbol: 股票代码
        
        Returns:
            是否有效
        """
        for provider, provider_name in zip(self.providers, self.provider_names):
            try:
                logger.debug(f"[HybridProvider] 尝试使用 {provider_name} 验证 {symbol}")
                
                is_valid = await provider.validate_symbol(symbol)
                
                if is_valid:
                    logger.info(f"[HybridProvider] ✅ {provider_name} 验证 {symbol} 成功")
                    self._record_success(provider_name)
                    return True
                else:
                    logger.warning(f"[HybridProvider] {provider_name} 验证 {symbol} 失败")
                    self._record_failure(provider_name)
            
            except Exception as e:
                logger.error(f"[HybridProvider] {provider_name} 验证失败: {e}")
                self._record_failure(provider_name)
        
        # 所有数据源都验证失败
        logger.error(f"[HybridProvider] ❌ 所有数据源均无法验证 {symbol}")
        return False
    
    async def get_multiple_stocks_data(
        self,
        symbols: List[str],
        period: str = "1y",
        interval: str = "1d"
    ) -> Dict[str, List[KLineData]]:
        """
        批量获取多只股票数据
        
        使用主要数据源批量获取，失败的股票使用备用数据源单独获取
        
        Args:
            symbols: 股票代码列表
            period: 时间范围
            interval: 时间间隔
        
        Returns:
            股票代码 -> K线数据列表的字典
        """
        results = {}
        failed_symbols = []
        
        # 尝试使用主要数据源批量获取
        primary_provider = self.providers[0]
        primary_name = self.provider_names[0]
        
        logger.info(f"[HybridProvider] 使用 {primary_name} 批量获取 {len(symbols)} 只股票数据")
        
        try:
            if hasattr(primary_provider, 'get_multiple_stocks_data'):
                # 如果主要提供者支持批量获取
                results = await primary_provider.get_multiple_stocks_data(symbols, period, interval)
                
                # 检查哪些股票获取失败
                for symbol in symbols:
                    if symbol not in results or not results[symbol]:
                        failed_symbols.append(symbol)
                        self._record_failure(primary_name)
                    else:
                        self._record_success(primary_name)
            else:
                # 如果不支持批量获取，逐个获取
                for symbol in symbols:
                    data = await primary_provider.get_stock_data(symbol, period, interval)
                    if data and len(data) > 0:
                        results[symbol] = data
                        self._record_success(primary_name)
                    else:
                        failed_symbols.append(symbol)
                        self._record_failure(primary_name)
        
        except Exception as e:
            logger.error(f"[HybridProvider] {primary_name} 批量获取失败: {e}")
            failed_symbols = symbols  # 所有股票都需要用备用源重试
        
        # 对失败的股票使用备用数据源
        if failed_symbols and len(self.providers) > 1:
            backup_provider = self.providers[1]
            backup_name = self.provider_names[1]
            
            logger.info(f"[HybridProvider] 使用 {backup_name} 重试 {len(failed_symbols)} 只失败的股票")
            
            for symbol in failed_symbols:
                try:
                    data = await backup_provider.get_stock_data(symbol, period, interval)
                    if data and len(data) > 0:
                        results[symbol] = data
                        self._record_success(backup_name)
                        logger.info(f"[HybridProvider] ✅ {backup_name} 成功获取 {symbol}")
                    else:
                        results[symbol] = []
                        self._record_failure(backup_name)
                
                except Exception as e:
                    logger.error(f"[HybridProvider] {backup_name} 获取 {symbol} 失败: {e}")
                    results[symbol] = []
                    self._record_failure(backup_name)
        
        success_count = sum(1 for data in results.values() if data)
        logger.info(f"[HybridProvider] 批量获取完成: {success_count}/{len(symbols)} 成功")
        
        return results

