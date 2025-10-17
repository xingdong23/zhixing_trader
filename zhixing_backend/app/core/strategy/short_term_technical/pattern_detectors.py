"""
短线技术形态检测器

实现6个稳赚战法的具体检测逻辑
"""

from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np
from loguru import logger


class BasePatternDetector:
    """形态检测器基类"""
    
    def __init__(self, name: str):
        self.name = name
    
    def detect(self, klines: pd.DataFrame) -> Dict:
        """
        检测形态
        
        Args:
            klines: K线数据（DataFrame格式）
                   必须包含: time, open, high, low, close, volume
        
        Returns:
            检测结果字典:
            {
                'detected': bool,         # 是否检测到
                'confidence': float,      # 置信度 0-1
                'signal': str,            # BUY/SELL/HOLD
                'entry_price': float,     # 建议入场价
                'stop_loss': float,       # 止损价
                'take_profit': float,     # 止盈价
                'reason': str,            # 原因说明
                'details': dict           # 详细数据
            }
        """
        raise NotImplementedError


class MovingAverageMACDDetector(BasePatternDetector):
    """
    战法1：均线多头 + MACD红柱放大
    
    条件：
    1. 5日、10日、20日均线呈多头排列（5日>10日>20日）
    2. MACD红柱一天比一天长（连续放大）
    
    预期：3天赚15%不难
    """
    
    def __init__(self):
        super().__init__("均线多头+MACD红柱")
    
    def detect(self, klines: pd.DataFrame) -> Dict:
        if len(klines) < 30:
            return {'detected': False, 'reason': '数据不足'}
        
        df = klines.copy()
        
        # 计算均线
        df['ma5'] = df['close'].rolling(5).mean()
        df['ma10'] = df['close'].rolling(10).mean()
        df['ma20'] = df['close'].rolling(20).mean()
        
        # 计算MACD
        df = self._calculate_macd(df)
        
        # 最近3天数据
        recent = df.tail(3).reset_index(drop=True)
        
        # 检查均线多头排列
        ma_bullish = all([
            recent.iloc[-1]['ma5'] > recent.iloc[-1]['ma10'],
            recent.iloc[-1]['ma10'] > recent.iloc[-1]['ma20']
        ])
        
        if not ma_bullish:
            return {'detected': False, 'reason': '均线未呈多头排列'}
        
        # 检查MACD红柱递增
        macd_bars = recent['macd_hist'].tolist()
        macd_increasing = (
            macd_bars[-1] > 0 and  # 最新是红柱
            macd_bars[-1] > macd_bars[-2] > macd_bars[-3]  # 连续放大
        )
        
        if not macd_increasing:
            return {'detected': False, 'reason': 'MACD红柱未连续放大'}
        
        # 计算置信度
        ma_strength = (recent.iloc[-1]['ma5'] - recent.iloc[-1]['ma20']) / recent.iloc[-1]['ma20']
        macd_strength = (macd_bars[-1] - macd_bars[-3]) / abs(macd_bars[-3]) if macd_bars[-3] != 0 else 0
        confidence = min(0.5 + ma_strength * 10 + macd_strength * 0.5, 0.95)
        
        current_price = recent.iloc[-1]['close']
        
        return {
            'detected': True,
            'confidence': confidence,
            'signal': 'BUY',
            'entry_price': current_price,
            'stop_loss': current_price * 0.93,  # -7%
            'take_profit': current_price * 1.15,  # +15%
            'hold_days': 3,
            'reason': f'均线多头排列，MACD红柱连续{len(macd_bars)}天放大',
            'details': {
                'ma5': round(recent.iloc[-1]['ma5'], 2),
                'ma10': round(recent.iloc[-1]['ma10'], 2),
                'ma20': round(recent.iloc[-1]['ma20'], 2),
                'macd_hist': [round(x, 4) for x in macd_bars],
                'ma_strength': round(ma_strength, 4),
                'macd_strength': round(macd_strength, 4)
            }
        }
    
    def _calculate_macd(self, df: pd.DataFrame) -> pd.DataFrame:
        """计算MACD指标"""
        exp1 = df['close'].ewm(span=12, adjust=False).mean()
        exp2 = df['close'].ewm(span=26, adjust=False).mean()
        df['macd'] = exp1 - exp2
        df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
        df['macd_hist'] = df['macd'] - df['macd_signal']
        return df


