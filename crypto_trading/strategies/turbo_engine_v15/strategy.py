"""
TurboEngine V15 - 涡轮增压信号引擎

设计目标：
- 频率：捕捉极强趋势和波动率挤压
- 周期：4H 级别
- 逻辑：Squeeze 挤压突破 + CrazyBull ADX>30 强力突破
- 支持：多空双向交易

核心参数：
- Timeframe: 4h
- Squeeze: bb_width < threshold
- CrazyBull: ADX > 30 & Breakout
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

class TurboEngineV15(BaseStrategy):
    """
    TurboEngine V15 - 涡轮增压信号引擎
    
    核心逻辑:
    1. 埋伏模式: Squeeze 挤压 + 突破
    2. 追涨模式: ADX > 30 强力突破
    
    多头: 价格突破上轨 + 趋势向上
    空头: 价格跌破下轨 + 趋势向下
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
        'only_long': False,  # 现在支持双向
    }
    
    @property
    def name(self) -> str:
        return "TurboEngine V15"
    
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
        批量计算入场信号（多空双向）
        用于回测时的向量化计算
        """
        df = df.copy()
        
        # 1. 最近 5 根 K 线有 Squeeze
        df['recent_squeeze'] = df['squeeze_on'].rolling(window=5).max() > 0
        
        # 2. 突破
        breakout_up = df['close'] > df['bb_upper']
        breakout_down = df['close'] < df['bb_lower']
        
        # 3. 趋势
        trend_up = df['close'] > df['ema']
        trend_down = df['close'] < df['ema']
        
        # 4. ADX 过滤
        adx_ok = df['adx'] > self.params['adx_threshold']
        crazy_adx = df['adx'] > self.params['crazy_bull_adx']
        
        # ========== 做多信号 ==========
        # Squeeze 逻辑 (埋伏)
        long_squeeze = df['recent_squeeze'] & breakout_up & trend_up & adx_ok
        # Crazy Bull 逻辑 (追涨)
        long_crazy = crazy_adx & breakout_up & trend_up
        df['enter_long'] = (long_squeeze | long_crazy).astype(int)
        
        # ========== 做空信号 ==========
        # Squeeze 逻辑 (埋伏)
        short_squeeze = df['recent_squeeze'] & breakout_down & trend_down & adx_ok
        # Crazy Bear 逻辑 (追跌)
        short_crazy = crazy_adx & breakout_down & trend_down
        df['enter_short'] = (short_squeeze | short_crazy).astype(int)
        
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
        if 'enter_long' in df.columns and 'enter_short' in df.columns:
            if df['enter_long'].iloc[index] == 1:
                return 'long'
            if df['enter_short'].iloc[index] == 1:
                return 'short'
            return 'hold'
        
        # 实时计算信号
        curr = df.iloc[index]
        prev_5 = df.iloc[max(0, index-5):index+1]
        
        # 公共条件
        adx_ok = curr['adx'] > self.params['adx_threshold']
        crazy_adx = curr['adx'] > self.params['crazy_bull_adx']
        recent_squeeze = prev_5['squeeze_on'].any()
        
        # ========== 做多条件 ==========
        breakout_up = curr['close'] > curr['bb_upper']
        trend_up = curr['close'] > curr['ema']
        
        if recent_squeeze and breakout_up and trend_up and adx_ok:
            return 'long'
        if crazy_adx and breakout_up and trend_up:
            return 'long'
        
        # ========== 做空条件 ==========
        if not self.params.get('only_long', False):
            breakout_down = curr['close'] < curr['bb_lower']
            trend_down = curr['close'] < curr['ema']
            
            if recent_squeeze and breakout_down and trend_down and adx_ok:
                return 'short'
            if crazy_adx and breakout_down and trend_down:
                return 'short'
        
        return 'hold'

