"""
策略基类
所有策略都应继承此类
"""
from abc import ABC, abstractmethod
import pandas as pd
from typing import Dict, Any, Optional
import json
from pathlib import Path


class BaseStrategy(ABC):
    """
    策略基类
    
    所有策略必须实现:
    - calculate_indicators(): 计算技术指标
    - generate_signal(): 生成交易信号
    """
    
    # 默认参数
    DEFAULT_PARAMS = {
        'leverage': 10,
        'stop_loss_pct': 0.08,
        'trailing_stop_activation': 0.10,
        'trailing_stop_callback': 0.15,
        'take_profit_pct': 999.0,
        'fee_rate': 0.0004,
        'slippage': 0.0002,
    }
    
    def __init__(self, params: Optional[Dict[str, Any]] = None):
        """
        初始化策略
        
        Args:
            params: 策略参数，会与 DEFAULT_PARAMS 合并
        """
        self._params = {**self.DEFAULT_PARAMS}
        if params:
            self._params.update(params)
    
    @property
    def params(self) -> Dict[str, Any]:
        """获取策略参数"""
        return self._params
    
    @property
    @abstractmethod
    def name(self) -> str:
        """策略名称"""
        pass
    
    @property
    @abstractmethod
    def timeframe(self) -> str:
        """策略时间周期"""
        pass
    
    @abstractmethod
    def calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        计算技术指标
        
        Args:
            df: 原始 OHLCV 数据
            
        Returns:
            带有指标列的 DataFrame
        """
        pass
    
    @abstractmethod
    def generate_signal(self, df: pd.DataFrame, index: int) -> str:
        """
        生成交易信号
        
        Args:
            df: 带指标的 DataFrame
            index: 当前 K 线索引
            
        Returns:
            'long': 做多
            'short': 做空
            'close': 平仓
            'hold': 持有/等待
        """
        pass
    
    def get_cost_per_trade(self) -> float:
        """获取单次交易成本 (手续费 + 滑点)"""
        return (self._params.get('fee_rate', 0) + self._params.get('slippage', 0)) * 2
    
    def should_stop_loss(self, entry_price: float, current_price: float, side: str = 'long') -> bool:
        """
        检查是否触发止损
        
        Args:
            entry_price: 开仓价格
            current_price: 当前价格
            side: 'long' or 'short'
        """
        if entry_price <= 0:
            return False
        
        sl_pct = self._params.get('stop_loss_pct', 0.08)
        
        if side == 'long':
            pnl_pct = (current_price - entry_price) / entry_price
            return pnl_pct <= -sl_pct
        else:  # short
            pnl_pct = (entry_price - current_price) / entry_price
            return pnl_pct <= -sl_pct
    
    def should_trailing_stop(
        self,
        entry_price: float,
        current_price: float,
        highest_pnl_pct: float,
        side: str = 'long'
    ) -> bool:
        """
        检查是否触发移动止盈
        
        Args:
            entry_price: 开仓价格
            current_price: 当前价格
            highest_pnl_pct: 历史最高盈利百分比
            side: 'long' or 'short'
        """
        if entry_price <= 0:
            return False
        
        activation = self._params.get('trailing_stop_activation', 0.10)
        callback = self._params.get('trailing_stop_callback', 0.15)
        
        if side == 'long':
            current_pnl = (current_price - entry_price) / entry_price
        else:
            current_pnl = (entry_price - current_price) / entry_price
        
        # 只有历史最高盈利超过激活点才检查
        if highest_pnl_pct >= activation:
            if current_pnl < (highest_pnl_pct - callback):
                return True
        
        return False
    
    @classmethod
    def from_config(cls, config_path: str) -> 'BaseStrategy':
        """从配置文件加载策略"""
        with open(config_path, 'r') as f:
            config = json.load(f)
        return cls(params=config.get('params', {}))
    
    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} name={self.name} timeframe={self.timeframe}>"