class YearLineReboundDetector(BasePatternDetector):
    """
    战法2：回踩年线 + 缩量企稳
    
    条件：
    1. 年线(250日线)是护盘线
    2. 股价回调到年线附近，连续2天不跌破
    3. 量能缩到前一周最低值的50%
    
    预期：中期上涨概率超80%
    """
    
    def __init__(self):
        super().__init__("回踩年线+缩量企稳")
    
    def detect(self, klines: pd.DataFrame) -> Dict:
        if len(klines) < 260:
            return {'detected': False, 'reason': '数据不足（需要260天）'}
        
        df = klines.copy()
        
        # 计算年线
        df['ma250'] = df['close'].rolling(250).mean()
        
        # 最近2天和前7天
        recent_2 = df.tail(2).reset_index(drop=True)
        recent_7 = df.tail(7).reset_index(drop=True)
        
        current_price = recent_2.iloc[-1]['close']
        ma250 = recent_2.iloc[-1]['ma250']
        
        # 检查是否在年线附近（±3%）
        near_ma250 = abs(current_price - ma250) / ma250 < 0.03
        
        if not near_ma250:
            return {'detected': False, 'reason': f'未在年线附近（当前{current_price:.2f}, 年线{ma250:.2f}）'}
        
        # 检查连续2天不跌破年线
        above_ma250 = all(recent_2['close'] >= recent_2['ma250'] * 0.99)
        
        if not above_ma250:
            return {'detected': False, 'reason': '未站稳年线'}
        
        # 检查缩量企稳
        min_volume_7d = recent_7.head(5)['volume'].min()
        current_volume = recent_2.iloc[-1]['volume']
        volume_shrink = current_volume <= min_volume_7d * 0.5
        
        if not volume_shrink:
            return {'detected': False, 'reason': '量能未缩到前周50%以下'}
        
        # 计算置信度
        distance_to_ma = abs(current_price - ma250) / ma250
        volume_ratio = current_volume / min_volume_7d
        confidence = min(0.6 + (0.03 - distance_to_ma) * 10 + (0.5 - volume_ratio) * 0.4, 0.85)
        
        return {
            'detected': True,
            'confidence': confidence,
            'signal': 'BUY',
            'entry_price': current_price,
            'stop_loss': ma250 * 0.97,  # 年线下方3%
            'take_profit': current_price * 1.20,  # +20%
            'hold_days': 30,  # 中期持有
            'reason': f'回踩年线企稳，量能缩至前周{volume_ratio:.1%}',
            'details': {
                'current_price': round(current_price, 2),
                'ma250': round(ma250, 2),
                'distance_to_ma': round(distance_to_ma, 4),
                'current_volume': int(current_volume),
                'min_volume_7d': int(min_volume_7d),
                'volume_ratio': round(volume_ratio, 4)
            }
        }


