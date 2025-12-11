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
    
    def __init__(self, params: dict = None):
        self.params = {**self.PARAMS}
        if params:
            self.params.update(params)
    
    def calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        
        # EMA趋势
        df['ema'] = df['close'].ewm(span=self.params['ema_period'], adjust=False).mean()
        
        # 布林带 (20, 2.0)
        rolling_mean = df['close'].rolling(window=self.params['bb_period']).mean()
        rolling_std = df['close'].rolling(window=self.params['bb_period']).std()
        df['bb_upper'] = rolling_mean + (rolling_std * self.params['bb_std'])
        df['bb_lower'] = rolling_mean - (rolling_std * self.params['bb_std'])
        
        # 历史上轨 (用于突破判断)
        df['bb_upper_shifted'] = df['bb_upper'].shift(1)
        
        # Keltner Channels (20, 1.5 ATR) - 用于判定Squeeze
        # TR calculation
        high = df['high']
        low = df['low']
        close = df['close']
        
        tr1 = pd.DataFrame(high - low)
        tr2 = pd.DataFrame(abs(high - close.shift(1)))
        tr3 = pd.DataFrame(abs(low - close.shift(1)))
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(window=self.params['bb_period']).mean()
        
        kc_mid = df['close'].rolling(window=self.params['bb_period']).mean()
        df['kc_upper'] = kc_mid + (atr * 2.5)  # 进一步放宽：KC 2.5 ATR
        df['kc_lower'] = kc_mid - (atr * 2.5)
        
        # Squeeze 状态: BB 处于 KC 内部
        df['squeeze_on'] = (df['bb_upper'] < df['kc_upper']) & (df['bb_lower'] > df['kc_lower'])
        
        # ADX
        plus_dm = high.diff()
        minus_dm = low.diff()
        plus_dm[plus_dm < 0] = 0
        minus_dm[minus_dm > 0] = 0
        minus_dm = -minus_dm
        plus_dm[plus_dm > minus_dm] = 0
        minus_dm[minus_dm > plus_dm] = 0
        
        atr_adx = tr.rolling(14).mean()
        plus_di = 100 * (plus_dm.rolling(14).mean() / atr_adx)
        minus_di = 100 * (minus_dm.rolling(14).mean() / atr_adx)
        dx = (abs(plus_di - minus_di) / (plus_di + minus_di)) * 100
        df['adx'] = dx.rolling(14).mean()
        
        if 'date' in df.columns:
            df['hour'] = df['date'].dt.hour
            df['trade_date'] = df['date'].dt.date
            
        return df
    
    def populate_entry_trend(self, df: pd.DataFrame, metadata: dict) -> pd.DataFrame:
        # V11 向量化信号计算
        
        # 1. Recent Squeeze (Rolling max of booleans)
        # Using rolling(5).max() on boolean column returns 1.0 if any true
        df['recent_squeeze'] = df['squeeze_on'].rolling(window=5).max() > 0
        
        # 2. Breakout
        breakout = (df['close'] > df['bb_upper'])
        
        # 3. Trend
        trend_up = (df['close'] > df['ema'])
        
        # 4. ADX ok
        adx_ok = (df['adx'] > self.params['adx_threshold'])
        
        # 5. Crazy Bull
        crazy_bull = (df['adx'] > 30) & breakout & trend_up
        
        # Combine
        v9_logic = (df['recent_squeeze'] & breakout & trend_up & adx_ok)
        
        df.loc[v9_logic | crazy_bull, 'enter_long'] = 1
        return df

    def generate_signal(self, df: pd.DataFrame, i: int) -> str:
        if i < 50: return 'hold'
        if 'enter_long' in df.columns:
            if df['enter_long'].iloc[i] == 1:
                return 'long'
            return 'hold'
            
        # Fallback to manual if column missing (should not happen if populate called)
        curr = df.iloc[i]
        # ... (rest of legacy manual check if needed, but we can replace it)
        return 'hold'
    
    def get_cost_per_trade(self) -> float:
        return (self.params['fee_rate'] + self.params['slippage']) * 2
