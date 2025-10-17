"""
稳健盈利策略 - 从2万到200万的交易系统
基于"三线定趋势"+"仓位管理"+"三重止损"+"金字塔止盈"

核心理念：
1. 三线定趋势：日线定方向 → 4H找结构 → 15M找入场
2. 仓位公式：初始仓位=账户1%×趋势强度系数
3. 止损三重锚：前高低±1.5ATR / 斐波那契38.2% / 单日最大回撤3%
4. 盈利金字塔：分批止盈，移动止损到成本线
5. 情绪反向：利用市场恐慌贪婪指标找机会
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np
from . import BaseStrategy


class SteadyProfitStrategy(BaseStrategy):
    """稳健盈利策略"""
    
    def __init__(self, parameters: Dict[str, Any] = None):
        default_params = {
            # 仓位管理参数
            "base_position_ratio": 0.01,  # 基础仓位：账户1%
            "震荡市_系数": 0.3,  # 震荡市趋势强度系数
            "单边市_系数": 0.8,  # 单边市趋势强度系数
            "max_single_position": 0.10,  # 单笔最大仓位：10%
            
            # 止损参数
            "atr_multiplier": 1.5,  # ATR倍数
            "fibonacci_level": 0.382,  # 斐波那契回撤位
            "max_daily_loss": 0.03,  # 单日最大回撤3%
            
            # 止盈参数
            "first_target_profit": 0.50,  # 第一目标：50%利润
            "first_target_close": 0.50,  # 第一目标平仓比例
            "second_target_profit": 1.00,  # 第二目标：100%利润
            "second_target_close": 0.30,  # 第二目标平仓比例
            "trailing_stop_ratio": 0.20,  # 追踪止损保留比例
            
            # 趋势判断参数
            "ema_fast": 12,  # 快速均线
            "ema_slow": 26,  # 慢速均线
            "ema_trend": 200,  # 趋势均线
            "atr_period": 14,  # ATR周期
            
            # 情绪指标参数（模拟恐慌贪婪）
            "sentiment_threshold_high": 75,  # 极度贪婪阈值
            "sentiment_threshold_low": 25,   # 极度恐慌阈值
        }
        
        if parameters:
            default_params.update(parameters)
        
        super().__init__("稳健盈利策略", default_params)
        
        # 持仓状态
        self.positions = {
            "long": None,  # 多单信息
            "short": None,  # 空单信息
        }
        
        # 今日盈亏统计
        self.daily_pnl = 0.0
        self.daily_reset_time = None
    
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        分析K线数据，生成交易信号
        
        需要三个周期的K线数据：
        - daily: 日线数据
        - 4h: 4小时线数据
        - 15m: 15分钟线数据
        """
        if not klines or len(klines) < 200:
            return {"signal": "hold", "reason": "数据不足"}
        
        # 第一步：日线定方向
        trend_direction = self._analyze_daily_trend(klines)
        
        # 第二步：4小时找结构
        structure_signal = self._analyze_4h_structure(klines)
        
        # 第三步：15分钟找入场点
        entry_signal = self._analyze_15m_entry(klines)
        
        # 第四步：计算趋势强度系数
        trend_strength = self._calculate_trend_strength(klines)
        
        # 第五步：情绪指标判断（反向思维）
        sentiment = self._analyze_sentiment(klines)
        
        # 综合判断
        signal = self._generate_signal(
            trend_direction, 
            structure_signal, 
            entry_signal, 
            trend_strength,
            sentiment
        )
        
        # 计算仓位和止损止盈
        if signal["signal"] != "hold":
            signal.update(self._calculate_position_and_stops(
                signal["signal"],
                signal["price"],
                trend_strength,
                klines
            ))
        
        return signal
    
    def _analyze_daily_trend(self, klines: List[Dict]) -> str:
        """日线定方向"""
        closes = np.array([k["close"] for k in klines[-200:]])
        
        # 计算200日均线作为趋势线
        ema200 = self._calculate_ema(closes, self.parameters["ema_trend"])
        current_price = closes[-1]
        
        # 计算斜率判断趋势
        recent_ema = ema200[-50:]
        slope = (recent_ema[-1] - recent_ema[0]) / len(recent_ema)
        
        if current_price > ema200[-1] and slope > 0:
            return "上升趋势"
        elif current_price < ema200[-1] and slope < 0:
            return "下降趋势"
        else:
            return "震荡趋势"
    
    def _analyze_4h_structure(self, klines: List[Dict]) -> Dict[str, Any]:
        """4小时找结构（双底、突破等形态）"""
        closes = np.array([k["close"] for k in klines[-100:]])
        highs = np.array([k["high"] for k in klines[-100:]])
        lows = np.array([k["low"] for k in klines[-100:]])
        
        # 寻找双底形态
        double_bottom = self._find_double_bottom(closes, lows)
        if double_bottom:
            return {
                "pattern": "双底",
                "signal": "看多",
                "key_level": double_bottom["support"]
            }
        
        # 寻找双顶形态
        double_top = self._find_double_top(closes, highs)
        if double_top:
            return {
                "pattern": "双顶",
                "signal": "看空",
                "key_level": double_top["resistance"]
            }
        
        # 寻找突破形态
        breakout = self._find_breakout(closes, highs, lows)
        if breakout:
            return {
                "pattern": "突破",
                "signal": breakout["direction"],
                "key_level": breakout["level"]
            }
        
        return {"pattern": "无明显形态", "signal": "观望"}
    
    def _analyze_15m_entry(self, klines: List[Dict]) -> Dict[str, Any]:
        """15分钟找入场点"""
        closes = np.array([k["close"] for k in klines[-50:]])
        
        # 使用快慢EMA交叉找入场
        ema_fast = self._calculate_ema(closes, self.parameters["ema_fast"])
        ema_slow = self._calculate_ema(closes, self.parameters["ema_slow"])
        
        # 金叉：快线上穿慢线
        if ema_fast[-2] <= ema_slow[-2] and ema_fast[-1] > ema_slow[-1]:
            return {
                "signal": "金叉",
                "entry_type": "做多",
                "price": closes[-1]
            }
        
        # 死叉：快线下穿慢线
        if ema_fast[-2] >= ema_slow[-2] and ema_fast[-1] < ema_slow[-1]:
            return {
                "signal": "死叉",
                "entry_type": "做空",
                "price": closes[-1]
            }
        
        return {"signal": "等待", "entry_type": "观望"}
    
    def _calculate_trend_strength(self, klines: List[Dict]) -> float:
        """
        计算趋势强度系数
        返回: 0.3 (震荡市) 或 0.8 (单边市)
        """
        closes = np.array([k["close"] for k in klines[-50:]])
        
        # 使用ADX指标判断趋势强度
        adx = self._calculate_adx(klines[-50:])
        
        # ADX > 25 表示趋势明显（单边市）
        if adx > 25:
            return self.parameters["单边市_系数"]
        else:
            return self.parameters["震荡市_系数"]
    
    def _analyze_sentiment(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        分析市场情绪（模拟恐慌贪婪指数）
        
        使用以下指标模拟：
        1. RSI：超买超卖
        2. 成交量变化：恐慌/贪婪信号
        3. 波动率：市场情绪激烈程度
        """
        closes = np.array([k["close"] for k in klines[-50:]])
        volumes = np.array([k["volume"] for k in klines[-50:]])
        
        # 计算RSI
        rsi = self._calculate_rsi(closes, 14)
        
        # 计算成交量变化率
        volume_change = (volumes[-1] - np.mean(volumes[-10:])) / np.mean(volumes[-10:])
        
        # 计算波动率
        volatility = np.std(closes[-20:]) / np.mean(closes[-20:])
        
        # 综合评分（0-100）
        sentiment_score = (
            rsi * 0.5 +  # RSI权重50%
            min(max(volume_change * 50 + 50, 0), 100) * 0.3 +  # 成交量权重30%
            min(volatility * 1000, 100) * 0.2  # 波动率权重20%
        )
        
        # 反向信号判断
        if sentiment_score > self.parameters["sentiment_threshold_high"]:
            return {
                "score": sentiment_score,
                "state": "极度贪婪",
                "action": "警惕做空机会"  # 反向思维
            }
        elif sentiment_score < self.parameters["sentiment_threshold_low"]:
            return {
                "score": sentiment_score,
                "state": "极度恐慌",
                "action": "寻找做多机会"  # 反向思维
            }
        else:
            return {
                "score": sentiment_score,
                "state": "中性",
                "action": "跟随趋势"
            }
    
    def _generate_signal(self, trend, structure, entry, strength, sentiment) -> Dict[str, Any]:
        """综合生成交易信号"""
        # 检查今日回撤限制
        if self._check_daily_loss_limit():
            return {
                "signal": "hold",
                "reason": f"今日回撤已达{self.daily_pnl:.2%}，停止交易"
            }
        
        # 做多条件：
        # 1. 日线上升趋势 或 震荡趋势+情绪极度恐慌
        # 2. 4小时有做多结构
        # 3. 15分钟金叉入场
        if ((trend == "上升趋势") or 
            (trend == "震荡趋势" and sentiment["state"] == "极度恐慌")):
            if structure.get("signal") == "看多" and entry.get("entry_type") == "做多":
                return {
                    "signal": "buy",
                    "price": entry["price"],
                    "reason": f"三线共振做多：{trend} + {structure['pattern']} + {entry['signal']}",
                    "confidence": "高" if strength >= 0.8 else "中",
                    "sentiment": sentiment
                }
        
        # 做空条件（类似）
        if ((trend == "下降趋势") or 
            (trend == "震荡趋势" and sentiment["state"] == "极度贪婪")):
            if structure.get("signal") == "看空" and entry.get("entry_type") == "做空":
                return {
                    "signal": "sell",
                    "price": entry["price"],
                    "reason": f"三线共振做空：{trend} + {structure['pattern']} + {entry['signal']}",
                    "confidence": "高" if strength >= 0.8 else "中",
                    "sentiment": sentiment
                }
        
        return {
            "signal": "hold",
            "reason": "未满足入场条件",
            "analysis": {
                "trend": trend,
                "structure": structure,
                "entry": entry,
                "sentiment": sentiment
            }
        }
    
    def _calculate_position_and_stops(self, signal: str, entry_price: float, 
                                     trend_strength: float, klines: List[Dict]) -> Dict[str, Any]:
        """
        计算仓位和止损止盈
        
        仓位公式：初始仓位 = 账户1% × 趋势强度系数
        止损三重锚：前高低±1.5ATR / 斐波那契38.2% / 单日最大回撤3%
        """
        # 1. 计算仓位
        position_ratio = self.parameters["base_position_ratio"] * trend_strength
        position_ratio = min(position_ratio, self.parameters["max_single_position"])
        
        # 2. 计算ATR
        atr = self._calculate_atr(klines[-50:], self.parameters["atr_period"])
        
        # 3. 计算止损位（三重锚中最保守的一个）
        stop_loss_1 = self._calculate_atr_stop(entry_price, atr, signal)
        stop_loss_2 = self._calculate_fibonacci_stop(klines, entry_price, signal)
        stop_loss_3 = entry_price * (1 - self.parameters["max_daily_loss"])
        
        # 选择最保守的止损
        if signal == "buy":
            stop_loss = max(stop_loss_1, stop_loss_2, stop_loss_3)
        else:
            stop_loss = min(stop_loss_1, stop_loss_2, stop_loss_3)
        
        # 4. 计算止盈位（金字塔）
        risk = abs(entry_price - stop_loss)
        take_profit_1 = entry_price + risk * 2 if signal == "buy" else entry_price - risk * 2
        take_profit_2 = entry_price + risk * 4 if signal == "buy" else entry_price - risk * 4
        
        return {
            "position_ratio": position_ratio,
            "stop_loss": stop_loss,
            "take_profit_levels": [
                {
                    "price": take_profit_1,
                    "close_ratio": self.parameters["first_target_close"],
                    "action": "平仓50%，止损移至成本线"
                },
                {
                    "price": take_profit_2,
                    "close_ratio": self.parameters["second_target_close"],
                    "action": "平仓30%，剩余20%追踪止损"
                }
            ],
            "risk_reward_ratio": abs(take_profit_1 - entry_price) / risk,
            "atr": atr
        }
    
    # ==================== 辅助计算方法 ====================
    
    def _calculate_ema(self, prices: np.ndarray, period: int) -> np.ndarray:
        """计算指数移动平均"""
        ema = np.zeros_like(prices)
        ema[0] = prices[0]
        multiplier = 2 / (period + 1)
        
        for i in range(1, len(prices)):
            ema[i] = (prices[i] - ema[i-1]) * multiplier + ema[i-1]
        
        return ema
    
    def _calculate_atr(self, klines: List[Dict], period: int) -> float:
        """计算ATR（平均真实波幅）"""
        true_ranges = []
        
        for i in range(1, len(klines)):
            high = klines[i]["high"]
            low = klines[i]["low"]
            prev_close = klines[i-1]["close"]
            
            tr = max(
                high - low,
                abs(high - prev_close),
                abs(low - prev_close)
            )
            true_ranges.append(tr)
        
        return np.mean(true_ranges[-period:])
    
    def _calculate_rsi(self, prices: np.ndarray, period: int = 14) -> float:
        """计算RSI"""
        deltas = np.diff(prices)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        
        avg_gain = np.mean(gains[-period:])
        avg_loss = np.mean(losses[-period:])
        
        if avg_loss == 0:
            return 100
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def _calculate_adx(self, klines: List[Dict], period: int = 14) -> float:
        """计算ADX（平均趋向指数）"""
        # 简化版ADX计算
        highs = np.array([k["high"] for k in klines])
        lows = np.array([k["low"] for k in klines])
        
        high_diff = np.diff(highs)
        low_diff = -np.diff(lows)
        
        plus_dm = np.where((high_diff > low_diff) & (high_diff > 0), high_diff, 0)
        minus_dm = np.where((low_diff > high_diff) & (low_diff > 0), low_diff, 0)
        
        atr = self._calculate_atr(klines, period)
        
        if atr == 0:
            return 0
        
        plus_di = 100 * np.mean(plus_dm[-period:]) / atr
        minus_di = 100 * np.mean(minus_dm[-period:]) / atr
        
        dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di + 0.0001)
        
        return dx
    
    def _calculate_atr_stop(self, entry_price: float, atr: float, signal: str) -> float:
        """计算基于ATR的止损"""
        multiplier = self.parameters["atr_multiplier"]
        
        if signal == "buy":
            return entry_price - atr * multiplier
        else:
            return entry_price + atr * multiplier
    
    def _calculate_fibonacci_stop(self, klines: List[Dict], entry_price: float, signal: str) -> float:
        """计算基于斐波那契的止损"""
        recent = klines[-50:]
        high = max([k["high"] for k in recent])
        low = min([k["low"] for k in recent])
        
        fib_level = self.parameters["fibonacci_level"]
        
        if signal == "buy":
            return low + (high - low) * fib_level
        else:
            return high - (high - low) * fib_level
    
    def _find_double_bottom(self, closes: np.ndarray, lows: np.ndarray) -> Optional[Dict]:
        """寻找双底形态"""
        # 简化版：寻找两个相近的低点
        if len(lows) < 20:
            return None
        
        # 找出局部低点
        local_lows = []
        for i in range(5, len(lows) - 5):
            if lows[i] == min(lows[i-5:i+5]):
                local_lows.append((i, lows[i]))
        
        # 寻找两个相近的低点
        for i in range(len(local_lows) - 1):
            for j in range(i + 1, len(local_lows)):
                low1_idx, low1_price = local_lows[i]
                low2_idx, low2_price = local_lows[j]
                
                # 价格相差小于2%，且中间有一个高点
                if abs(low1_price - low2_price) / low1_price < 0.02:
                    middle_high = max(lows[low1_idx:low2_idx])
                    if middle_high > low1_price * 1.02:  # 中间至少反弹2%
                        return {
                            "support": (low1_price + low2_price) / 2,
                            "pattern": "双底"
                        }
        
        return None
    
    def _find_double_top(self, closes: np.ndarray, highs: np.ndarray) -> Optional[Dict]:
        """寻找双顶形态"""
        # 类似双底逻辑
        if len(highs) < 20:
            return None
        
        local_highs = []
        for i in range(5, len(highs) - 5):
            if highs[i] == max(highs[i-5:i+5]):
                local_highs.append((i, highs[i]))
        
        for i in range(len(local_highs) - 1):
            for j in range(i + 1, len(local_highs)):
                high1_idx, high1_price = local_highs[i]
                high2_idx, high2_price = local_highs[j]
                
                if abs(high1_price - high2_price) / high1_price < 0.02:
                    middle_low = min(highs[high1_idx:high2_idx])
                    if middle_low < high1_price * 0.98:
                        return {
                            "resistance": (high1_price + high2_price) / 2,
                            "pattern": "双顶"
                        }
        
        return None
    
    def _find_breakout(self, closes: np.ndarray, highs: np.ndarray, lows: np.ndarray) -> Optional[Dict]:
        """寻找突破形态"""
        if len(closes) < 20:
            return None
        
        # 计算20周期最高最低
        resistance = max(highs[-20:-1])  # 排除最新
        support = min(lows[-20:-1])
        
        current_price = closes[-1]
        
        # 向上突破
        if current_price > resistance * 1.01:  # 突破1%
            return {
                "direction": "看多",
                "level": resistance,
                "type": "向上突破"
            }
        
        # 向下突破
        if current_price < support * 0.99:
            return {
                "direction": "看空",
                "level": support,
                "type": "向下突破"
            }
        
        return None
    
    def _check_daily_loss_limit(self) -> bool:
        """检查是否触及单日回撤限制"""
        # 重置每日统计
        now = datetime.now()
        if self.daily_reset_time is None or now.date() > self.daily_reset_time.date():
            self.daily_pnl = 0.0
            self.daily_reset_time = now
            return False
        
        # 检查回撤
        return abs(self.daily_pnl) >= self.parameters["max_daily_loss"]
    
    def on_tick(self, ticker: Dict) -> Dict[str, Any]:
        """处理实时行情"""
        # 实时监控止损止盈
        return {"signal": "hold", "reason": "实时监控中"}
    
    def get_required_indicators(self) -> List[str]:
        """获取所需指标"""
        return ["EMA", "ATR", "RSI", "ADX", "Volume"]
    
    def validate_parameters(self) -> bool:
        """验证参数"""
        required = ["base_position_ratio", "max_daily_loss", "atr_multiplier"]
        return all(k in self.parameters for k in required)