class DoubleBottomDetector(BasePatternDetector):
    """
    战法3：双底形态 + 量能配合
    
    条件：
    1. 两个底部形成，第二个底比第一个底高
    2. 突破两个底之间的颈线时，量能要是前一天的1.5倍
    
    预期：主升浪启动
    """
    
    def __init__(self):
        super().__init__("双底形态+量能配合")
    
    def detect(self, klines: pd.DataFrame) -> Dict:
        if len(klines) < 30:
            return {'detected': False, 'reason': '数据不足'}
        
        df = klines.tail(30).reset_index(drop=True)
        
        # 寻找双底
        result = self._find_double_bottom(df)
        
        if not result['found']:
            return {'detected': False, 'reason': result['reason']}
        
        bottom1_idx, bottom2_idx, neckline = result['bottom1_idx'], result['bottom2_idx'], result['neckline']
        
        # 检查是否突破颈线
        current = df.iloc[-1]
        previous = df.iloc[-2]
        
        breakthrough = current['close'] > neckline and previous['close'] <= neckline
        
        if not breakthrough:
            return {'detected': False, 'reason': '尚未突破颈线'}
        
        # 检查量能放大
        volume_amplify = current['volume'] >= previous['volume'] * 1.5
        
        if not volume_amplify:
            return {'detected': False, 'reason': f'量能未放大（当前{current["volume"]/previous["volume"]:.1f}倍）'}
        
        # 计算置信度
        bottom2_price = df.iloc[bottom2_idx]['low']
        bottom1_price = df.iloc[bottom1_idx]['low']
        bottom_higher = (bottom2_price - bottom1_price) / bottom1_price
        volume_ratio = current['volume'] / previous['volume']
        
        confidence = min(0.5 + bottom_higher * 20 + (volume_ratio - 1.5) * 0.2, 0.90)
        
        return {
            'detected': True,
            'confidence': confidence,
            'signal': 'BUY',
            'entry_price': current['close'],
            'stop_loss': bottom2_price * 0.98,  # 第二底下方2%
            'take_profit': current['close'] + (neckline - bottom2_price) * 1.5,  # 颈线高度的1.5倍
            'hold_days': 15,
            'reason': f'双底突破，量能放大{volume_ratio:.1f}倍',
            'details': {
                'bottom1_price': round(bottom1_price, 2),
                'bottom2_price': round(bottom2_price, 2),
                'neckline': round(neckline, 2),
                'bottom_higher': round(bottom_higher, 4),
                'volume_ratio': round(volume_ratio, 2),
                'pattern_days': bottom2_idx - bottom1_idx
            }
        }
    
    def _find_double_bottom(self, df: pd.DataFrame) -> Dict:
        """寻找双底形态"""
        lows = df['low'].values
        
        # 寻找局部最低点
        local_mins = []
        for i in range(2, len(lows) - 2):
            if lows[i] < lows[i-1] and lows[i] < lows[i-2] and \
               lows[i] < lows[i+1] and lows[i] < lows[i+2]:
                local_mins.append((i, lows[i]))
        
        if len(local_mins) < 2:
            return {'found': False, 'reason': '未找到两个局部低点'}
        
        # 找最近的两个底
        bottom1_idx, bottom1_price = local_mins[-2]
        bottom2_idx, bottom2_price = local_mins[-1]
        
        # 检查第二个底是否更高
        if bottom2_price <= bottom1_price:
            return {'found': False, 'reason': '第二底不高于第一底'}
        
        # 计算颈线（两底之间的最高点）
        between_range = df.iloc[bottom1_idx:bottom2_idx+1]
        neckline = between_range['high'].max()
        
        return {
            'found': True,
            'bottom1_idx': bottom1_idx,
            'bottom2_idx': bottom2_idx,
            'neckline': neckline,
            'reason': 'OK'
        }


class GapUpVolumeDetector(BasePatternDetector):
    """
    战法4：跳空高开 + 量能缩
    
    条件：
    1. 开盘高开3%以上
    2. 当天不回补缺口
    3. 量能比前一天缩小30%
    
    预期：涨停概率超60%，赚5-8%
    """
    
    def __init__(self):
        super().__init__("跳空高开+量能缩")
    
    def detect(self, klines: pd.DataFrame) -> Dict:
        if len(klines) < 3:
            return {'detected': False, 'reason': '数据不足'}
        
        df = klines.tail(3).reset_index(drop=True)
        
        today = df.iloc[-1]
        yesterday = df.iloc[-2]
        
        # 检查高开幅度
        gap_up = (today['open'] - yesterday['close']) / yesterday['close']
        
        if gap_up < 0.03:
            return {'detected': False, 'reason': f'高开幅度不足3%（当前{gap_up:.1%}）'}
        
        # 检查是否回补缺口
        gap_filled = today['low'] <= yesterday['close']
        
        if gap_filled:
            return {'detected': False, 'reason': '已回补缺口'}
        
        # 检查量能缩小
        volume_shrink = today['volume'] < yesterday['volume'] * 0.7
        
        if not volume_shrink:
            volume_ratio = today['volume'] / yesterday['volume']
            return {'detected': False, 'reason': f'量能未缩小30%（当前{volume_ratio:.1%}）'}
        
        # 计算置信度
        volume_ratio = today['volume'] / yesterday['volume']
        confidence = min(0.5 + gap_up * 5 + (0.7 - volume_ratio) * 0.5, 0.75)
        
        current_price = today['close']
        
        return {
            'detected': True,
            'confidence': confidence,
            'signal': 'BUY',
            'entry_price': current_price,
            'stop_loss': yesterday['close'],  # 缺口不能回补
            'take_profit': current_price * 1.08,  # +8%
            'hold_days': 1,  # 短线，当天或次日
            'reason': f'跳空{gap_up:.1%}高开且不回补，量能缩至{volume_ratio:.1%}',
            'details': {
                'gap_up_pct': round(gap_up, 4),
                'today_open': round(today['open'], 2),
                'today_low': round(today['low'], 2),
                'yesterday_close': round(yesterday['close'], 2),
                'volume_ratio': round(volume_ratio, 4),
                'volume_shrink_pct': round(1 - volume_ratio, 4)
            }
        }


