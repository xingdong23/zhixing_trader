"""
BaseStrategy - 策略基类

所有回测策略的基类
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any
import pandas as pd


class BaseStrategy(ABC):
    """
    策略基类
    
    所有策略都应该继承此类并实现 generate_signals 方法
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        """
        初始化策略
        
        Args:
            config: 策略配置参数
        """
        self.config = config or {}
        self.name = self.__class__.__name__
        
    @abstractmethod
    def generate_signals(self, bar: pd.Series, portfolio: Any) -> List[Dict]:
        """
        生成交易信号
        
        Args:
            bar: 当前K线数据
            portfolio: 投资组合对象
            
        Returns:
            List[Dict]: 交易信号列表，每个信号包含:
                - symbol: 交易标的
                - action: 交易动作 (BUY/SELL/HOLD)
                - quantity: 交易数量
                - reason: 交易原因（可选）
        """
        pass
        
    def on_start(self) -> None:
        """回测开始时调用"""
        pass
        
    def on_end(self) -> None:
        """回测结束时调用"""
        pass
        
    def on_bar(self, bar: pd.Series) -> None:
        """每个K线数据到来时调用"""
        pass
        
    def __repr__(self) -> str:
        return f"{self.name}(config={self.config})"
