"""
StrategyAdapter - 策略适配器

用于适配不同模块的策略到统一回测接口
"""

from typing import Any, Dict
from .base import BaseStrategy


class StrategyAdapter:
    """
    策略适配器
    
    将股票策略和加密货币策略适配到统一的回测接口
    """
    
    @staticmethod
    def from_stock_strategy(strategy_class: Any, config: Dict = None) -> BaseStrategy:
        """
        从股票策略创建适配器
        
        Args:
            strategy_class: 股票策略类或实例
            config: 策略配置
            
        Returns:
            BaseStrategy: 适配后的策略
        """
        return StockStrategyAdapter(strategy_class, config)
        
    @staticmethod
    def from_crypto_strategy(strategy_class: Any, config: Dict = None) -> BaseStrategy:
        """
        从加密货币策略创建适配器
        
        Args:
            strategy_class: 加密货币策略类或实例
            config: 策略配置
            
        Returns:
            BaseStrategy: 适配后的策略
        """
        return CryptoStrategyAdapter(strategy_class, config)


class StockStrategyAdapter(BaseStrategy):
    """股票策略适配器"""
    
    def __init__(self, strategy_class: Any, config: Dict = None):
        super().__init__(config)
        # 如果是类，实例化它；如果是实例，直接使用
        if isinstance(strategy_class, type):
            self.strategy = strategy_class(config or {})
        else:
            self.strategy = strategy_class
            
    def generate_signals(self, bar, portfolio):
        """
        适配股票策略的信号生成
        
        这里需要根据实际的股票策略接口进行适配
        """
        # TODO: 实现具体的适配逻辑
        # 这里只是示例，实际需要根据 stock_strategy_trading 的接口来实现
        if hasattr(self.strategy, 'analyze'):
            result = self.strategy.analyze(bar.name, bar.to_frame().T)
            # 转换为统一格式
            return self._convert_stock_signals(result)
        return []
        
    def _convert_stock_signals(self, result):
        """转换股票策略信号为统一格式"""
        # TODO: 实现信号转换逻辑
        return []


class CryptoStrategyAdapter(BaseStrategy):
    """加密货币策略适配器"""
    
    def __init__(self, strategy_class: Any, config: Dict = None):
        super().__init__(config)
        # 如果是类，实例化它；如果是实例，直接使用
        if isinstance(strategy_class, type):
            self.strategy = strategy_class(config or {})
        else:
            self.strategy = strategy_class
            
    def generate_signals(self, bar, portfolio):
        """
        适配加密货币策略的信号生成
        
        这里需要根据实际的加密货币策略接口进行适配
        """
        # TODO: 实现具体的适配逻辑
        # 这里只是示例，实际需要根据 crypto_strategy_trading 的接口来实现
        if hasattr(self.strategy, 'analyze'):
            result = self.strategy.analyze(bar.to_frame().T)
            # 转换为统一格式
            return self._convert_crypto_signals(result)
        return []
        
    def _convert_crypto_signals(self, result):
        """转换加密货币策略信号为统一格式"""
        # TODO: 实现信号转换逻辑
        return []
