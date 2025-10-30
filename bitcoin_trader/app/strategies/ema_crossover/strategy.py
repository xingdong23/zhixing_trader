"""
多重EMA交叉趋势策略 - 基于8/13/48/200 EMA系统

核心思想：
1. 使用EMA 8/13/48/200构建多层趋势过滤系统
2. 8 EMA上穿13 EMA作为入场信号
3. 价格必须在200 EMA之上（大趋势过滤）
4. 动态出场：跌破关键EMA或近期低点

信号分类：
- 多头入场：8 EMA上穿13 EMA，且都在200 EMA之上
- 持仓管理：价格保持在8/13/48 EMA之上
- 出场信号：跌破13 EMA或48 EMA

适用场景：趋势市场、中长线交易
优势：顺势交易、过滤噪音、避免逆势
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
import logging

logger = logging.getLogger(__name__)


class EMACrossoverStrategy:
    """多重EMA交叉趋势策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典
        """
        
        self.name = "多重EMA交叉策略"
        self.parameters = parameters
        
        # 持仓信息
        self.current_position: Optional[Dict] = None
        
        # 统计信息
        self.daily_trades = []
        self.daily_pnl = 0.0
        self.consecutive_losses = 0
        self.total_trades = 0
        
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        分析市场并生成交易信号
        
        Args:
            klines: K线数据列表
            
        Returns:
            交易信号字典
        """
        if not klines or len(klines) < 250:
            return {"signal": "hold", "reason": "数据不足，需要至少250根K线"}
        
        # 检查风控
        if not self._check_risk_controls():
            return {"signal": "hold", "reason": "触发风控限制"}
        
        # 如果有持仓，检查出场条件
        if self.current_position:
            exit_signal = self._check_exit_conditions(klines)
            if exit_signal:
                return exit_signal
            return {"signal": "hold", "reason": "持仓中，等待出场信号"}
        
        # 无持仓，寻找入场机会
        return self._generate_entry_signal(klines)
    
    def _generate_entry_signal(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        生成入场信号
        
        核心逻辑：
        1. 计算EMA 8/13/48/200
        2. 检查8 EMA是否上穿13 EMA
        3. 确认价格在200 EMA之上
        4. 生成入场信号
        """
        closes = np.array([k["close"] for k in klines])
        highs = np.array([k["high"] for k in klines])
        lows = np.array([k["low"] for k in klines])
        
        # 计算各周期EMA
        ema8 = self._calculate_ema(closes, 8)
        ema13 = self._calculate_ema(closes, 13)
        ema48 = self._calculate_ema(closes, 48)
        ema200 = self._calculate_ema(closes, 200)
        
        current_price = closes[-1]
        
        # 检查EMA排列
        current_ema8 = ema8[-1]
        current_ema13 = ema13[-1]
        current_ema48 = ema48[-1]
        current_ema200 = ema200[-1]
        
        prev_ema8 = ema8[-2]
        prev_ema13 = ema13[-2]
        
        # 判断大趋势：价格必须在200 EMA之上
        if current_price < current_ema200:
            logger.info(f"价格{current_price:.2f}低于200EMA{current_ema200:.2f}，不符合大趋势")
            return {"signal": "hold", "reason": "价格低于200EMA，等待大趋势确认"}
        
        # 检查8 EMA上穿13 EMA（金叉）
        is_golden_cross = (prev_ema8 <= prev_ema13) and (current_ema8 > current_ema13)
        
        # 确认EMA多头排列（至少8和13在48之上）
        ema_alignment = current_ema8 > current_ema13 and current_ema13 > current_ema48
        
        if is_golden_cross or (ema_alignment and current_ema8 > current_ema13):
            # 计算近期低点作为止损
            lookback = int(self.parameters.get("stop_lookback", 20))
            recent_low = float(np.min(lows[-lookback:]))
            
            # 计算ATR用于仓位管理
            atr_val = self._calculate_atr(klines, 14)
            
            logger.info(f"✓ 入场信号：8EMA={current_ema8:.2f}, 13EMA={current_ema13:.2f}, 48EMA={current_ema48:.2f}, 200EMA={current_ema200:.2f}")
            logger.info(f"  价格={current_price:.2f}, 近期低点={recent_low:.2f}")
            
            return self._create_long_signal(
                current_price, 
                recent_low, 
                atr_val,
                current_ema8,
                current_ema13,
                current_ema48,
                is_golden_cross
            )
        
        return {"signal": "hold", "reason": f"等待8EMA上穿13EMA，当前8EMA={current_ema8:.2f}, 13EMA={current_ema13:.2f}"}
    
    def _create_long_signal(
        self, 
        price: float, 
        recent_low: float,
        atr: float,
        ema8: float,
        ema13: float,
        ema48: float,
        is_golden_cross: bool
    ) -> Dict[str, Any]:
        """创建做多信号"""
        capital = float(self.parameters.get("total_capital", 300.0))
        leverage = float(self.parameters.get("leverage", 2.0))
        risk_per_trade = float(self.parameters.get("risk_per_trade", 0.02))
        
        # 止损设置：近期低点 或 48 EMA下方
        stop_below_ema48 = ema48 * (1 - 0.005)  # 48 EMA下方0.5%
        stop_loss = min(recent_low, stop_below_ema48)
        
        # 确保止损不要太近
        min_stop_distance = price * 0.01  # 至少1%
        if price - stop_loss < min_stop_distance:
            stop_loss = price - min_stop_distance
        
        # 止盈设置：使用风险回报比
        risk_reward_ratio = float(self.parameters.get("risk_reward_ratio", 3.0))
        risk_amount = price - stop_loss
        take_profit = price + (risk_amount * risk_reward_ratio)
        
        # 计算仓位
        use_leverage_sizing = self.parameters.get("use_leverage_sizing", False)
        
        if use_leverage_sizing:
            # 激进模式：使用杠杆放大仓位
            position_ratio = float(self.parameters.get("position_ratio", 0.5))
            position_value = capital * leverage * position_ratio
            amount = position_value / price
        else:
            # 保守模式：基于风险计算仓位
            risk_capital = capital * risk_per_trade
            amount = risk_capital / risk_amount
        
        signal_type = "金叉入场" if is_golden_cross else "趋势入场"
        
        return {
            "signal": "buy",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": leverage,
            "atr": atr,
            "entry_ema8": ema8,
            "entry_ema13": ema13,
            "entry_ema48": ema48,
            "signal_type": signal_type,
            "reason": f"{signal_type} 8EMA={ema8:.2f} 13EMA={ema13:.2f} 止损={stop_loss:.2f}"
        }
    
    def _check_exit_conditions(self, klines: List[Dict]) -> Optional[Dict[str, Any]]:
        """
        检查出场条件
        
        出场逻辑：
        1. 固定止损止盈
        2. 价格跌破13 EMA（如果入场后）
        3. 价格跌破48 EMA（如果低于入场点）
        4. 价格跌破近期低点
        """
        if not self.current_position:
            return None
        
        position = self.current_position
        current_price = klines[-1]["close"]
        entry_price = position["entry_price"]
        stop_loss = position["stop_loss"]
        take_profit = position["take_profit"]
        
        # 计算EMA
        closes = np.array([k["close"] for k in klines])
        lows = np.array([k["low"] for k in klines])
        
        ema8 = self._calculate_ema(closes, 8)
        ema13 = self._calculate_ema(closes, 13)
        ema48 = self._calculate_ema(closes, 48)
        
        current_ema8 = ema8[-1]
        current_ema13 = ema13[-1]
        current_ema48 = ema48[-1]
        
        # 计算盈亏
        pnl_ratio = (current_price - entry_price) / entry_price
        
        # 1. 固定止损
        if current_price <= stop_loss:
            logger.info(f"触发固定止损: 价格={current_price:.2f}, 止损={stop_loss:.2f}")
            return self._create_exit_signal("stop_loss", current_price, pnl_ratio)
        
        # 2. 固定止盈
        if current_price >= take_profit:
            logger.info(f"触发止盈: 价格={current_price:.2f}, 止盈={take_profit:.2f}")
            return self._create_exit_signal("take_profit", current_price, pnl_ratio)
        
        # 3. 价格跌破13 EMA（如果已经盈利）
        if current_price < current_ema13:
            if pnl_ratio > 0.005:  # 盈利超过0.5%才用EMA出场
                logger.info(f"价格跌破13 EMA: 价格={current_price:.2f}, 13EMA={current_ema13:.2f}")
                return self._create_exit_signal("ema13_break", current_price, pnl_ratio)
        
        # 4. 价格跌破48 EMA（保护利润或限制亏损）
        if current_price < current_ema48:
            logger.info(f"价格跌破48 EMA: 价格={current_price:.2f}, 48EMA={current_ema48:.2f}")
            return self._create_exit_signal("ema48_break", current_price, pnl_ratio)
        
        # 5. 移动止盈：如果盈利超过一定比例，使用8 EMA作为追踪止损
        trailing_profit_threshold = self.parameters.get("trailing_profit_threshold", 0.03)
        if pnl_ratio > trailing_profit_threshold:
            if current_price < current_ema8:
                logger.info(f"移动止盈触发: 价格={current_price:.2f}, 8EMA={current_ema8:.2f}")
                return self._create_exit_signal("trailing_stop", current_price, pnl_ratio)
        
        return None
    
    def _create_exit_signal(self, exit_type: str, price: float, pnl_ratio: float) -> Dict[str, Any]:
        """创建出场信号"""
        return {
            "signal": "sell",
            "price": price,
            "amount": self.current_position["amount"],
            "type": exit_type,
            "pnl": pnl_ratio,
            "reason": f"出场 {exit_type} 盈亏={pnl_ratio:+.2%}"
        }
    
    def _check_risk_controls(self) -> bool:
        """检查风控条件"""
        # 检查日内亏损
        max_daily_loss = self.parameters.get("max_daily_loss", 0.05)
        capital = self.parameters.get("total_capital", 300.0)
        
        if self.daily_pnl < -capital * max_daily_loss:
            logger.warning(f"触发日内亏损限制: {self.daily_pnl:.2f}")
            return False
        
        # 检查连续亏损
        max_consecutive_losses = self.parameters.get("max_consecutive_losses", 3)
        if self.consecutive_losses >= max_consecutive_losses:
            logger.warning(f"连续亏损{self.consecutive_losses}次，暂停交易")
            return False
        
        return True
    
    def _calculate_ema(self, data: np.ndarray, period: int) -> np.ndarray:
        """计算EMA（指数移动平均）"""
        if len(data) == 0:
            return np.array([])
        alpha = 2.0 / (period + 1.0)
        ema = np.zeros(len(data), dtype=float)
        ema[0] = float(data[0])
        for i in range(1, len(data)):
            ema[i] = alpha * float(data[i]) + (1.0 - alpha) * ema[i - 1]
        return ema
    
    def _calculate_atr(self, klines: List[Dict], period: int = 14) -> float:
        """计算ATR（平均真实波幅）"""
        if len(klines) < period + 1:
            return 0.0
        
        highs = np.array([k["high"] for k in klines], dtype=float)
        lows = np.array([k["low"] for k in klines], dtype=float)
        closes = np.array([k["close"] for k in klines], dtype=float)
        
        tr = np.maximum(
            highs[1:] - lows[1:],
            np.maximum(
                np.abs(highs[1:] - closes[:-1]),
                np.abs(lows[1:] - closes[:-1])
            )
        )
        
        if len(tr) < period:
            return float(np.mean(tr)) if len(tr) > 0 else 0.0
        
        atr_prev = float(np.sum(tr[:period]) / period)
        for i in range(period, len(tr)):
            atr_prev = (atr_prev * (period - 1) + tr[i]) / period
        
        return float(atr_prev)
    
    def update_position(self, signal: Dict[str, Any]):
        """更新持仓状态"""
        if signal["signal"] == "buy" and signal.get("type") not in ["stop_loss", "take_profit", "ema13_break", "ema48_break", "trailing_stop"]:
            # 开仓
            self.current_position = {
                "side": "long",
                "entry_price": signal["price"],
                "amount": signal["amount"],
                "stop_loss": signal["stop_loss"],
                "take_profit": signal["take_profit"],
                "entry_time": datetime.now(),
                "signal_type": signal.get("signal_type", "趋势入场"),
                "entry_ema8": signal.get("entry_ema8"),
                "entry_ema13": signal.get("entry_ema13"),
                "entry_ema48": signal.get("entry_ema48")
            }
            logger.info(f"✓ 开仓: {signal['price']:.2f}, 类型={self.current_position['signal_type']}")
        
        elif signal.get("type") in ["stop_loss", "take_profit", "ema13_break", "ema48_break", "trailing_stop"]:
            # 平仓
            if self.current_position:
                logger.info(f"✓ 平仓: {signal.get('type')}, PNL={signal.get('pnl', 0):.2%}")
                self.current_position = None
    
    def record_trade(self, signal: Dict[str, Any]):
        """记录交易"""
        trade = {
            "timestamp": datetime.now(),
            "signal": signal["signal"],
            "price": signal["price"],
            "amount": signal.get("amount", 0),
            "type": signal.get("type", "entry"),
            "pnl": signal.get("pnl", 0)
        }
        
        self.daily_trades.append(trade)
        
        # 更新盈亏和连续亏损
        if "pnl" in signal and signal.get("type") in ["stop_loss", "take_profit", "ema13_break", "ema48_break", "trailing_stop"]:
            pnl_amount = signal["pnl"] * signal["price"] * signal.get("amount", 0)
            self.daily_pnl += pnl_amount
            self.total_trades += 1
            
            if signal["pnl"] < 0:
                self.consecutive_losses += 1
            else:
                self.consecutive_losses = 0
    
    def reset_daily_stats(self):
        """重置每日统计"""
        logger.info(f"EMA交叉策略日统计 - 盈亏: {self.daily_pnl:.2f}, 交易: {len(self.daily_trades)}, 连续亏损: {self.consecutive_losses}")
        self.daily_trades.clear()
        self.daily_pnl = 0.0
        self.consecutive_losses = 0
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取策略统计信息"""
        return {
            "total_trades": self.total_trades,
            "daily_pnl": self.daily_pnl,
            "consecutive_losses": self.consecutive_losses,
            "has_position": self.current_position is not None,
            "position_info": self.current_position if self.current_position else None
        }

