"""
交易策略模块
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from datetime import datetime


class BaseStrategy(ABC):
    """策略基类"""
    
    def __init__(self, name: str, parameters: Dict[str, Any] = None):
        self.name = name
        self.parameters = parameters or {}
    
    @abstractmethod
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        分析K线数据，生成交易信号
        
        Args:
            klines: K线数据列表
        
        Returns:
            交易信号 {
                "signal": "buy" | "sell" | "hold",
                "price": float,
                "amount": float,
                "reason": str
            }
        """
        pass
    
    @abstractmethod
    def on_tick(self, ticker: Dict) -> Dict[str, Any]:
        """
        处理实时行情tick
        
        Args:
            ticker: 实时行情数据
        
        Returns:
            交易信号
        """
        pass
    
    def validate_parameters(self) -> bool:
        """验证策略参数"""
        return True
    
    def get_required_indicators(self) -> List[str]:
        """获取策略所需的技术指标"""
        return []


# 导入具体策略
from .sma_crossover import SMACrossoverStrategy
from .steady_profit_strategy import SteadyProfitStrategy

__all__ = [
    'BaseStrategy',
    'SMACrossoverStrategy',
    'SteadyProfitStrategy',
]

