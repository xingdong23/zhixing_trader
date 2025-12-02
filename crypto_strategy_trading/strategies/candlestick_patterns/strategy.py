"""
K线形态策略 (Candlestick Pattern Strategy)

识别典型的K线反转形态进行交易:
1. 锤子线 (Hammer) - 底部反转信号
2. 倒锤子线 (Inverted Hammer) - 底部反转信号
3. 上吊线 (Hanging Man) - 顶部反转信号
4. 射击之星 (Shooting Star) - 顶部反转信号
5. 看涨吞没 (Bullish Engulfing) - 底部反转信号
6. 看跌吞没 (Bearish Engulfing) - 顶部反转信号
7. 十字星 (Doji) - 转势信号
8. 晨星 (Morning Star) - 底部反转信号
9. 暮星 (Evening Star) - 顶部反转信号

策略逻辑:
- 在下跌趋势中出现底部反转形态 -> 做多
- 在上涨趋势中出现顶部反转形态 -> 做空
- 止损设在形态低点/高点
- 止盈按盈亏比设置
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)


class CandlestickPatternStrategy:
    """K线形态策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典
        """
        self.name = "K线形态策略"
        self.parameters = parameters
        
        # 资金管理
        self.capital = float(parameters.get('total_capital', 300.0))
        self.risk_per_trade = float(parameters.get('risk_per_trade', 0.05))  # 提高单笔风险5%
        self.leverage = float(parameters.get('leverage', 10.0))  # 提高杠杨10倍
        
        # 形态识别参数
        self.body_ratio_threshold = float(parameters.get('body_ratio_threshold', 0.3))  # 实体占比阈值
        self.shadow_ratio_threshold = float(parameters.get('shadow_ratio_threshold', 2.0))  # 影线与实体比例阈值
        self.doji_body_ratio = float(parameters.get('doji_body_ratio', 0.1))  # 十字星实体占比
        
        # 趋势判断参数(短线优化)
        self.trend_period = int(parameters.get('trend_period', 12))  # 趋势判断周期
        self.ema_period = int(parameters.get('ema_period', 9))  # 快EMA
        self.ema_slow_period = int(parameters.get('ema_slow_period', 21))  # 慢EMA
        self.trend_strength_threshold = float(parameters.get('trend_strength_threshold', 0.005))  # 趋势强度阈值(降低)
        
        # RSI过滤参数
        self.use_rsi_filter = parameters.get('use_rsi_filter', True)
        self.rsi_period = int(parameters.get('rsi_period', 14))
        self.rsi_oversold = float(parameters.get('rsi_oversold', 35))  # 超卖阈值
        self.rsi_overbought = float(parameters.get('rsi_overbought', 65))  # 超买阈值
        
        # 止损止盈(短线优化)
        self.risk_reward_ratio = float(parameters.get('risk_reward_ratio', 2.5))  # 盈亏比2.5:1
        self.atr_period = int(parameters.get('atr_period', 14))  # ATR周期
        self.stop_loss_atr_multiplier = float(parameters.get('stop_loss_atr_multiplier', 1.5))  # 止损稍宽
        
        # 移动止盈(默认关闭)
        self.use_trailing_stop = parameters.get('use_trailing_stop', False)
        self.trailing_stop_activation = float(parameters.get('trailing_stop_activation', 0.8))  # 盈创80%后启动
        self.trailing_stop_distance = float(parameters.get('trailing_stop_distance', 0.5))  # 回撤50%利润即止盈
        
        # 信号过滤
        self.use_volume_confirmation = parameters.get('use_volume_confirmation', True)
        self.volume_threshold = float(parameters.get('volume_threshold', 1.2))  # 成交量阈值
        self.require_trend_context = parameters.get('require_trend_context', True)
        
        # 连续亏损保护
        self.max_consecutive_losses = int(parameters.get('max_consecutive_losses', 4))
        self.cooldown_bars = int(parameters.get('cooldown_bars', 6))  # 冷却K线数(缩短)
        
        # 允许的形态类型(只留高质量形态)
        self.enabled_patterns = parameters.get('enabled_patterns', [
            'bullish_engulfing', 'bearish_engulfing', 'morning_star', 'evening_star'
        ])
        
        # 允许做空
        self.allow_short = parameters.get('allow_short', False)  # 默认关闭做空
        
        # 趋势确认最小强度
        self.min_trend_strength = float(parameters.get('min_trend_strength', 0.005))
        
        # 关键位置过滤
        self.use_key_level_filter = parameters.get('use_key_level_filter', True)
        self.ema_distance_threshold = float(parameters.get('ema_distance_threshold', 0.008))  # 价格距离EMA阈值0.8%
        self.support_resistance_lookback = int(parameters.get('support_resistance_lookback', 100))  # 支撑压力回看周期
        self.sr_zone_threshold = float(parameters.get('sr_zone_threshold', 0.005))  # 支撑压力位区域阈值0.5%
        
        # 状态变量
        self.current_position: Optional[Dict] = None
        self.entry_price = None
        self.stop_loss_price = None
        self.take_profit_price = None
        
        # 统计
        self.total_trades = 0
        self.winning_trades = 0
        self.pattern_stats: Dict[str, Dict] = {}  # 各形态统计
        self.consecutive_losses = 0  # 连续亏损计数
        self.cooldown_counter = 0  # 冷却计数器
        self.bars_since_last_trade = 0  # 距上次交易的K线数
        self.highest_profit = 0.0  # 持仓期间最高利润
        self.trailing_stop_active = False  # 移动止盈是否激活
        
        logger.info(f"✓ {self.name}初始化完成")
        logger.info(f"  资金: {self.capital} USDT")
        logger.info(f"  每笔风险: {self.risk_per_trade * 100}%")
        logger.info(f"  杠杆: {self.leverage}x")
        logger.info(f"  盈亏比: {self.risk_reward_ratio}:1")
        logger.info(f"  启用形态: {self.enabled_patterns}")
    
    def calculate_ema(self, series: pd.Series, period: int) -> pd.Series:
        """计算EMA"""
        return series.ewm(span=period, adjust=False).mean()
    
    def calculate_atr(self, df: pd.DataFrame, period: int) -> pd.Series:
        """计算ATR"""
        high = df['high']
        low = df['low']
        close = df['close']
        
        tr1 = high - low
        tr2 = abs(high - close.shift(1))
        tr3 = abs(low - close.shift(1))
        
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        return tr.rolling(window=period).mean()
    
    def calculate_rsi(self, series: pd.Series, period: int) -> pd.Series:
        """计算RSI"""
        delta = series.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))
    
    def is_bullish_candle(self, bar: pd.Series) -> bool:
        """是否为阳线"""
        return bar['close'] > bar['open']
    
    def is_bearish_candle(self, bar: pd.Series) -> bool:
        """是否为阴线"""
        return bar['close'] < bar['open']
    
    def get_body_size(self, bar: pd.Series) -> float:
        """获取实体大小"""
        return abs(bar['close'] - bar['open'])
    
    def get_total_range(self, bar: pd.Series) -> float:
        """获取总波幅"""
        return bar['high'] - bar['low']
    
    def get_upper_shadow(self, bar: pd.Series) -> float:
        """获取上影线长度"""
        return bar['high'] - max(bar['open'], bar['close'])
    
    def get_lower_shadow(self, bar: pd.Series) -> float:
        """获取下影线长度"""
        return min(bar['open'], bar['close']) - bar['low']
    
    def is_hammer(self, bar: pd.Series) -> bool:
        """
        锤子线: 小实体在顶部，长下影线，几乎无上影线
        出现在下跌趋势末端，看涨信号
        """
        if 'hammer' not in self.enabled_patterns:
            return False
            
        total_range = self.get_total_range(bar)
        if total_range == 0:
            return False
            
        body_size = self.get_body_size(bar)
        lower_shadow = self.get_lower_shadow(bar)
        upper_shadow = self.get_upper_shadow(bar)
        
        # 条件: 下影线 >= 实体的2倍，上影线很小
        body_ratio = body_size / total_range
        return (lower_shadow >= body_size * self.shadow_ratio_threshold and
                upper_shadow <= body_size * 0.3 and
                body_ratio <= self.body_ratio_threshold + 0.2)
    
    def is_inverted_hammer(self, bar: pd.Series) -> bool:
        """
        倒锤子线: 小实体在底部，长上影线，几乎无下影线
        出现在下跌趋势末端，看涨信号
        """
        if 'inverted_hammer' not in self.enabled_patterns:
            return False
            
        total_range = self.get_total_range(bar)
        if total_range == 0:
            return False
            
        body_size = self.get_body_size(bar)
        lower_shadow = self.get_lower_shadow(bar)
        upper_shadow = self.get_upper_shadow(bar)
        
        body_ratio = body_size / total_range
        return (upper_shadow >= body_size * self.shadow_ratio_threshold and
                lower_shadow <= body_size * 0.3 and
                body_ratio <= self.body_ratio_threshold + 0.2)
    
    def is_hanging_man(self, bar: pd.Series) -> bool:
        """
        上吊线: 形态与锤子线相同，但出现在上涨趋势末端
        看跌信号
        """
        if 'hanging_man' not in self.enabled_patterns:
            return False
        # 形态判断与锤子线相同
        total_range = self.get_total_range(bar)
        if total_range == 0:
            return False
            
        body_size = self.get_body_size(bar)
        lower_shadow = self.get_lower_shadow(bar)
        upper_shadow = self.get_upper_shadow(bar)
        
        body_ratio = body_size / total_range
        return (lower_shadow >= body_size * self.shadow_ratio_threshold and
                upper_shadow <= body_size * 0.3 and
                body_ratio <= self.body_ratio_threshold + 0.2)
    
    def is_shooting_star(self, bar: pd.Series) -> bool:
        """
        射击之星: 形态与倒锤子线相同，但出现在上涨趋势末端
        看跌信号
        """
        if 'shooting_star' not in self.enabled_patterns:
            return False
        # 形态判断与倒锤子线相同
        total_range = self.get_total_range(bar)
        if total_range == 0:
            return False
            
        body_size = self.get_body_size(bar)
        lower_shadow = self.get_lower_shadow(bar)
        upper_shadow = self.get_upper_shadow(bar)
        
        body_ratio = body_size / total_range
        return (upper_shadow >= body_size * self.shadow_ratio_threshold and
                lower_shadow <= body_size * 0.3 and
                body_ratio <= self.body_ratio_threshold + 0.2)
    
    def is_bullish_engulfing(self, prev_bar: pd.Series, curr_bar: pd.Series) -> bool:
        """
        看涨吞没: 阳线实体完全包裹前一根阴线实体
        出现在下跌趋势末端，强烈看涨信号
        """
        if 'bullish_engulfing' not in self.enabled_patterns:
            return False
            
        # 前一根必须是阴线，当前必须是阳线
        if not self.is_bearish_candle(prev_bar) or not self.is_bullish_candle(curr_bar):
            return False
        
        # 当前阳线实体必须完全包裹前一根阴线实体
        curr_body_top = curr_bar['close']
        curr_body_bottom = curr_bar['open']
        prev_body_top = prev_bar['open']
        prev_body_bottom = prev_bar['close']
        
        return (curr_body_top > prev_body_top and 
                curr_body_bottom < prev_body_bottom)
    
    def is_bearish_engulfing(self, prev_bar: pd.Series, curr_bar: pd.Series) -> bool:
        """
        看跌吞没: 阴线实体完全包裹前一根阳线实体
        出现在上涨趋势末端，强烈看跌信号
        """
        if 'bearish_engulfing' not in self.enabled_patterns:
            return False
            
        # 前一根必须是阳线，当前必须是阴线
        if not self.is_bullish_candle(prev_bar) or not self.is_bearish_candle(curr_bar):
            return False
        
        # 当前阴线实体必须完全包裹前一根阳线实体
        curr_body_top = curr_bar['open']
        curr_body_bottom = curr_bar['close']
        prev_body_top = prev_bar['close']
        prev_body_bottom = prev_bar['open']
        
        return (curr_body_top > prev_body_top and 
                curr_body_bottom < prev_body_bottom)
    
    def is_doji(self, bar: pd.Series) -> bool:
        """
        十字星: 开盘价和收盘价几乎相等
        表示多空力量均衡，可能反转
        """
        if 'doji' not in self.enabled_patterns:
            return False
            
        total_range = self.get_total_range(bar)
        if total_range == 0:
            return False
            
        body_size = self.get_body_size(bar)
        body_ratio = body_size / total_range
        
        return body_ratio <= self.doji_body_ratio
    
    def is_morning_star(self, bars: List[pd.Series]) -> bool:
        """
        晨星: 三根K线组合
        1. 第一根: 大阴线
        2. 第二根: 小实体(星线)，跳空低开
        3. 第三根: 大阳线，深入第一根阴线实体
        底部反转，强烈看涨
        """
        if 'morning_star' not in self.enabled_patterns:
            return False
        if len(bars) < 3:
            return False
            
        first, second, third = bars[-3], bars[-2], bars[-1]
        
        # 第一根: 大阴线
        if not self.is_bearish_candle(first):
            return False
        first_body = self.get_body_size(first)
        first_range = self.get_total_range(first)
        if first_range == 0 or first_body / first_range < 0.5:
            return False
        
        # 第二根: 小实体
        second_body = self.get_body_size(second)
        second_range = self.get_total_range(second)
        if second_range == 0:
            return False
        if second_body / second_range > 0.3:
            return False
        
        # 第三根: 大阳线
        if not self.is_bullish_candle(third):
            return False
        third_body = self.get_body_size(third)
        third_range = self.get_total_range(third)
        if third_range == 0 or third_body / third_range < 0.5:
            return False
        
        # 第三根收盘价深入第一根阴线实体
        first_mid = (first['open'] + first['close']) / 2
        return third['close'] > first_mid
    
    def is_evening_star(self, bars: List[pd.Series]) -> bool:
        """
        暮星: 三根K线组合
        1. 第一根: 大阳线
        2. 第二根: 小实体(星线)，跳空高开
        3. 第三根: 大阴线，深入第一根阳线实体
        顶部反转，强烈看跌
        """
        if 'evening_star' not in self.enabled_patterns:
            return False
        if len(bars) < 3:
            return False
            
        first, second, third = bars[-3], bars[-2], bars[-1]
        
        # 第一根: 大阳线
        if not self.is_bullish_candle(first):
            return False
        first_body = self.get_body_size(first)
        first_range = self.get_total_range(first)
        if first_range == 0 or first_body / first_range < 0.5:
            return False
        
        # 第二根: 小实体
        second_body = self.get_body_size(second)
        second_range = self.get_total_range(second)
        if second_range == 0:
            return False
        if second_body / second_range > 0.3:
            return False
        
        # 第三根: 大阴线
        if not self.is_bearish_candle(third):
            return False
        third_body = self.get_body_size(third)
        third_range = self.get_total_range(third)
        if third_range == 0 or third_body / third_range < 0.5:
            return False
        
        # 第三根收盘价深入第一根阳线实体
        first_mid = (first['open'] + first['close']) / 2
        return third['close'] < first_mid
    
    def detect_trend(self, df: pd.DataFrame) -> tuple:
        """
        判断当前趋势(增强版)
        
        Returns:
            (trend: str, strength: float) - 趋势方向和强度
        """
        if len(df) < max(self.trend_period, self.ema_slow_period):
            return 'sideways', 0.0
        
        # 使用双EMA判断趋势
        ema_fast = self.calculate_ema(df['close'], self.ema_period)
        ema_slow = self.calculate_ema(df['close'], self.ema_slow_period)
        
        current_price = df['close'].iloc[-1]
        current_ema_fast = ema_fast.iloc[-1]
        current_ema_slow = ema_slow.iloc[-1]
        
        # 计算EMA变化率(使用更长周期)
        recent_ema = ema_fast.iloc[-self.trend_period:]
        ema_change = (recent_ema.iloc[-1] - recent_ema.iloc[0]) / recent_ema.iloc[0]
        
        # 综合判断趋势
        strength = abs(ema_change)
        
        # 更严格的趋势判断：需要EMA排列和价格位置都符合
        if (ema_change > self.trend_strength_threshold and 
            current_ema_fast > current_ema_slow and 
            current_price > current_ema_fast):
            return 'uptrend', strength
        elif (ema_change < -self.trend_strength_threshold and 
              current_ema_fast < current_ema_slow and 
              current_price < current_ema_fast):
            return 'downtrend', strength
        else:
            return 'sideways', strength
    
    def check_rsi_filter(self, df: pd.DataFrame, direction: str) -> bool:
        """RSI过滤检查"""
        if not self.use_rsi_filter:
            return True
        
        rsi = self.calculate_rsi(df['close'], self.rsi_period)
        current_rsi = rsi.iloc[-1]
        
        if pd.isna(current_rsi):
            return True
        
        # 做多需要RSI在超卖区或中性偏低
        if direction == 'long':
            return current_rsi < self.rsi_overbought  # 不在超买区即可
        # 做空需要RSI在超买区或中性偏高  
        else:
            return current_rsi > self.rsi_oversold  # 不在超卖区即可
    
    def find_support_resistance_levels(self, df: pd.DataFrame) -> Dict[str, List[float]]:
        """
        查找支撑压力位
        使用前期高低点作为关键位置
        """
        lookback = min(self.support_resistance_lookback, len(df) - 1)
        if lookback < 10:
            return {'support': [], 'resistance': []}
        
        highs = df['high'].iloc[-lookback:-1]
        lows = df['low'].iloc[-lookback:-1]
        
        # 找局部高点作为压力位
        resistance_levels = []
        for i in range(2, len(highs) - 2):
            if highs.iloc[i] > highs.iloc[i-1] and highs.iloc[i] > highs.iloc[i-2] and \
               highs.iloc[i] > highs.iloc[i+1] and highs.iloc[i] > highs.iloc[i+2]:
                resistance_levels.append(highs.iloc[i])
        
        # 找局部低点作为支撑位
        support_levels = []
        for i in range(2, len(lows) - 2):
            if lows.iloc[i] < lows.iloc[i-1] and lows.iloc[i] < lows.iloc[i-2] and \
               lows.iloc[i] < lows.iloc[i+1] and lows.iloc[i] < lows.iloc[i+2]:
                support_levels.append(lows.iloc[i])
        
        return {'support': support_levels, 'resistance': resistance_levels}
    
    def is_near_key_level(self, price: float, df: pd.DataFrame, direction: str) -> tuple:
        """
        检查价格是否在关键位置附近(优化版)
        
        Returns:
            (is_near: bool, level_type: str, level_price: float)
        """
        if not self.use_key_level_filter:
            return True, 'none', 0
        
        # 计算EMA
        ema_fast = self.calculate_ema(df['close'], self.ema_period)
        ema_slow = self.calculate_ema(df['close'], self.ema_slow_period)
        current_ema_fast = ema_fast.iloc[-1]
        current_ema_slow = ema_slow.iloc[-1]
        
        # 检查是否在均线附近
        distance_to_ema = abs(price - current_ema_fast) / current_ema_fast
        
        # 查找支撑压力位
        sr_levels = self.find_support_resistance_levels(df)
        
        # 做多信号：价格在EMA下方回踩，或在支撑位附近
        if direction == 'long':
            # 条件1: 价格在均线下方回踩
            if price < current_ema_fast and distance_to_ema < self.ema_distance_threshold:
                return True, 'ema_pullback', current_ema_fast
            
            # 条件2: 价格在支撑位附近
            for level in sorted(sr_levels['support'], reverse=True):  # 从高到低找最近的支撑
                if price >= level and (price - level) / level < self.sr_zone_threshold:
                    return True, 'support', level
            
            return False, 'none', 0
        
        # 做空信号：价格在EMA上方反弹，或在压力位附近
        else:
            # 条件1: 价格在均线上方反弹
            if price > current_ema_fast and distance_to_ema < self.ema_distance_threshold:
                return True, 'ema_bounce', current_ema_fast
            
            # 条件2: 价格在压力位附近
            for level in sorted(sr_levels['resistance']):  # 从低到高找最近的压力
                if price <= level and (level - price) / level < self.sr_zone_threshold:
                    return True, 'resistance', level
            
            return False, 'none', 0
    
    def check_volume_confirmation(self, df: pd.DataFrame, idx: int) -> bool:
        """检查成交量确认"""
        if not self.use_volume_confirmation:
            return True
        
        volume_col = 'vol' if 'vol' in df.columns else 'volume'
        if volume_col not in df.columns:
            return True
        
        # 计算平均成交量
        lookback = min(20, idx)
        if lookback < 5:
            return True
        
        avg_volume = df[volume_col].iloc[idx - lookback:idx].mean()
        current_volume = df[volume_col].iloc[idx]
        
        return current_volume > avg_volume * self.volume_threshold
    
    def detect_patterns(self, df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """
        检测K线形态(优化版)
        
        Returns:
            形态信息字典或None
        """
        if len(df) < 5:
            return None
        
        current_bar = df.iloc[-1]
        prev_bar = df.iloc[-2]
        trend, trend_strength = self.detect_trend(df.iloc[:-1])  # 用前面的数据判断趋势
        
        # 趋势强度检查 - 只在明确趋势中交易
        if trend_strength < self.min_trend_strength:
            return None
        
        # 检测单根K线形态
        # 底部反转形态（需要下跌趋势）
        if trend == 'downtrend':
            if self.is_hammer(current_bar):
                return {'pattern': 'hammer', 'direction': 'long', 'bar': current_bar, 'trend_strength': trend_strength}
        
        # 顶部反转形态（需要上涨趋势）
        if trend == 'uptrend':
            if self.is_shooting_star(current_bar):
                return {'pattern': 'shooting_star', 'direction': 'short', 'bar': current_bar, 'trend_strength': trend_strength}
        
        # 检测双根K线形态(高质量形态)
        if trend == 'downtrend':
            if self.is_bullish_engulfing(prev_bar, current_bar):
                return {'pattern': 'bullish_engulfing', 'direction': 'long', 
                       'bar': current_bar, 'prev_bar': prev_bar, 'trend_strength': trend_strength}
        
        if trend == 'uptrend':
            if self.is_bearish_engulfing(prev_bar, current_bar):
                return {'pattern': 'bearish_engulfing', 'direction': 'short',
                       'bar': current_bar, 'prev_bar': prev_bar, 'trend_strength': trend_strength}
        
        # 检测三根K线形态(最高质量形态)
        if len(df) >= 3:
            bars = [df.iloc[-3], df.iloc[-2], df.iloc[-1]]
            
            if trend == 'downtrend':
                if self.is_morning_star(bars):
                    return {'pattern': 'morning_star', 'direction': 'long',
                           'bar': current_bar, 'bars': bars, 'trend_strength': trend_strength}
            
            if trend == 'uptrend':
                if self.is_evening_star(bars):
                    return {'pattern': 'evening_star', 'direction': 'short',
                           'bar': current_bar, 'bars': bars, 'trend_strength': trend_strength}
        
        return None
    
    def analyze(self, klines: List[Dict]) -> Optional[Dict[str, Any]]:
        """
        分析当前市场状态并生成交易信号
        
        Args:
            klines: K线数据列表
            
        Returns:
            交易信号或None
        """
        # 转换为DataFrame
        df = pd.DataFrame(klines)
        
        # 确保有datetime索引
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df.set_index('timestamp', inplace=True)
        
        return self.analyze_single_bar(df)
    
    def analyze_single_bar(self, df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """
        只分析最后一根K线(优化版)
        
        Args:
            df: 包含OHLC数据的DataFrame
            
        Returns:
            交易信号或None
        """
        min_bars = max(self.trend_period, self.atr_period, self.ema_period, self.ema_slow_period) + 5
        if len(df) < min_bars:
            return None
        
        # 更新计数器
        self.bars_since_last_trade += 1
        
        # 计算ATR
        df['atr'] = self.calculate_atr(df, self.atr_period)
        
        current_bar = df.iloc[-1]
        timestamp = current_bar.name if isinstance(current_bar.name, datetime) else datetime.fromtimestamp(current_bar.get('open_time', 0) / 1000)
        
        # 如果已有持仓，检查止损止盈
        if self.current_position is not None:
            return self._check_exit(current_bar, timestamp)
        
        # 冷却期检查
        if self.cooldown_counter > 0:
            self.cooldown_counter -= 1
            return None
        
        # 检测形态
        pattern = self.detect_patterns(df)
        if pattern is None:
            return None
        
        direction = pattern['direction']
        price = current_bar['close']
        
        # 关键位置过滤 - 只在支撑压力位或均线附近交易
        is_near_key, level_type, level_price = self.is_near_key_level(price, df, direction)
        if not is_near_key:
            return None
        
        # 记录关键位置信息
        pattern['key_level_type'] = level_type
        pattern['key_level_price'] = level_price
        
        # RSI过滤
        if not self.check_rsi_filter(df, direction):
            return None
        
        # 成交量确认
        if not self.check_volume_confirmation(df, len(df) - 1):
            return None
        
        # 做空检查
        if direction == 'short' and not self.allow_short:
            return None
        
        return self._generate_entry_signal(pattern, current_bar, df, timestamp)
    
    def _generate_entry_signal(self, pattern: Dict, bar: pd.Series, 
                               df: pd.DataFrame, timestamp: datetime) -> Optional[Dict[str, Any]]:
        """生成入场信号"""
        direction = pattern['direction']
        price = bar['close']
        atr = df['atr'].iloc[-1]
        
        # 计算止损
        if direction == 'long':
            # 做多止损在形态低点下方
            pattern_low = bar['low']
            if 'prev_bar' in pattern:
                pattern_low = min(pattern_low, pattern['prev_bar']['low'])
            if 'bars' in pattern:
                pattern_low = min(b['low'] for b in pattern['bars'])
            
            stop_loss_distance = max(price - pattern_low, atr * self.stop_loss_atr_multiplier)
            self.stop_loss_price = price - stop_loss_distance
            self.take_profit_price = price + stop_loss_distance * self.risk_reward_ratio
            signal_type = 'buy'
        else:
            # 做空止损在形态高点上方
            pattern_high = bar['high']
            if 'prev_bar' in pattern:
                pattern_high = max(pattern_high, pattern['prev_bar']['high'])
            if 'bars' in pattern:
                pattern_high = max(b['high'] for b in pattern['bars'])
            
            stop_loss_distance = max(pattern_high - price, atr * self.stop_loss_atr_multiplier)
            self.stop_loss_price = price + stop_loss_distance
            self.take_profit_price = price - stop_loss_distance * self.risk_reward_ratio
            signal_type = 'sell'
        
        # 计算仓位
        position_size = self._calculate_position_size(price, stop_loss_distance)
        if position_size <= 0:
            return None
        
        self.entry_price = price
        
        key_level_info = f"@{pattern.get('key_level_type', 'none')}" if pattern.get('key_level_type') else ""
        logger.info(f"✓ {pattern['pattern']} 形态信号{key_level_info}: {'做多' if direction == 'long' else '做空'}")
        logger.info(f"  入场: {price:.2f}")
        if pattern.get('key_level_price'):
            logger.info(f"  关键位: {pattern['key_level_price']:.2f} ({pattern['key_level_type']})")
        logger.info(f"  止损: {self.stop_loss_price:.2f}")
        logger.info(f"  止盈: {self.take_profit_price:.2f}")
        
        # 记录形态统计
        if pattern['pattern'] not in self.pattern_stats:
            self.pattern_stats[pattern['pattern']] = {'total': 0, 'wins': 0}
        self.pattern_stats[pattern['pattern']]['total'] += 1
        
        return {
            'signal': signal_type,
            'price': price,
            'amount': position_size,
            'leverage': self.leverage,
            'timestamp': timestamp,
            'reason': f"candlestick_{pattern['pattern']}",
            'stop_loss': self.stop_loss_price,
            'take_profit': self.take_profit_price,
            'pattern': pattern['pattern']
        }
    
    def _check_exit(self, bar: pd.Series, timestamp: datetime) -> Optional[Dict[str, Any]]:
        """检查出场信号(包含移动止盈)"""
        if self.current_position is None:
            return None
        
        price = bar['close']
        side = self.current_position['side']
        
        if side == 'long':
            # 计算当前利润
            current_profit = (price - self.entry_price) / self.entry_price
            target_profit = (self.take_profit_price - self.entry_price) / self.entry_price
            
            # 更新最高利润
            if current_profit > self.highest_profit:
                self.highest_profit = current_profit
            
            # 移动止盈逻辑
            if self.use_trailing_stop and current_profit > target_profit * self.trailing_stop_activation:
                self.trailing_stop_active = True
                # 回撤超过阈值，触发移动止盈
                if current_profit < self.highest_profit * (1 - self.trailing_stop_distance):
                    pnl_pct = current_profit * 100
                    logger.info(f"✓ 移动止盈: +{pnl_pct:.2f}% (最高+{self.highest_profit*100:.2f}%)")
                    return self._create_exit_signal('trailing_stop', price, timestamp)
            
            # 固定止盈
            if price >= self.take_profit_price:
                pnl_pct = current_profit * 100
                logger.info(f"✓ 止盈: +{pnl_pct:.2f}%")
                return self._create_exit_signal('take_profit', price, timestamp)
            
            # 止损
            if price <= self.stop_loss_price:
                pnl_pct = current_profit * 100
                logger.info(f"✗ 止损: {pnl_pct:.2f}%")
                return self._create_exit_signal('stop_loss', price, timestamp)
        
        elif side == 'short':
            # 计算当前利润
            current_profit = (self.entry_price - price) / self.entry_price
            target_profit = (self.entry_price - self.take_profit_price) / self.entry_price
            
            # 更新最高利润
            if current_profit > self.highest_profit:
                self.highest_profit = current_profit
            
            # 移动止盈逻辑
            if self.use_trailing_stop and current_profit > target_profit * self.trailing_stop_activation:
                self.trailing_stop_active = True
                if current_profit < self.highest_profit * (1 - self.trailing_stop_distance):
                    pnl_pct = current_profit * 100
                    logger.info(f"✓ 移动止盈: +{pnl_pct:.2f}% (最高+{self.highest_profit*100:.2f}%)")
                    return self._create_exit_signal('trailing_stop', price, timestamp)
            
            # 固定止盈
            if price <= self.take_profit_price:
                pnl_pct = current_profit * 100
                logger.info(f"✓ 止盈: +{pnl_pct:.2f}%")
                return self._create_exit_signal('take_profit', price, timestamp)
            
            # 止损
            if price >= self.stop_loss_price:
                pnl_pct = current_profit * 100
                logger.info(f"✗ 止损: {pnl_pct:.2f}%")
                return self._create_exit_signal('stop_loss', price, timestamp)
        
        return None
    
    def _create_exit_signal(self, exit_type: str, price: float, timestamp: datetime) -> Dict[str, Any]:
        """创建出场信号"""
        return {
            'signal': 'close',
            'type': exit_type,
            'price': price,
            'timestamp': timestamp,
            'reason': exit_type
        }
    
    def _calculate_position_size(self, price: float, stop_loss_distance: float) -> float:
        """根据风险计算仓位大小"""
        if stop_loss_distance <= 0:
            return 0
        
        risk_amount = self.capital * self.risk_per_trade
        position_size = risk_amount / stop_loss_distance
        
        margin_required = (position_size * price) / self.leverage
        
        if margin_required > self.capital * 0.95:
            position_size = (self.capital * 0.95 * self.leverage) / price
        
        return position_size
    
    def update_position(self, signal: Dict[str, Any]):
        """更新持仓信息"""
        if signal.get('signal') in ['buy', 'sell']:
            self.current_position = {
                'side': 'long' if signal['signal'] == 'buy' else 'short',
                'entry_price': signal['price'],
                'amount': signal['amount'],
                'timestamp': signal['timestamp'],
                'pattern': signal.get('pattern')
            }
            self.entry_price = signal['price']
        elif signal.get('signal') == 'close':
            self.current_position = None
            self.entry_price = None
            self.stop_loss_price = None
            self.take_profit_price = None
            self.highest_profit = 0.0
            self.trailing_stop_active = False
    
    def record_trade(self, signal: Dict[str, Any]):
        """记录交易"""
        if signal.get('signal') == 'close':
            pnl = signal.get('pnl_amount', 0)
            if pnl > 0:
                self.winning_trades += 1
            self.total_trades += 1
    
    def on_trade(self, trade: Dict[str, Any]):
        """交易回调(优化版)"""
        if trade.get('type') == 'entry':
            self.total_trades += 1
            self.bars_since_last_trade = 0
        elif trade.get('type') in ['stop_loss', 'take_profit', 'trailing_stop', 'force_close']:
            pnl = trade.get('pnl_amount', 0)
            pattern = self.current_position.get('pattern') if self.current_position else None
            
            # 更新形态统计
            if pattern and pattern in self.pattern_stats:
                if pnl > 0:
                    self.pattern_stats[pattern]['wins'] += 1
                    self.winning_trades += 1
            
            # 连续亏损跟踪
            if pnl < 0:
                self.consecutive_losses += 1
                # 连续亏损达到阈值，启动冷却期
                if self.consecutive_losses >= self.max_consecutive_losses:
                    self.cooldown_counter = self.cooldown_bars
                    logger.info(f"⚠️ 连续亏损{self.consecutive_losses}次，进入冷却期{self.cooldown_bars}根K线")
            else:
                self.consecutive_losses = 0  # 盈利后重置
    
    def update_capital(self, new_capital: float):
        """更新资金"""
        self.capital = new_capital
    
    def get_stats(self) -> Dict[str, Any]:
        """获取策略统计信息"""
        win_rate = self.winning_trades / self.total_trades if self.total_trades > 0 else 0
        
        # 计算各形态胜率
        pattern_win_rates = {}
        for pattern, stats in self.pattern_stats.items():
            if stats['total'] > 0:
                pattern_win_rates[pattern] = {
                    'total': stats['total'],
                    'wins': stats['wins'],
                    'win_rate': stats['wins'] / stats['total']
                }
        
        return {
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'win_rate': win_rate,
            'pattern_stats': pattern_win_rates
        }
