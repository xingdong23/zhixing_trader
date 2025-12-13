"""
动量赌徒 V11 (Final) - 疯牛版 (Crazy Bull 4H)

设计目标：
- 频率：捕捉极强趋势和波动率挤压
- 周期：4H 级别
- 逻辑：V9 Squeeze + V11 Crazy Bull (ADX>30 强力突破)

核心参数：
- Timeframe: 4h
- Squeeze: bb_width < threshold
- Crazy Bull: ADX > 30 & Breakout (忽略 Squeeze)
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional

from ..base_strategy import BaseStrategy
from .indicators import (
    calculate_ema,
    calculate_bollinger_bands,
    calculate_adx,
    calculate_keltner_channels
)


class MomentumV11Strategy(BaseStrategy):
    """
    动量赌徒 V11 - Crazy Bull Edition
    
    核心逻辑:
    1. V9 经典模式 (埋伏): Squeeze + Breakout
    2. V11 疯牛模式 (追涨): ADX > 30 + Breakout (忽略 Squeeze)
    """
    
    DEFAULT_PARAMS = {
        **BaseStrategy.DEFAULT_PARAMS,
        
        # 策略专属参数
        'bb_period': 20,
        'bb_std': 2.0,
        'ema_period': 50,
        'adx_threshold': 15,
        'crazy_bull_adx': 30,
        
        # 交易控制
        'max_daily_trades': 1,
        'only_long': True,
    }
    
    @property
    def name(self) -> str:
        return "Momentum V11 - Crazy Bull"
    
    @property
    def timeframe(self) -> str:
        return "4h"
    
    def calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """计算技术指标"""
        df = df.copy()
        
        # 1. EMA 趋势
        df['ema'] = calculate_ema(df['close'], self.params['ema_period'])
        
        # 2. 布林带
        bb = calculate_bollinger_bands(
            df['close'],
            self.params['bb_period'],
            self.params['bb_std']
        )
        df['bb_upper'] = bb['upper']
        df['bb_lower'] = bb['lower']
        df['bb_width'] = bb['width']
        
        # 3. Keltner Channels (用于 Squeeze 判断)
        kc = calculate_keltner_channels(df, self.params['bb_period'], 2.5)
        df['kc_upper'] = kc['upper']
        df['kc_lower'] = kc['lower']
        
        # 4. Squeeze 判断
        df['squeeze_on'] = (df['bb_upper'] < df['kc_upper']) & (df['bb_lower'] > df['kc_lower'])
        
        # 5. ADX
        df['adx'] = calculate_adx(df, 14)
        
        # 6. 时间信息
        if 'date' in df.columns:
            df['hour'] = df['date'].dt.hour
            df['trade_date'] = df['date'].dt.date
        
        return df
    
    def populate_entry_signals(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        批量计算入场信号
        用于回测时的向量化计算
        """
        df = df.copy()
        
        # 1. 最近 5 根 K 线有 Squeeze
        df['recent_squeeze'] = df['squeeze_on'].rolling(window=5).max() > 0
        
        # 2. 突破上轨
        breakout = df['close'] > df['bb_upper']
        
        # 3. 趋势向上
        trend_up = df['close'] > df['ema']
        
        # 4. ADX 过滤
        adx_ok = df['adx'] > self.params['adx_threshold']
        
        # 5. Crazy Bull (V11 特性)
        crazy_bull = (df['adx'] > self.params['crazy_bull_adx']) & breakout & trend_up
        
        # 6. Squeeze 逻辑
        squeeze_logic = df['recent_squeeze'] & breakout & trend_up & adx_ok
        
        # 合并信号
        df['enter_long'] = (squeeze_logic | crazy_bull).astype(int)
        
        return df
    
    def generate_signal(self, df: pd.DataFrame, index: int) -> str:
        """
        生成单根 K 线的交易信号
        
        Args:
            df: 带指标的 DataFrame
            index: 当前索引
            
        Returns:
            'long', 'short', 'close', 'hold'
        """
        if index < 50:
            return 'hold'
        
        # 如果已经计算过信号
        if 'enter_long' in df.columns:
            if df['enter_long'].iloc[index] == 1:
                return 'long'
            return 'hold'
        
        # 实时计算信号
        curr = df.iloc[index]
        prev_5 = df.iloc[max(0, index-5):index+1]
        
        # 检查条件
        breakout = curr['close'] > curr['bb_upper']
        trend_up = curr['close'] > curr['ema']
        adx_ok = curr['adx'] > self.params['adx_threshold']
        recent_squeeze = prev_5['squeeze_on'].any()
        crazy_bull = curr['adx'] > self.params['crazy_bull_adx']
        
        # V9 Squeeze 逻辑
        if recent_squeeze and breakout and trend_up and adx_ok:
            return 'long'
        
        # V11 Crazy Bull 逻辑
        if crazy_bull and breakout and trend_up:
            return 'long'
        
        return 'hold'