class RoundTopDetector(BasePatternDetector):
    """
    战法5：圆弧顶反转 + 量能递减
    
    条件：
    1. 股价走成圆弧顶（先涨后跌，顶部平滑）
    2. 顶部量能一天比一天小
    3. 跌破圆弧顶最低点时，主力在出货
    
    预期：逃顶信号
    """
    
    def __init__(self):
        super().__init__("圆弧顶反转+量能递减")
    
    def detect(self, klines: pd.DataFrame) -> Dict:
        if len(klines) < 15:
            return {'detected': False, 'reason': '数据不足'}
        
        df = klines.tail(15).reset_index(drop=True)
        
        # 检测圆弧顶形态
        result = self._detect_round_top(df)
        
        if not result['detected']:
            return {'detected': False, 'reason': result['reason']}
        
        top_idx = result['top_idx']
        
        # 检查顶部量能递减
        top_region = df.iloc[max(0, top_idx-2):min(len(df), top_idx+3)]
        volumes = top_region['volume'].tolist()
        
        volume_decreasing = all(volumes[i] > volumes[i+1] for i in range(len(volumes)-1))
        
        if not volume_decreasing:
            return {'detected': False, 'reason': '顶部量能未递减'}
        
        # 检查是否跌破圆弧底
        current_price = df.iloc[-1]['close']
        round_bottom = df.iloc[:top_idx]['low'].min()
        
        breakthrough_bottom = current_price < round_bottom
        
        # 计算置信度
        confidence = 0.7 if breakthrough_bottom else 0.5
        
        return {
            'detected': True,
            'confidence': confidence,
            'signal': 'SELL',
            'entry_price': current_price,
            'stop_loss': df.iloc[top_idx]['high'] * 1.02,  # 顶部上方2%
            'take_profit': current_price * 0.90,  # -10%
            'hold_days': 0,  # 立即出场
            'reason': f'圆弧顶形成，量能递减，{"已跌破" if breakthrough_bottom else "接近"}圆弧底',
            'details': {
                'top_price': round(df.iloc[top_idx]['high'], 2),
                'round_bottom': round(round_bottom, 2),
                'current_price': round(current_price, 2),
                'top_volumes': [int(v) for v in volumes],
                'breakthrough_bottom': breakthrough_bottom
            }
        }
    
    def _detect_round_top(self, df: pd.DataFrame) -> Dict:
        """检测圆弧顶形态"""
        highs = df['high'].values
        
        # 寻找最高点
        max_idx = np.argmax(highs)
        
        if max_idx < 3 or max_idx > len(highs) - 3:
            return {'detected': False, 'reason': '最高点位置不适合形成圆弧顶'}
        
        # 检查是否形成圆弧（最高点两侧逐渐降低）
        left_side = highs[max_idx-3:max_idx]
        right_side = highs[max_idx+1:max_idx+4]
        
        left_ascending = all(left_side[i] < left_side[i+1] for i in range(len(left_side)-1))
        right_descending = all(right_side[i] > right_side[i+1] for i in range(len(right_side)-1))
        
        if not (left_ascending and right_descending):
            return {'detected': False, 'reason': '未形成圆弧形态'}
        
        return {
            'detected': True,
            'top_idx': max_idx,
            'reason': 'OK'
        }


