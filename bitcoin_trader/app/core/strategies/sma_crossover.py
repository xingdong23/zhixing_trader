"""
简单移动平均交叉策略 (SMA Crossover)
"""
from typing import List, Dict, Any
import pandas as pd
from . import BaseStrategy


class SMACrossoverStrategy(BaseStrategy):
    """
    SMA交叉策略
    
    策略逻辑：
    - 短期均线上穿长期均线时买入（金叉）
    - 短期均线下穿长期均线时卖出（死叉）
    """
    
    def __init__(self, short_period: int = 10, long_period: int = 30):
        super().__init__(
            name="SMA Crossover",
            parameters={
                "short_period": short_period,
                "long_period": long_period
            }
        )
        self.short_period = short_period
        self.long_period = long_period
        self.last_signal = None
    
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """分析K线数据"""
        if len(klines) < self.long_period:
            return {
                "signal": "hold",
                "reason": "数据不足"
            }
        
        # 转换为DataFrame
        df = pd.DataFrame(klines)
        
        # 计算移动平均线
        df['sma_short'] = df['close'].rolling(window=self.short_period).mean()
        df['sma_long'] = df['close'].rolling(window=self.long_period).mean()
        
        # 获取最新两根K线的均线值
        current = df.iloc[-1]
        previous = df.iloc[-2]
        
        # 检测交叉
        signal = "hold"
        reason = ""
        
        # 金叉：短期均线上穿长期均线
        if (previous['sma_short'] <= previous['sma_long'] and 
            current['sma_short'] > current['sma_long']):
            signal = "buy"
            reason = f"金叉信号：短期均线({self.short_period})上穿长期均线({self.long_period})"
        
        # 死叉：短期均线下穿长期均线
        elif (previous['sma_short'] >= previous['sma_long'] and 
              current['sma_short'] < current['sma_long']):
            signal = "sell"
            reason = f"死叉信号：短期均线({self.short_period})下穿长期均线({self.long_period})"
        
        else:
            if current['sma_short'] > current['sma_long']:
                reason = "短期均线在长期均线上方，持续看多"
            else:
                reason = "短期均线在长期均线下方，持续看空"
        
        self.last_signal = signal
        
        return {
            "signal": signal,
            "price": current['close'],
            "sma_short": current['sma_short'],
            "sma_long": current['sma_long'],
            "reason": reason
        }
    
    def on_tick(self, ticker: Dict) -> Dict[str, Any]:
        """处理实时行情"""
        # 简单策略不基于tick交易
        return {
            "signal": "hold",
            "reason": "等待K线完成"
        }
    
    def get_required_indicators(self) -> List[str]:
        """所需指标"""
        return ["sma"]

