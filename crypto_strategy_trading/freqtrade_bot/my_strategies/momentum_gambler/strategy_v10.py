"""
动量赌徒 V9 - 布林收口 (BB Squeeze 4H)

设计目标：
- 频率：年均 15-20 次交易 (4年约 60-80 次)
- 周期：4H 级别，持仓数天到数周
- 逻辑：像买期权一样，寻找波动率极低(布林带收口)的时候埋伏，博取波动率扩张

核心参数：
- Timeframe: 4h
- Squeeze: bb_width < 历史分位数 (相对收窄)
- Breakout: 价格突破布林上轨
- Trend: 价格 > EMA 100
"""
import pandas as pd
import numpy as np
import talib


class MomentumGamblerStrategy:
    """动量赌徒 V9 - BB Squeeze"""
    
    PARAMS = {
        # 资金管理
        'leverage': 10,              # 4H波段建议降杠杆到10x，防插针
        'timeframe': '4h',
        
        # 止损 (波段宽止损)
        'stop_loss_pct': 0.08,       # 8% * 10x = 80% 亏损
        
        # 移动止盈 (长线鱼身)
        'use_trailing_stop': True,
        'trailing_stop_positive': 0.10,  # 盈利10%启动
        'trailing_stop_offset': 0.15,    # 回撤15%离场 (给足呼吸空间)
        'take_profit_pct': 999.0,
        
        # 布林带设置
        'bb_period': 20,
        'bb_std': 2.0,
        
        # 挤压条件 (Squeeze) - 放宽以增加频率
        'bb_width_threshold': 0.30,  # 30% (之前是15%)
        # 或者使用相对挤压：width < 过去N根K线的最小值 * 1.5
        
        # 趋势过滤
        'ema_period': 50,           # 4H EMA50
        
        # ADX辅助
        'adx_threshold': 15,        # 15 (降低要求)
        
        # 交易控制
        'max_daily_trades': 1,
        'only_long': True,
        
        'fee_rate': 0.0004,
        'slippage': 0.0002,
    }
    

    """
    V10 - 激进版 (Aggressive Sniper)
    - 入场更早: KC Multiplier 2.5 -> 2.0
    - 挤压更松: Squeeze Quantile 0.20 -> 0.25 (更多机会)
    - 止损更紧: 8% -> 6% (因为入场早，止损应该更近)
    - 移动止盈更敏感: Start 8%, Offset 10% (更快落袋)
    """

    def __init__(self, params=None):
        if params is None:
            params = {}
        
        self.params = {
            'timeframe': '4h',
            'leverage': 10,  # 10x 杠杆
            'stop_loss_pct': 0.06,  # 缩小到 6% (V9 是 8%)
            'take_profit_pct': 999.0, # 没用，靠移动止盈
            
            # --- V10 优化参数 ---
            # 1. 移动止盈 (更敏感)
            'use_trailing_stop': True,
            'trailing_stop_positive': 0.08,  # >8% 激活 (V9 10%)
            'trailing_stop_offset': 0.10,    # 回撤 10% 止盈 (V9 15%)
            
            # 2. TTM Squeeze 参数
            'bb_length': 20,
            'bb_std': 2.0,
            'kc_length': 20,
            'kc_mult': 2.0,   # 降级到 2.0 (之前是 2.5)，更容易突破
            'squeeze_lookback': 100,
            'squeeze_quantile': 0.25, # 放宽到 25% (之前是 20%)
            
            # 3. 过滤器
            'ema_trend_length': 50,
            'adx_threshold': 15,    # 保持
            'adx_length': 14,
        }
        
        # Override with passed params
        self.params.update(params)

    def calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        # 1. Bollinger Bands
        df['bb_upper'], df['bb_middle'], df['bb_lower'] = talib.BBANDS(
            df['close'], 
            timeperiod=self.params['bb_length'], 
            nbdevup=self.params['bb_std'], 
            nbdevdn=self.params['bb_std']
        )
        
        # Bandwidth & Squeeze
        df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df['bb_middle']
        # 历史分位数判断挤压 (V10: 放宽)
        df['squeeze_threshold'] = df['bb_width'].rolling(window=self.params['squeeze_lookback']).quantile(self.params['squeeze_quantile'])
        df['is_squeeze'] = df['bb_width'] < df['squeeze_threshold']
        
        # 2. Keltner Channels (V10: 2.0 mult)
        # KC Middle is EMA
        df['kc_middle'] = talib.EMA(df['close'], timeperiod=self.params['kc_length'])
        df['atr'] = talib.ATR(df['high'], df['low'], df['close'], timeperiod=self.params['kc_length'])
        df['kc_upper'] = df['kc_middle'] + self.params['kc_mult'] * df['atr']
        df['kc_lower'] = df['kc_middle'] - self.params['kc_mult'] * df['atr']
        
        # 3. Momentum & Trend
        df['ema_trend'] = talib.EMA(df['close'], timeperiod=self.params['ema_trend_length'])
        df['adx'] = talib.ADX(df['high'], df['low'], df['close'], timeperiod=self.params['adx_length'])
        
        return df

    def generate_signal(self, df: pd.DataFrame, i: int) -> str:
        """
        V10 激进开仓逻辑:
        1. 发生过挤压 (最近3根K线内)
        2. 突破 KC 上轨 (比 BB 上轨更容易)
        3. 趋势向上
        """
        if i < 50: return 'hold'
        
        curr = df.iloc[i]
        prev = df.iloc[i-1]
        
        # 1. 最近 5 根K线内有过挤压 (放宽条件，允许先挤压再突破)
        recent_squeeze = df['is_squeeze'].iloc[i-5:i].any()
        
        # 2. 突破信号: 价格突破 KC Upper (V10: 用 KC 而不是 BB，或者两者结合)
        # V9 是 Close > BB Upper。V10 试一下 Close > KC Upper (2.0)
        # 注意：通常 BB(2.0) 比 KC(1.5) 宽。这里 KC(2.0) 和 BB(2.0) 差不多。
        # 让我们保持逻辑一致：挤压是低波动，突破是高波动。
        # V10: 只要 Close > BB Upper 且最近有挤压。
        breakout = curr['close'] > curr['bb_upper']
        
        # 3. 趋势过滤
        trend_up = curr['close'] > curr['ema_trend']
        
        # 4. 动量
        momentum = curr['adx'] > self.params['adx_threshold']
        
        if recent_squeeze and breakout and trend_up and momentum:
            return 'long'
            
        return 'hold'

    def get_cost_per_trade(self):
        return 0.001 # 0.1% transaction fee (Binance Taker)