class ThreeSunsDetector(BasePatternDetector):
    """
    战法6：三阳开泰 + 量能递增
    
    条件：
    1. 连续3天收阳线
    2. 每天涨幅在2%-4%
    3. 量能一天比一天大
    4. 第三天收盘价突破前高
    
    预期：次日上涨概率超70%，赚5-8%
    """
    
    def __init__(self):
        super().__init__("三阳开泰+量能递增")
    
    def detect(self, klines: pd.DataFrame) -> Dict:
        if len(klines) < 5:
            return {'detected': False, 'reason': '数据不足'}
        
        df = klines.tail(5).reset_index(drop=True)
        
        # 最近3天
        recent_3 = df.tail(3).reset_index(drop=True)
        
        # 检查连续3天收阳线
        all_positive = all(recent_3['close'] > recent_3['open'])
        
        if not all_positive:
            return {'detected': False, 'reason': '未连续3天收阳'}
        
        # 检查每天涨幅2%-4%
        daily_returns = []
        for i in range(len(recent_3)):
            if i == 0:
                prev_close = df.iloc[-4]['close']
            else:
                prev_close = recent_3.iloc[i-1]['close']
            
            daily_return = (recent_3.iloc[i]['close'] - prev_close) / prev_close
            daily_returns.append(daily_return)
        
        returns_in_range = all(0.02 <= r <= 0.04 for r in daily_returns)
        
        if not returns_in_range:
            return {'detected': False, 'reason': f'日涨幅不在2%-4%（当前{[f"{r:.1%}" for r in daily_returns]}）'}
        
        # 检查量能递增
        volumes = recent_3['volume'].tolist()
        volume_increasing = volumes[0] < volumes[1] < volumes[2]
        
        if not volume_increasing:
            return {'detected': False, 'reason': '量能未递增'}
        
        # 检查第三天突破前高
        previous_high = df.iloc[:-3]['high'].max()
        current_close = recent_3.iloc[-1]['close']
        breakthrough = current_close > previous_high
        
        if not breakthrough:
            return {'detected': False, 'reason': '未突破前高'}
        
        # 计算置信度
        avg_return = np.mean(daily_returns)
        volume_growth = (volumes[2] - volumes[0]) / volumes[0]
        confidence = min(0.6 + avg_return * 10 + volume_growth * 0.2, 0.80)
        
        return {
            'detected': True,
            'confidence': confidence,
            'signal': 'BUY',
            'entry_price': current_close,
            'stop_loss': recent_3.iloc[0]['low'],  # 第一根阳线最低点
            'take_profit': current_close * 1.08,  # +8%
            'hold_days': 1,  # 次日
            'reason': f'三阳开泰，日均涨{avg_return:.1%}，量能增{volume_growth:.1%}，突破前高',
            'details': {
                'daily_returns': [round(r, 4) for r in daily_returns],
                'volumes': [int(v) for v in volumes],
                'volume_growth': round(volume_growth, 4),
                'previous_high': round(previous_high, 2),
                'breakthrough_amount': round(current_close - previous_high, 2)
            }
        }


class SidewaysVolumeDetector(BasePatternDetector):
    """
    避坑规则10：横盘超15天且量能递减的股，别碰
    
    条件：
    1. 横盘15天没量（价格波动<5%）
    2. 量能持续递减
    
    预期：迟早要跌
    """
    
    def __init__(self):
        super().__init__("横盘缩量避坑")
    
    def detect(self, klines: pd.DataFrame) -> Dict:
        if len(klines) < 15:
            return {'detected': False, 'reason': '数据不足'}
        
        df = klines.tail(15).reset_index(drop=True)
        
        # 检查横盘（价格波动<5%）
        price_range = (df['high'].max() - df['low'].min()) / df['close'].mean()
        
        is_sideways = price_range < 0.05
        
        if not is_sideways:
            return {'detected': False, 'reason': f'未横盘（波动{price_range:.1%}）'}
        
        # 检查量能递减（线性拟合斜率为负）
        x = np.arange(len(df))
        y = df['volume'].values
        slope = np.polyfit(x, y, 1)[0]
        
        volume_decreasing = slope < 0
        
        if not volume_decreasing:
            return {'detected': False, 'reason': '量能未递减'}
        
        # 这是避坑信号
        confidence = 0.75
        current_price = df.iloc[-1]['close']
        
        return {
            'detected': True,
            'confidence': confidence,
            'signal': 'AVOID',  # 避开
            'entry_price': current_price,
            'stop_loss': None,
            'take_profit': None,
            'hold_days': 0,
            'reason': f'横盘{len(df)}天，波动仅{price_range:.1%}，量能递减',
            'details': {
                'price_range': round(price_range, 4),
                'volume_slope': round(slope, 2),
                'avg_volume': int(df['volume'].mean()),
                'current_volume': int(df.iloc[-1]['volume']),
                'days': len(df)
            }
        }

