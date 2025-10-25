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
        default_params = {
            # 资金管理参数
            "total_capital": 300.0,  # 总资金（USDT）
            "num_portions": 6,  # 分仓数量
            "portion_size": 50.0,  # 每份资金
            "max_portions_per_trade": 2,  # 单次最大开仓份数
            "leverage": 3.0,  # 杠杆倍数（3-5倍）
            
            # EMA参数
            "ema_fast": 8,  # 快速EMA
            "ema_slow": 21,  # 慢速EMA
            
            # RSI参数
            "rsi_period": 14,  # RSI周期
            "rsi_long_threshold_low": 45,  # 做多RSI下限
            "rsi_short_threshold_high": 55,  # 做空RSI上限
            
            # 成交量参数
            "volume_lookback": 5,  # 成交量回看周期
            "volume_multiplier": 1.5,  # 成交量突增倍数
            
            # 布林带参数
            "bb_period": 20,  # 布林带周期
            "bb_std": 2,  # 布林带标准差
            
            # MACD参数
            "macd_fast": 12,
            "macd_slow": 26,
            "macd_signal": 9,
            
            # 止损止盈参数
            "stop_loss_min": 0.008,  # 最小止损0.8%
            "stop_loss_max": 0.012,  # 最大止损1.2%
            "take_profit_min": 0.015,  # 最小止盈1.5%
            "take_profit_max": 0.025,  # 最大止盈2.5%
            "profit_risk_ratio_min": 1.5,  # 最小盈亏比
            "profit_risk_ratio_max": 2.0,  # 最大盈亏比
            
            # 动态止盈参数
            "profit_level_1": 0.005,  # 盈利0.5%后移动止损至成本价
            "profit_level_2": 0.010,  # 盈利1%后移动止损至盈利0.5%
            "profit_level_3": 0.015,  # 盈利1.5%后分批平仓
            "partial_close_ratio": 0.5,  # 分批平仓比例
            
            # 风险控制参数
            "max_daily_profit": 0.05,  # 单日最大盈利5%
            "max_daily_loss": 0.08,  # 单日最大亏损8%
            "max_consecutive_losses": 2,  # 最大连续亏损次数
            "single_trade_max_loss": 0.02,  # 单笔最大亏损2%
            
            # 交易频率控制
            "max_trades_per_day": 8,  # 每日最大交易次数
            "min_trades_per_day": 3,  # 每日最小交易次数
            "ideal_holding_time_min": 15,  # 理想持仓时间（分钟）
            "ideal_holding_time_max": 45,  # 理想持仓时间（分钟）
            "max_holding_time": 120,  # 最大持仓时间（分钟）
            
            # 价格突破参数
            "breakout_lookback": 15,  # 突破回看周期（分钟）
            "breakout_confirmation": 0.001,  # 突破确认幅度0.1%
            
            # 特殊情况参数
            "avoid_news_minutes": 30,  # 重大数据发布前后避免交易时间
            "max_1min_volatility": 0.005,  # 1分钟最大波动0.5%
            "min_volume_threshold": 0.5,  # 最小成交量阈值（相对均值）
        }
        
        if parameters:
            default_params.update(parameters)
        
        super().__init__("高频短线交易策略", default_params)
        
        # 持仓信息
        self.current_position = None
        
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
        # 检查单日盈利是否达到目标
        if self.daily_pnl >= self.parameters["total_capital"] * self.parameters["max_daily_profit"]:
            return {
                "allowed": False,
                "reason": f"已达到单日盈利目标 {self.parameters['max_daily_profit']:.1%}，停止交易"
            }
        
        # 检查单日亏损是否超限
        if self.daily_pnl <= -self.parameters["total_capital"] * self.parameters["max_daily_loss"]:
            return {
                "allowed": False,
                "reason": f"已达到单日最大亏损 {self.parameters['max_daily_loss']:.1%}，停止交易"
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
        
        # 检查做多条件
        if all(long_conditions.values()):
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
        
        # 检查做空条件
        if all(short_conditions.values()):
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
                logger.info(f"盈利 {pnl_ratio:.2%}，移动止损到成本价 {entry_price:.2f}")
            elif side == "short" and stop_loss > entry_price:
                position["stop_loss"] = entry_price
                logger.info(f"盈利 {pnl_ratio:.2%}，移动止损到成本价 {entry_price:.2f}")
        
        if pnl_ratio >= self.parameters["profit_level_2"]:
            # 盈利1%后，移动止损到盈利0.5%
            profit_05_price = entry_price * (1 + self.parameters["profit_level_1"]) if side == "long" else entry_price * (1 - self.parameters["profit_level_1"])
            if side == "long" and stop_loss < profit_05_price:
                position["stop_loss"] = profit_05_price
                logger.info(f"盈利 {pnl_ratio:.2%}，移动止损到盈利0.5%位置 {profit_05_price:.2f}")
            elif side == "short" and stop_loss > profit_05_price:
                position["stop_loss"] = profit_05_price
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
        
        # 检查最大持仓时间
        if holding_time >= self.parameters["max_holding_time"]:
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
        """计算仓位大小"""
        # 单份资金
        portion_size = self.parameters["portion_size"]
        
        # 最大开仓份数
        max_portions = self.parameters["max_portions_per_trade"]
        
        # 总开仓资金
        position_value = portion_size * max_portions
        
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
        
        elif signal.get("type") in ["stop_loss", "take_profit", "timeout", "accelerated_exit"]:
            # 完全平仓
            if self.current_position:
                logger.info(f"平仓: {signal['type']}, PNL: {signal.get('pnl', 0):.2%}")
                self.current_position = None
        
        elif signal.get("type") == "partial_close":
            # 部分平仓
            logger.info(f"部分平仓: {signal['amount']}, 剩余: {self.current_position['amount']}")
    
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
