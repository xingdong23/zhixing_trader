"""
高频短线交易策略 (High Frequency Scalping Strategy)

策略核心：
1. 时间框架：主看5分钟+15分钟，辅助1小时判断方向
2. 持仓时间：5分钟-2小时，不过夜
3. 杠杆使用：3-5倍（严格控制仓位）
4. 每日目标：3-5%收益

入场条件（做多）：
1. 5分钟EMA8上穿EMA21
2. 成交量突增（>前5根均值1.5倍）
3. RSI(14)从低于45区域向上突破
4. 价格突破前15分钟高点

入场条件（做空）：
1. 5分钟EMA8下穿EMA21
2. 成交量突增（>前5根均值1.5倍）
3. RSI(14)从高于55区域向下跌破
4. 价格跌破前15分钟低点

风险控制：
- 止损：0.8%-1.2%
- 止盈：1.5%-2.5%
- 盈亏比：1.5:1 - 2:1
- 单日最大亏损：8%
- 连续亏损2单停止交易
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, time
from enum import Enum
import numpy as np
import logging
from .position_storage import PositionStorage

logger = logging.getLogger(__name__)


class TradingSession(Enum):
    """交易时段"""
    MORNING_BREAKOUT = "早盘突破"  # 8:00-10:00
    NOON_OSCILLATION = "午间震荡"  # 14:00-16:00
    US_SESSION = "美盘联动"  # 20:00-22:00
    OTHER = "其他时段"


class HighFrequencyScalpingStrategy:
    """高频短线交易策略"""
    
    def __init__(self, parameters: Dict[str, Any] = None):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典，必须从配置文件传入
        """
        if not parameters:
            raise ValueError("策略参数不能为空，必须从配置文件传入所有参数")
        
        # 应用保守模式调整
        if parameters.get("conservative_mode"):
            parameters["max_daily_loss"] = min(parameters.get("max_daily_loss", 0.08), 0.05)
            parameters["max_trades_per_day"] = min(parameters.get("max_trades_per_day", 8), 5)
            parameters["stop_loss_max"] = min(parameters.get("stop_loss_max", 0.012), 0.010)
            parameters["breakout_confirmation"] = max(parameters.get("breakout_confirmation", 0.001), 0.0015)
            parameters["volume_multiplier"] = max(parameters.get("volume_multiplier", 1.5), 1.8)
        
        # 策略基本信息
        self.name = "高频短线交易策略"
        self.parameters = parameters
        
        # 资金管理（支持复利）
        self.current_capital = parameters.get("total_capital", 300.0)
        
        # 持仓持久化存储
        self.position_storage = PositionStorage()
        
        # 持仓信息（从文件加载）
        self.current_position = self.position_storage.load_position()
        if self.current_position:
            logger.warning(f"⚠️  检测到未平仓持仓，已恢复: {self.current_position}")
        
        # 交易统计
        self.daily_trades = []
        self.daily_pnl = 0.0
        self.consecutive_losses = 0
        self.last_trade_time = None
        
        # 缓存的K线数据（用于多时间框架分析）
        self.klines_5m = []  # 5分钟K线
        self.klines_15m = []  # 15分钟K线
        self.klines_1h = []  # 1小时K线
        
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        分析K线数据，生成交易信号
        
        Args:
            klines: K线数据列表（5分钟级别）
        
        Returns:
            交易信号字典
        """
        # 数据验证
        if not klines or len(klines) < 100:
            return {"signal": "hold", "reason": "数据不足，需要至少100根K线"}
        
        # 更新K线缓存
        self.klines_5m = klines
        
        # 检查风险控制条件
        risk_check = self._check_risk_controls()
        if not risk_check["allowed"]:
            return {"signal": "hold", "reason": risk_check["reason"]}
        
        # 检查特殊情况
        special_check = self._check_special_conditions(klines)
        if not special_check["allowed"]:
            return {"signal": "hold", "reason": special_check["reason"]}
        
        # 如果有持仓，检查出场条件
        if self.current_position:
            exit_signal = self._check_exit_conditions(klines)
            if exit_signal:
                return exit_signal
        
        # 如果已有持仓，不再开新仓
        if self.current_position:
            return {"signal": "hold", "reason": "已有持仓，等待出场"}
        
        # 生成入场信号
        entry_signal = self._generate_entry_signal(klines)
        
        return entry_signal
    
    def _check_risk_controls(self) -> Dict[str, Any]:
        """检查风险控制条件"""
        # 使用当前资金作为风控基准（支持动态复利）
        current_capital = getattr(self, 'current_capital', self.parameters.get('total_capital', 300.0))
        
        # 检查单日盈利是否达到目标
        if self.daily_pnl >= current_capital * self.parameters["max_daily_profit"]:
            return {
                "allowed": False,
                "reason": f"已达到单日盈利目标 {self.parameters['max_daily_profit']:.1%}，停止交易"
            }
        
        # 检查单日亏损是否超限
        if self.daily_pnl <= -current_capital * self.parameters["max_daily_loss"]:
            return {
                "allowed": False,
                "reason": f"已达到单日最大亏损 {self.parameters['max_daily_loss']:.1%}（{-current_capital * self.parameters['max_daily_loss']:.2f} USDT），停止交易"
            }
        
        # 检查连续亏损
        if self.consecutive_losses >= self.parameters["max_consecutive_losses"]:
            return {
                "allowed": False,
                "reason": f"连续亏损 {self.consecutive_losses} 次，停止交易"
            }
        
        # 检查每日交易次数
        if len(self.daily_trades) >= self.parameters["max_trades_per_day"]:
            return {
                "allowed": False,
                "reason": f"已达到每日最大交易次数 {self.parameters['max_trades_per_day']}"
            }
        
        return {"allowed": True, "reason": "通过风险检查"}
    
    def _check_special_conditions(self, klines: List[Dict]) -> Dict[str, Any]:
        """检查特殊情况"""
        
        # 检查成交量是否异常萎缩
        volumes = np.array([k["volume"] for k in klines[-20:]])
        avg_volume = np.mean(volumes)
        current_volume = klines[-1]["volume"]
        
        if current_volume < avg_volume * self.parameters["min_volume_threshold"]:
            return {
                "allowed": False,
                "reason": f"成交量异常萎缩，当前 {current_volume:.2f}，平均 {avg_volume:.2f}"
            }
        
        # 检查1分钟波动是否过大
        if len(klines) >= 2:
            last_close = klines[-2]["close"]
            current_close = klines[-1]["close"]
            volatility = abs(current_close - last_close) / last_close
            
            if volatility > self.parameters["max_1min_volatility"]:
                return {
                    "allowed": False,
                    "reason": f"1分钟波动过大 {volatility:.2%}，超过阈值 {self.parameters['max_1min_volatility']:.2%}"
                }
        
        return {"allowed": True, "reason": "通过特殊条件检查"}
    
    def _generate_entry_signal(self, klines: List[Dict]) -> Dict[str, Any]:
        """生成入场信号"""
        # 提取价格和成交量数据
        closes = np.array([k["close"] for k in klines])
        highs = np.array([k["high"] for k in klines])
        lows = np.array([k["low"] for k in klines])
        volumes = np.array([k["volume"] for k in klines])
        
        # 计算技术指标
        ema8 = self._calculate_ema(closes, self.parameters["ema_fast"])
        ema21 = self._calculate_ema(closes, self.parameters["ema_slow"])
        rsi = self._calculate_rsi(closes, self.parameters["rsi_period"])
        bb_upper, bb_middle, bb_lower = self._calculate_bollinger_bands(
            closes, self.parameters["bb_period"], self.parameters["bb_std"]
        )
        macd_line, signal_line, histogram = self._calculate_macd(
            closes, 
            self.parameters["macd_fast"],
            self.parameters["macd_slow"],
            self.parameters["macd_signal"]
        )
        
        # 当前值
        current_price = closes[-1]
        current_ema8 = ema8[-1]
        current_ema21 = ema21[-1]
        current_rsi = rsi[-1]
        current_volume = volumes[-1]
        current_macd = histogram[-1]
        
        # 前一根K线值
        prev_ema8 = ema8[-2]
        prev_ema21 = ema21[-2]
        prev_rsi = rsi[-2]
        prev_macd = histogram[-2]
        
        # 检查成交量突增
        avg_volume = np.mean(volumes[-self.parameters["volume_lookback"]-1:-1])
        volume_surge = current_volume > avg_volume * self.parameters["volume_multiplier"]
        
        # 计算前15分钟的高低点
        lookback = min(self.parameters["breakout_lookback"], len(klines) - 1)
        recent_high = np.max(highs[-lookback-1:-1])
        recent_low = np.min(lows[-lookback-1:-1])
        
        # 识别交易时段
        session = self._identify_trading_session()
        
        if self.parameters.get("session_filter_enabled"):
            if session.name not in self.parameters.get("allowed_sessions", []):
                return {"signal": "hold", "reason": f"时段过滤: {session.value}"}
        
        # 做多信号检查
        long_conditions = {
            "ema_cross": prev_ema8 <= prev_ema21 and current_ema8 > current_ema21,  # EMA8上穿EMA21
            "volume_surge": volume_surge,  # 成交量突增
            "rsi_condition": prev_rsi < self.parameters["rsi_long_threshold_low"] and current_rsi >= self.parameters["rsi_long_threshold_low"],  # RSI从低位向上
            "price_breakout": current_price > recent_high * (1 + self.parameters["breakout_confirmation"]),  # 价格突破前高
            "macd_confirm": current_macd > prev_macd,  # MACD柱状线转势
        }
        
        # 做空信号检查
        short_conditions = {
            "ema_cross": prev_ema8 >= prev_ema21 and current_ema8 < current_ema21,  # EMA8下穿EMA21
            "volume_surge": volume_surge,  # 成交量突增
            "rsi_condition": prev_rsi > self.parameters["rsi_short_threshold_high"] and current_rsi <= self.parameters["rsi_short_threshold_high"],  # RSI从高位向下
            "price_breakout": current_price < recent_low * (1 - self.parameters["breakout_confirmation"]),  # 价格跌破前低
            "macd_confirm": current_macd < prev_macd,  # MACD柱状线转势
        }
        
        # 检查做多条件（至少满足3个核心条件）
        long_score = sum([
            long_conditions["ema_cross"],
            long_conditions["volume_surge"],
            long_conditions["price_breakout"]
        ])
        
        if long_score >= 2:  # 至少满足2个核心条件
            # 计算止损止盈
            stop_loss, take_profit = self._calculate_stop_take_profit(current_price, "long", klines)
            
            # 计算仓位大小
            position_size = self._calculate_position_size(current_price, stop_loss)
            
            return {
                "signal": "buy",
                "price": current_price,
                "amount": position_size,
                "stop_loss": stop_loss,
                "take_profit": take_profit,
                "leverage": self.parameters["leverage"],
                "reason": f"做多信号触发 - {session.value}",
                "analysis": {
                    "ema8": current_ema8,
                    "ema21": current_ema21,
                    "rsi": current_rsi,
                    "volume_ratio": current_volume / avg_volume,
                    "macd": current_macd,
                    "session": session.value,
                    "conditions": long_conditions
                }
            }
        
        # 检查做空条件（至少满足2个核心条件）
        short_score = sum([
            short_conditions["ema_cross"],
            short_conditions["volume_surge"],
            short_conditions["price_breakout"]
        ])
        
        if short_score >= 2:  # 至少满足2个核心条件
            # 计算止损止盈
            stop_loss, take_profit = self._calculate_stop_take_profit(current_price, "short", klines)
            
            # 计算仓位大小
            position_size = self._calculate_position_size(current_price, stop_loss)
            
            return {
                "signal": "sell",
                "price": current_price,
                "amount": position_size,
                "stop_loss": stop_loss,
                "take_profit": take_profit,
                "leverage": self.parameters["leverage"],
                "reason": f"做空信号触发 - {session.value}",
                "analysis": {
                    "ema8": current_ema8,
                    "ema21": current_ema21,
                    "rsi": current_rsi,
                    "volume_ratio": current_volume / avg_volume,
                    "macd": current_macd,
                    "session": session.value,
                    "conditions": short_conditions
                }
            }
        
        # 无信号
        return {
            "signal": "hold",
            "reason": "未满足入场条件",
            "analysis": {
                "ema8": current_ema8,
                "ema21": current_ema21,
                "rsi": current_rsi,
                "volume_surge": volume_surge,
                "long_conditions": long_conditions,
                "short_conditions": short_conditions
            }
        }
    
    def _check_exit_conditions(self, klines: List[Dict]) -> Optional[Dict[str, Any]]:
        """检查出场条件"""
        if not self.current_position:
            return None
        
        position = self.current_position
        entry_price = position["entry_price"]
        side = position["side"]
        entry_time = position["entry_time"]
        stop_loss = position["stop_loss"]
        take_profit = position["take_profit"]
        partial_closed = position.get("partial_closed", False)
        
        # 当前价格
        current_price = klines[-1]["close"]
        current_high = klines[-1]["high"]
        current_low = klines[-1]["low"]
        
        # 计算持仓时间
        holding_time = (datetime.now() - entry_time).total_seconds() / 60  # 分钟
        
        closes = np.array([k["close"] for k in klines])
        ema8 = self._calculate_ema(closes, self.parameters["ema_fast"])
        ema21 = self._calculate_ema(closes, self.parameters["ema_slow"])
        macd_line, signal_line, histogram = self._calculate_macd(
            closes,
            self.parameters["macd_fast"],
            self.parameters["macd_slow"],
            self.parameters["macd_signal"]
        )
        atr = self._calculate_atr(klines, 14)
        effective_max_holding = self.parameters["max_holding_time"]
        # 计算当前盈亏
        if side == "long":
            pnl_ratio = (current_price - entry_price) / entry_price
            
            # 检查止损
            if current_low <= stop_loss:
                return {
                    "signal": "sell",
                    "price": stop_loss,
                    "amount": position["amount"],
                    "reason": f"触发止损 {stop_loss:.2f}，亏损 {pnl_ratio:.2%}",
                    "type": "stop_loss",
                    "pnl": pnl_ratio
                }
            
            # 检查止盈
            if current_high >= take_profit:
                return {
                    "signal": "sell",
                    "price": take_profit,
                    "amount": position["amount"],
                    "reason": f"触发止盈 {take_profit:.2f}，盈利 {pnl_ratio:.2%}",
                    "type": "take_profit",
                    "pnl": pnl_ratio
                }
            
        else:  # short
            pnl_ratio = (entry_price - current_price) / entry_price
            
            # 检查止损
            if current_high >= stop_loss:
                return {
                    "signal": "buy",
                    "price": stop_loss,
                    "amount": position["amount"],
                    "reason": f"触发止损 {stop_loss:.2f}，亏损 {pnl_ratio:.2%}",
                    "type": "stop_loss",
                    "pnl": pnl_ratio
                }
            
            # 检查止盈
            if current_low <= take_profit:
                return {
                    "signal": "buy",
                    "price": take_profit,
                    "amount": position["amount"],
                    "reason": f"触发止盈 {take_profit:.2f}，盈利 {pnl_ratio:.2%}",
                    "type": "take_profit",
                    "pnl": pnl_ratio
                }
        
        # 动态止盈逻辑
        if pnl_ratio >= self.parameters["profit_level_1"]:
            # 盈利0.5%后，移动止损到成本价
            if side == "long" and stop_loss < entry_price:
                position["stop_loss"] = entry_price
                self.position_storage.save_position(self.current_position)
                logger.info(f"盈利 {pnl_ratio:.2%}，移动止损到成本价 {entry_price:.2f}")
            elif side == "short" and stop_loss > entry_price:
                position["stop_loss"] = entry_price
                self.position_storage.save_position(self.current_position)
                logger.info(f"盈利 {pnl_ratio:.2%}，移动止损到成本价 {entry_price:.2f}")
        
        if pnl_ratio >= self.parameters["profit_level_2"]:
            # 盈利1%后，移动止损到盈利0.5%
            profit_05_price = entry_price * (1 + self.parameters["profit_level_1"]) if side == "long" else entry_price * (1 - self.parameters["profit_level_1"])
            if side == "long" and stop_loss < profit_05_price:
                position["stop_loss"] = profit_05_price
                self.position_storage.save_position(self.current_position)
                logger.info(f"盈利 {pnl_ratio:.2%}，移动止损到盈利0.5%位置 {profit_05_price:.2f}")
            elif side == "short" and stop_loss > profit_05_price:
                position["stop_loss"] = profit_05_price
                self.position_storage.save_position(self.current_position)
                logger.info(f"盈利 {pnl_ratio:.2%}，移动止损到盈利0.5%位置 {profit_05_price:.2f}")
        
        if pnl_ratio >= self.parameters["profit_level_3"] and not partial_closed:
            # 盈利1.5%后，分批平仓一半
            partial_amount = position["amount"] * self.parameters["partial_close_ratio"]
            position["amount"] -= partial_amount
            position["partial_closed"] = True
            
            return {
                "signal": "sell" if side == "long" else "buy",
                "price": current_price,
                "amount": partial_amount,
                "reason": f"盈利 {pnl_ratio:.2%}，分批平仓 {self.parameters['partial_close_ratio']:.0%}",
                "type": "partial_close",
                "pnl": pnl_ratio
            }
        
        if self.parameters.get("trend_follow_enabled") and pnl_ratio > 0:
            if side == "long":
                trend_ok = ema8[-1] > ema21[-1] and histogram[-1] > 0
            else:
                trend_ok = ema8[-1] < ema21[-1] and histogram[-1] < 0
            if trend_ok:
                if atr > 0 and pnl_ratio >= self.parameters.get("trend_follow_min_profit", 0.01):
                    trailing_dist = atr * self.parameters.get("trailing_atr_multiplier", 1.2)
                    if side == "long":
                        new_stop = max(position["stop_loss"], current_price - trailing_dist)
                        if self.parameters.get("use_ema_trailing", True):
                            new_stop = max(new_stop, ema21[-1])
                        if new_stop > position["stop_loss"]:
                            position["stop_loss"] = new_stop
                            self.position_storage.save_position(self.current_position)
                            logger.info(f"顺势持有，更新追踪止损到 {new_stop:.2f}")
                    else:
                        new_stop = min(position["stop_loss"], current_price + trailing_dist)
                        if self.parameters.get("use_ema_trailing", True):
                            new_stop = min(new_stop, ema21[-1])
                        if new_stop < position["stop_loss"]:
                            position["stop_loss"] = new_stop
                            self.position_storage.save_position(self.current_position)
                            logger.info(f"顺势持有，更新追踪止损到 {new_stop:.2f}")
                if self.parameters.get("extend_holding_time_on_trend", True):
                    effective_max_holding = self.parameters.get("max_holding_time_trend", effective_max_holding)
        
        # 检查最大持仓时间
        if holding_time >= effective_max_holding:
            return {
                "signal": "sell" if side == "long" else "buy",
                "price": current_price,
                "amount": position["amount"],
                "reason": f"超过最大持仓时间 {self.parameters['max_holding_time']} 分钟，强制平仓",
                "type": "timeout",
                "pnl": pnl_ratio
            }
        
        # 检查加速离场信号
        exit_signal = self._check_accelerated_exit(klines, position)
        if exit_signal:
            return exit_signal
        
        return None
    
    def _check_accelerated_exit(self, klines: List[Dict], position: Dict) -> Optional[Dict[str, Any]]:
        """检查加速离场信号"""
        if len(klines) < 3:
            return None
        
        side = position["side"]
        entry_price = position["entry_price"]
        current_price = klines[-1]["close"]
        
        # 计算当前盈亏
        pnl_ratio = (current_price - entry_price) / entry_price if side == "long" else (entry_price - current_price) / entry_price
        
        # 只在盈利状态下检查加速离场
        if pnl_ratio <= 0:
            return None
        
        # 检查反向K线组合
        last_3_closes = [k["close"] for k in klines[-3:]]
        last_3_opens = [k["open"] for k in klines[-3:]]
        
        if side == "long":
            # 连续2根阴线
            bearish_count = sum(1 for i in range(-2, 0) if last_3_closes[i] < last_3_opens[i])
            if bearish_count >= 2:
                return {
                    "signal": "sell",
                    "price": current_price,
                    "amount": position["amount"],
                    "reason": f"盈利后出现连续阴线，加速离场，盈利 {pnl_ratio:.2%}",
                    "type": "accelerated_exit",
                    "pnl": pnl_ratio
                }
        else:  # short
            # 连续2根阳线
            bullish_count = sum(1 for i in range(-2, 0) if last_3_closes[i] > last_3_opens[i])
            if bullish_count >= 2:
                return {
                    "signal": "buy",
                    "price": current_price,
                    "amount": position["amount"],
                    "reason": f"盈利后出现连续阳线，加速离场，盈利 {pnl_ratio:.2%}",
                    "type": "accelerated_exit",
                    "pnl": pnl_ratio
                }
        
        # 检查成交量突然萎缩
        volumes = np.array([k["volume"] for k in klines[-6:]])
        avg_volume = np.mean(volumes[:-1])
        current_volume = volumes[-1]
        
        if current_volume < avg_volume * 0.5:  # 成交量萎缩50%以上
            return {
                "signal": "sell" if side == "long" else "buy",
                "price": current_price,
                "amount": position["amount"],
                "reason": f"成交量突然萎缩，加速离场，盈利 {pnl_ratio:.2%}",
                "type": "accelerated_exit",
                "pnl": pnl_ratio
            }
        
        # 检查价格触及重要均线阻力
        closes = np.array([k["close"] for k in klines])
        ema21 = self._calculate_ema(closes, 21)
        
        if side == "long" and current_price <= ema21[-1]:
            return {
                "signal": "sell",
                "price": current_price,
                "amount": position["amount"],
                "reason": f"价格跌破EMA21，加速离场，盈利 {pnl_ratio:.2%}",
                "type": "accelerated_exit",
                "pnl": pnl_ratio
            }
        elif side == "short" and current_price >= ema21[-1]:
            return {
                "signal": "buy",
                "price": current_price,
                "amount": position["amount"],
                "reason": f"价格突破EMA21，加速离场，盈利 {pnl_ratio:.2%}",
                "type": "accelerated_exit",
                "pnl": pnl_ratio
            }
        
        return None
    
    def _calculate_stop_take_profit(self, entry_price: float, side: str, klines: List[Dict]) -> Tuple[float, float]:
        """计算止损止盈价格"""
        # 计算ATR作为参考
        atr = self._calculate_atr(klines, 14)
        
        # 基于ATR和固定百分比计算止损
        atr_stop_distance = atr * 1.5
        percent_stop_distance = entry_price * self.parameters["stop_loss_max"]
        
        # 选择较小的止损距离（更保守）
        stop_distance = min(atr_stop_distance, percent_stop_distance)
        
        # 确保止损在范围内
        stop_distance = max(
            entry_price * self.parameters["stop_loss_min"],
            min(stop_distance, entry_price * self.parameters["stop_loss_max"])
        )
        
        if side == "long":
            stop_loss = entry_price - stop_distance
            # 止盈按盈亏比计算
            profit_distance = stop_distance * self.parameters["profit_risk_ratio_max"]
            take_profit = entry_price + profit_distance
        else:  # short
            stop_loss = entry_price + stop_distance
            profit_distance = stop_distance * self.parameters["profit_risk_ratio_max"]
            take_profit = entry_price - profit_distance
        
        return stop_loss, take_profit
    
    def _calculate_position_size(self, entry_price: float, stop_loss: float) -> float:
        """
        计算仓位大小
        
        支持两种模式：
        1. 固定保证金模式：每次使用固定的portion_size
        2. 复利模式：根据当前总资金按比例计算保证金
        """
        # 检查是否启用复利
        enable_compounding = self.parameters.get("enable_compounding", False)
        
        if enable_compounding:
            # 复利模式：按当前资金的比例计算
            compounding_ratio = self.parameters.get("compounding_ratio", 0.333)
            position_value = self.current_capital * compounding_ratio
            logger.debug(f"💰 复利模式：当前资金 {self.current_capital:.2f}，使用比例 {compounding_ratio:.1%}，保证金 {position_value:.2f}")
        else:
            # 固定模式：使用配置的固定金额
            portion_size = self.parameters["portion_size"]
            max_portions = self.parameters["max_portions_per_trade"]
            position_value = portion_size * max_portions
            logger.debug(f"💵 固定模式：保证金 {position_value:.2f}")
        
        # 应用杠杆
        leveraged_value = position_value * self.parameters["leverage"]
        
        # 计算数量（BTC）
        amount = leveraged_value / entry_price
        
        return amount
    
    def _identify_trading_session(self) -> TradingSession:
        """识别当前交易时段"""
        now = datetime.now()
        current_time = now.time()
        
        # 早盘突破：8:00-10:00
        if time(8, 0) <= current_time < time(10, 0):
            return TradingSession.MORNING_BREAKOUT
        
        # 午间震荡：14:00-16:00
        elif time(14, 0) <= current_time < time(16, 0):
            return TradingSession.NOON_OSCILLATION
        
        # 美盘联动：20:00-22:00
        elif time(20, 0) <= current_time < time(22, 0):
            return TradingSession.US_SESSION
        
        else:
            return TradingSession.OTHER
    
    # ==================== 技术指标计算方法 ====================
    
    def _calculate_ema(self, prices: np.ndarray, period: int) -> np.ndarray:
        """计算指数移动平均线（EMA）"""
        ema = np.zeros_like(prices, dtype=float)
        ema[0] = prices[0]
        multiplier = 2 / (period + 1)
        
        for i in range(1, len(prices)):
            ema[i] = (prices[i] - ema[i-1]) * multiplier + ema[i-1]
        
        return ema
    
    def _calculate_rsi(self, prices: np.ndarray, period: int = 14) -> np.ndarray:
        """计算相对强弱指标（RSI）"""
        deltas = np.diff(prices)
        seed = deltas[:period+1]
        up = seed[seed >= 0].sum() / period
        down = -seed[seed < 0].sum() / period
        
        rs = up / down if down != 0 else 0
        rsi = np.zeros_like(prices)
        rsi[:period] = 100. - 100. / (1. + rs)
        
        for i in range(period, len(prices)):
            delta = deltas[i-1]
            
            if delta > 0:
                upval = delta
                downval = 0.
            else:
                upval = 0.
                downval = -delta
            
            up = (up * (period - 1) + upval) / period
            down = (down * (period - 1) + downval) / period
            
            rs = up / down if down != 0 else 0
            rsi[i] = 100. - 100. / (1. + rs)
        
        return rsi
    
    def _calculate_bollinger_bands(self, prices: np.ndarray, period: int = 20, std_dev: float = 2) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """计算布林带"""
        # 计算中轨（SMA）
        middle_band = np.zeros_like(prices)
        for i in range(len(prices)):
            if i < period - 1:
                middle_band[i] = np.mean(prices[:i+1])
            else:
                middle_band[i] = np.mean(prices[i-period+1:i+1])
        
        # 计算标准差
        std = np.zeros_like(prices)
        for i in range(len(prices)):
            if i < period - 1:
                std[i] = np.std(prices[:i+1])
            else:
                std[i] = np.std(prices[i-period+1:i+1])
        
        # 计算上下轨
        upper_band = middle_band + (std * std_dev)
        lower_band = middle_band - (std * std_dev)
        
        return upper_band, middle_band, lower_band
    
    def _calculate_macd(self, prices: np.ndarray, fast: int = 12, slow: int = 26, signal: int = 9) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """计算MACD指标"""
        # 计算快速和慢速EMA
        ema_fast = self._calculate_ema(prices, fast)
        ema_slow = self._calculate_ema(prices, slow)
        
        # MACD线 = 快速EMA - 慢速EMA
        macd_line = ema_fast - ema_slow
        
        # 信号线 = MACD的EMA
        signal_line = self._calculate_ema(macd_line, signal)
        
        # 柱状图 = MACD线 - 信号线
        histogram = macd_line - signal_line
        
        return macd_line, signal_line, histogram
    
    def _calculate_atr(self, klines: List[Dict], period: int = 14) -> float:
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
    
    # ==================== 持仓和交易管理 ====================
    
    def update_position(self, signal: Dict[str, Any]):
        """更新持仓状态"""
        if signal["signal"] in ["buy", "sell"] and signal.get("type") not in ["stop_loss", "take_profit", "partial_close", "timeout", "accelerated_exit"]:
            # 开仓
            self.current_position = {
                "side": "long" if signal["signal"] == "buy" else "short",
                "entry_price": signal["price"],
                "amount": signal["amount"],
                "stop_loss": signal["stop_loss"],
                "take_profit": signal["take_profit"],
                "entry_time": datetime.now(),
                "partial_closed": False
            }
            logger.info(f"开仓: {self.current_position}")
            # 保存持仓到文件
            self.position_storage.save_position(self.current_position)
            logger.info("✓ 持仓信息已保存到文件")
        
        elif signal.get("type") in ["stop_loss", "take_profit", "timeout", "accelerated_exit"]:
            # 完全平仓
            if self.current_position:
                logger.info(f"平仓: {signal['type']}, PNL: {signal.get('pnl', 0):.2%}")
                self.current_position = None
                # 清空持仓文件
                self.position_storage.clear_position()
                logger.info("✓ 持仓信息已清空")
        
        elif signal.get("type") == "partial_close":
            # 部分平仓
            logger.info(f"部分平仓: {signal['amount']}, 剩余: {self.current_position['amount']}")
            # 更新持仓文件
            self.position_storage.save_position(self.current_position)
    
    def record_trade(self, signal: Dict[str, Any]):
        """记录交易"""
        trade = {
            "timestamp": datetime.now(),
            "signal": signal["signal"],
            "price": signal["price"],
            "amount": signal.get("amount", 0),
            "type": signal.get("type", "entry"),
            "pnl": signal.get("pnl", 0),
            "reason": signal.get("reason", "")
        }
        
        self.daily_trades.append(trade)
        
        # 更新每日盈亏
        if "pnl" in signal:
            pnl_amount = signal["pnl"] * signal["price"] * signal.get("amount", 0)
            self.daily_pnl += pnl_amount
            
            # 更新连续亏损
            if signal["pnl"] < 0:
                self.consecutive_losses += 1
            else:
                self.consecutive_losses = 0
        
        self.last_trade_time = datetime.now()
        
        logger.info(f"记录交易: {trade}")
    
    def reset_daily_stats(self):
        """重置每日统计"""
        logger.info(f"重置每日统计 - 今日盈亏: {self.daily_pnl:.2f}, 交易次数: {len(self.daily_trades)}")
        self.daily_trades.clear()
        self.daily_pnl = 0.0
        self.consecutive_losses = 0
    
    def update_capital(self, new_capital: float):
        """
        更新当前资金（用于复利计算）
        
        Args:
            new_capital: 回测引擎或实盘账户传入的最新资金总额
        """
        if not self.parameters.get("enable_compounding", False):
            return  # 未启用复利，无需更新
        
        old_capital = self.current_capital
        self.current_capital = new_capital
        
        # 记录资金变化（仅在显著变化时输出，避免日志过多）
        change_ratio = abs(new_capital - old_capital) / old_capital if old_capital > 0 else 0
        if change_ratio > 0.01:  # 变化超过1%才记录
            logger.info(f"💰 资金更新: {old_capital:.2f} → {new_capital:.2f} (变化: {new_capital - old_capital:+.2f}, {change_ratio:+.1%})")
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取策略统计信息"""
        winning_trades = sum(1 for t in self.daily_trades if t.get("pnl", 0) > 0)
        total_trades = len(self.daily_trades)
        win_rate = winning_trades / total_trades * 100 if total_trades > 0 else 0
        
        return {
            "daily_pnl": self.daily_pnl,
            "daily_trades": total_trades,
            "winning_trades": winning_trades,
            "losing_trades": total_trades - winning_trades,
            "win_rate": win_rate,
            "consecutive_losses": self.consecutive_losses,
            "current_position": self.current_position is not None,
            "position_info": self.current_position if self.current_position else None
        }
    
    # ==================== BaseStrategy 接口实现 ====================
    
    def on_tick(self, ticker: Dict) -> Dict[str, Any]:
        """处理实时行情tick"""
        # 高频策略主要基于K线分析，tick数据用于实时监控
        return {"signal": "hold", "reason": "等待K线更新"}
    
    def get_required_indicators(self) -> List[str]:
        """获取策略所需的技术指标"""
        return ["EMA8", "EMA21", "RSI14", "BB20", "MACD", "ATR14", "Volume"]
    
    def validate_parameters(self) -> bool:
        """验证参数有效性"""
        required = [
            "total_capital", "num_portions", "portion_size",
            "ema_fast", "ema_slow", "rsi_period",
            "stop_loss_min", "stop_loss_max",
            "take_profit_min", "take_profit_max"
        ]
        
        for key in required:
            if key not in self.parameters:
                logger.error(f"缺少必需参数: {key}")
                return False
        
        # 验证参数合理性
        if self.parameters["stop_loss_min"] >= self.parameters["stop_loss_max"]:
            logger.error("止损参数不合理")
            return False
        
        if self.parameters["take_profit_min"] >= self.parameters["take_profit_max"]:
            logger.error("止盈参数不合理")
            return False
        
        if self.parameters["leverage"] < 1 or self.parameters["leverage"] > 10:
            logger.error("杠杆倍数不合理")
            return False
        
        return True
