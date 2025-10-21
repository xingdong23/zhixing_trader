"""
EMA趋势跟随短线策略
基于多条EMA均线判断趋势，顺势交易

核心理念：
1. 趋势判断：EMA8 > EMA21 > EMA55 为上升趋势，反之为下降趋势
2. 入场信号：
   - 上升趋势：价格回踩EMA55附近做多
   - 下降趋势：价格反弹到EMA55附近做空
3. 止损：基于ATR指标，最大亏损4%
4. 止盈：移动止盈，利润5%止盈一半，后续顺次止盈
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
from . import BaseStrategy


class EMATrendStrategy(BaseStrategy):
    """EMA趋势跟随短线策略"""
    
    def __init__(self, parameters: Dict[str, Any] = None):
        default_params = {
            # EMA参数
            "ema_fast": 8,      # 快速EMA
            "ema_medium": 21,   # 中速EMA
            "ema_slow": 55,     # 慢速EMA
            
            # 入场参数
            "pullback_threshold": 0.015,  # 回踩阈值：价格距离EMA55的1.5%以内
            "trend_confirm_bars": 3,      # 趋势确认K线数量
            
            # 止损参数
            "atr_period": 14,             # ATR周期
            "atr_multiplier": 2.0,        # ATR倍数
            "max_loss_ratio": 0.04,       # 最大亏损4%
            
            # 止盈参数
            "first_profit_target": 0.05,  # 第一目标：5%利润
            "first_close_ratio": 0.5,     # 第一目标平仓50%
            "second_profit_target": 0.10, # 第二目标：10%利润
            "second_close_ratio": 0.3,    # 第二目标平仓30%
            "third_profit_target": 0.15,  # 第三目标：15%利润
            "third_close_ratio": 0.2,     # 第三目标平仓20%（全部平仓）
            
            # 移动止损参数
            "trailing_stop_activation": 0.05,  # 5%利润后启动移动止损
            "trailing_stop_distance": 0.02,    # 移动止损距离2%
            
            # 仓位管理
            "position_ratio": 0.3,  # 默认仓位30%
        }
        
        if parameters:
            default_params.update(parameters)
        
        super().__init__("EMA趋势跟随策略", default_params)
        
        # 持仓信息
        self.current_position = None  # {"side": "long/short", "entry_price": float, "size": float, "closed_ratio": float}
    
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        分析K线数据，生成交易信号
        
        Args:
            klines: K线数据列表，每个元素包含 open, high, low, close, volume
        
        Returns:
            交易信号字典
        """
        if not klines or len(klines) < 100:
            return {"signal": "hold", "reason": "数据不足，需要至少100根K线"}
        
        # 提取价格数据
        closes = np.array([k["close"] for k in klines])
        highs = np.array([k["high"] for k in klines])
        lows = np.array([k["low"] for k in klines])
        
        # 计算EMA指标
        ema8 = self._calculate_ema(closes, self.parameters["ema_fast"])
        ema21 = self._calculate_ema(closes, self.parameters["ema_medium"])
        ema55 = self._calculate_ema(closes, self.parameters["ema_slow"])
        
        # 计算ATR
        atr = self._calculate_atr(klines, self.parameters["atr_period"])
        
        # 当前价格
        current_price = closes[-1]
        
        # 判断趋势
        trend = self._identify_trend(ema8, ema21, ema55)
        
        # 如果有持仓，检查止盈止损
        if self.current_position:
            exit_signal = self._check_exit_conditions(
                current_price, 
                highs[-1], 
                lows[-1], 
                atr
            )
            if exit_signal:
                return exit_signal
        
        # 生成入场信号
        entry_signal = self._generate_entry_signal(
            trend,
            current_price,
            ema8[-1],
            ema21[-1],
            ema55[-1],
            atr,
            closes,
            highs,
            lows
        )
        
        return entry_signal
    
    def _identify_trend(self, ema8: np.ndarray, ema21: np.ndarray, ema55: np.ndarray) -> str:
        """
        识别趋势方向
        
        上升趋势：EMA8 > EMA21 > EMA55
        下降趋势：EMA8 < EMA21 < EMA55
        震荡趋势：其他情况
        """
        # 检查最近N根K线的趋势一致性
        confirm_bars = self.parameters["trend_confirm_bars"]
        
        # 上升趋势确认
        uptrend_count = 0
        downtrend_count = 0
        
        for i in range(-confirm_bars, 0):
            if ema8[i] > ema21[i] > ema55[i]:
                uptrend_count += 1
            elif ema8[i] < ema21[i] < ema55[i]:
                downtrend_count += 1
        
        if uptrend_count == confirm_bars:
            return "上升趋势"
        elif downtrend_count == confirm_bars:
            return "下降趋势"
        else:
            return "震荡趋势"
    
    def _generate_entry_signal(
        self,
        trend: str,
        current_price: float,
        ema8: float,
        ema21: float,
        ema55: float,
        atr: float,
        closes: np.ndarray,
        highs: np.ndarray,
        lows: np.ndarray
    ) -> Dict[str, Any]:
        """生成入场信号"""
        
        # 如果已有持仓，不再开新仓
        if self.current_position:
            return {"signal": "hold", "reason": "已有持仓"}
        
        # 震荡趋势不交易
        if trend == "震荡趋势":
            return {
                "signal": "hold",
                "reason": "震荡趋势，不符合入场条件",
                "analysis": {
                    "trend": trend,
                    "ema8": ema8,
                    "ema21": ema21,
                    "ema55": ema55
                }
            }
        
        pullback_threshold = self.parameters["pullback_threshold"]
        
        # 上升趋势：寻找回踩EMA55做多机会
        if trend == "上升趋势":
            # 价格回踩到EMA55附近（±1.5%以内）
            distance_to_ema55 = abs(current_price - ema55) / ema55
            
            if distance_to_ema55 <= pullback_threshold:
                # 确认回踩后有反弹迹象（最近一根K线收盘价高于开盘价）
                last_candle_bullish = closes[-1] > closes[-2]
                
                if last_candle_bullish or current_price > ema55:
                    # 计算止损止盈
                    stop_loss = self._calculate_stop_loss(current_price, atr, "buy")
                    take_profits = self._calculate_take_profits(current_price, "buy")
                    
                    return {
                        "signal": "buy",
                        "price": current_price,
                        "position_ratio": self.parameters["position_ratio"],
                        "stop_loss": stop_loss,
                        "take_profit_levels": take_profits,
                        "reason": f"上升趋势回踩EMA55做多，当前价格{current_price:.2f}，EMA55={ema55:.2f}",
                        "analysis": {
                            "trend": trend,
                            "ema8": ema8,
                            "ema21": ema21,
                            "ema55": ema55,
                            "distance_to_ema55": f"{distance_to_ema55:.2%}",
                            "atr": atr
                        }
                    }
        
        # 下降趋势：寻找反弹到EMA55做空机会
        elif trend == "下降趋势":
            # 价格反弹到EMA55附近（±1.5%以内）
            distance_to_ema55 = abs(current_price - ema55) / ema55
            
            if distance_to_ema55 <= pullback_threshold:
                # 确认反弹后有回落迹象（最近一根K线收盘价低于开盘价）
                last_candle_bearish = closes[-1] < closes[-2]
                
                if last_candle_bearish or current_price < ema55:
                    # 计算止损止盈
                    stop_loss = self._calculate_stop_loss(current_price, atr, "sell")
                    take_profits = self._calculate_take_profits(current_price, "sell")
                    
                    return {
                        "signal": "sell",
                        "price": current_price,
                        "position_ratio": self.parameters["position_ratio"],
                        "stop_loss": stop_loss,
                        "take_profit_levels": take_profits,
                        "reason": f"下降趋势反弹EMA55做空，当前价格{current_price:.2f}，EMA55={ema55:.2f}",
                        "analysis": {
                            "trend": trend,
                            "ema8": ema8,
                            "ema21": ema21,
                            "ema55": ema55,
                            "distance_to_ema55": f"{distance_to_ema55:.2%}",
                            "atr": atr
                        }
                    }
        
        return {
            "signal": "hold",
            "reason": f"{trend}，等待回踩/反弹到EMA55",
            "analysis": {
                "trend": trend,
                "current_price": current_price,
                "ema55": ema55,
                "distance_to_ema55": f"{abs(current_price - ema55) / ema55:.2%}"
            }
        }
    
    def _calculate_stop_loss(self, entry_price: float, atr: float, side: str) -> float:
        """
        计算止损价格
        
        使用ATR倍数和最大亏损比例中较小的一个
        """
        atr_stop_distance = atr * self.parameters["atr_multiplier"]
        max_loss_distance = entry_price * self.parameters["max_loss_ratio"]
        
        # 选择较小的止损距离（更保守）
        stop_distance = min(atr_stop_distance, max_loss_distance)
        
        if side == "buy":
            return entry_price - stop_distance
        else:  # sell
            return entry_price + stop_distance
    
    def _calculate_take_profits(self, entry_price: float, side: str) -> List[Dict[str, Any]]:
        """
        计算分批止盈价格
        
        Returns:
            止盈级别列表，每个包含价格、平仓比例、说明
        """
        take_profits = []
        
        # 第一目标：5%利润，平仓50%
        if side == "buy":
            tp1_price = entry_price * (1 + self.parameters["first_profit_target"])
        else:
            tp1_price = entry_price * (1 - self.parameters["first_profit_target"])
        
        take_profits.append({
            "price": tp1_price,
            "close_ratio": self.parameters["first_close_ratio"],
            "profit_ratio": self.parameters["first_profit_target"],
            "action": f"平仓{self.parameters['first_close_ratio']:.0%}，移动止损到成本价"
        })
        
        # 第二目标：10%利润，平仓30%
        if side == "buy":
            tp2_price = entry_price * (1 + self.parameters["second_profit_target"])
        else:
            tp2_price = entry_price * (1 - self.parameters["second_profit_target"])
        
        take_profits.append({
            "price": tp2_price,
            "close_ratio": self.parameters["second_close_ratio"],
            "profit_ratio": self.parameters["second_profit_target"],
            "action": f"平仓{self.parameters['second_close_ratio']:.0%}，继续持有剩余仓位"
        })
        
        # 第三目标：15%利润，平仓剩余20%
        if side == "buy":
            tp3_price = entry_price * (1 + self.parameters["third_profit_target"])
        else:
            tp3_price = entry_price * (1 - self.parameters["third_profit_target"])
        
        take_profits.append({
            "price": tp3_price,
            "close_ratio": self.parameters["third_close_ratio"],
            "profit_ratio": self.parameters["third_profit_target"],
            "action": f"平仓剩余{self.parameters['third_close_ratio']:.0%}，完全退出"
        })
        
        return take_profits
    
    def _check_exit_conditions(
        self,
        current_price: float,
        current_high: float,
        current_low: float,
        atr: float
    ) -> Optional[Dict[str, Any]]:
        """
        检查退出条件（止损/止盈）
        
        Returns:
            如果需要退出，返回退出信号；否则返回None
        """
        if not self.current_position:
            return None
        
        position = self.current_position
        entry_price = position["entry_price"]
        side = position["side"]
        closed_ratio = position.get("closed_ratio", 0.0)
        
        # 计算当前盈亏比例
        if side == "long":
            profit_ratio = (current_price - entry_price) / entry_price
            # 检查止损
            if current_low <= position["stop_loss"]:
                self.current_position = None
                return {
                    "signal": "sell",
                    "price": position["stop_loss"],
                    "position_ratio": 1.0 - closed_ratio,
                    "reason": f"触发止损，止损价{position['stop_loss']:.2f}",
                    "type": "stop_loss"
                }
        else:  # short
            profit_ratio = (entry_price - current_price) / entry_price
            # 检查止损
            if current_high >= position["stop_loss"]:
                self.current_position = None
                return {
                    "signal": "buy",
                    "price": position["stop_loss"],
                    "position_ratio": 1.0 - closed_ratio,
                    "reason": f"触发止损，止损价{position['stop_loss']:.2f}",
                    "type": "stop_loss"
                }
        
        # 检查分批止盈
        for i, tp_level in enumerate(position.get("take_profit_levels", [])):
            if position.get(f"tp{i+1}_hit"):
                continue  # 已经触发过的止盈跳过
            
            tp_price = tp_level["price"]
            
            # 检查是否触及止盈价格
            if side == "long" and current_high >= tp_price:
                position[f"tp{i+1}_hit"] = True
                position["closed_ratio"] += tp_level["close_ratio"]
                
                # 第一次止盈后，移动止损到成本价
                if i == 0:
                    position["stop_loss"] = entry_price
                
                # 如果全部平仓，清除持仓
                if position["closed_ratio"] >= 1.0:
                    self.current_position = None
                
                return {
                    "signal": "sell",
                    "price": tp_price,
                    "position_ratio": tp_level["close_ratio"],
                    "reason": f"触发第{i+1}目标止盈，价格{tp_price:.2f}，利润{tp_level['profit_ratio']:.1%}",
                    "type": "take_profit",
                    "level": i + 1
                }
            
            elif side == "short" and current_low <= tp_price:
                position[f"tp{i+1}_hit"] = True
                position["closed_ratio"] += tp_level["close_ratio"]
                
                # 第一次止盈后，移动止损到成本价
                if i == 0:
                    position["stop_loss"] = entry_price
                
                # 如果全部平仓，清除持仓
                if position["closed_ratio"] >= 1.0:
                    self.current_position = None
                
                return {
                    "signal": "buy",
                    "price": tp_price,
                    "position_ratio": tp_level["close_ratio"],
                    "reason": f"触发第{i+1}目标止盈，价格{tp_price:.2f}，利润{tp_level['profit_ratio']:.1%}",
                    "type": "take_profit",
                    "level": i + 1
                }
        
        # 移动止损逻辑（在达到一定利润后）
        if profit_ratio >= self.parameters["trailing_stop_activation"]:
            trailing_distance = current_price * self.parameters["trailing_stop_distance"]
            
            if side == "long":
                new_stop = current_price - trailing_distance
                # 只向上移动止损
                if new_stop > position["stop_loss"]:
                    position["stop_loss"] = new_stop
            else:  # short
                new_stop = current_price + trailing_distance
                # 只向下移动止损
                if new_stop < position["stop_loss"]:
                    position["stop_loss"] = new_stop
        
        return None
    
    def _calculate_ema(self, prices: np.ndarray, period: int) -> np.ndarray:
        """计算指数移动平均线"""
        ema = np.zeros_like(prices, dtype=float)
        ema[0] = prices[0]
        multiplier = 2 / (period + 1)
        
        for i in range(1, len(prices)):
            ema[i] = (prices[i] - ema[i-1]) * multiplier + ema[i-1]
        
        return ema
    
    def _calculate_atr(self, klines: List[Dict], period: int) -> float:
        """计算平均真实波幅（ATR）"""
        if len(klines) < period + 1:
            return 0.0
        
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
        
        # 返回最近period个周期的ATR
        return np.mean(true_ranges[-period:]) if true_ranges else 0.0
    
    def on_tick(self, ticker: Dict) -> Dict[str, Any]:
        """
        处理实时行情tick
        
        Args:
            ticker: 实时行情数据 {"price": float, "volume": float, ...}
        
        Returns:
            交易信号
        """
        # 实时监控止损止盈
        if self.current_position:
            current_price = ticker.get("price", 0)
            if current_price > 0:
                # 简化版本：只检查当前价格，不考虑high/low
                # 实际使用时应该用完整的K线数据
                return {"signal": "hold", "reason": "实时监控中"}
        
        return {"signal": "hold", "reason": "无持仓"}
    
    def get_required_indicators(self) -> List[str]:
        """获取策略所需的技术指标"""
        return ["EMA8", "EMA21", "EMA55", "ATR"]
    
    def validate_parameters(self) -> bool:
        """验证参数有效性"""
        required = [
            "ema_fast", "ema_medium", "ema_slow",
            "atr_period", "atr_multiplier", "max_loss_ratio",
            "first_profit_target", "second_profit_target", "third_profit_target"
        ]
        return all(k in self.parameters for k in required)
    
    def update_position(self, signal: Dict[str, Any]):
        """
        更新持仓状态（在执行交易后调用）
        
        Args:
            signal: 交易信号
        """
        if signal["signal"] == "buy" and signal.get("type") != "take_profit":
            # 开多仓
            self.current_position = {
                "side": "long",
                "entry_price": signal["price"],
                "size": signal.get("position_ratio", self.parameters["position_ratio"]),
                "stop_loss": signal.get("stop_loss"),
                "take_profit_levels": signal.get("take_profit_levels", []),
                "closed_ratio": 0.0,
                "entry_time": datetime.now()
            }
        elif signal["signal"] == "sell" and signal.get("type") != "take_profit":
            # 开空仓
            self.current_position = {
                "side": "short",
                "entry_price": signal["price"],
                "size": signal.get("position_ratio", self.parameters["position_ratio"]),
                "stop_loss": signal.get("stop_loss"),
                "take_profit_levels": signal.get("take_profit_levels", []),
                "closed_ratio": 0.0,
                "entry_time": datetime.now()
            }
