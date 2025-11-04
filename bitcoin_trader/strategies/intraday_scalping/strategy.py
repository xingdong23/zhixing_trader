"""
日内剥头皮交易策略

策略逻辑：
1. EMA9/21判断短期趋势
2. 布林带识别超买超卖
3. RSI辅助确认
4. 成交量放量确认
5. 严格止损止盈，快进快出

目标：每日收益5-10 USDT（1.7%-3.3%）
"""

import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class IntradayScalpingStrategy:
    """日内剥头皮策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典
        """
        self.name = "日内剥头皮策略"
        self.parameters = parameters
        self.position = None
        self.current_position = None  # 兼容回测引擎
        self.capital = float(parameters.get('total_capital', 300.0))
        
        # 指标参数
        self.ema9_period = int(parameters.get('ema9_period', 9))
        self.ema21_period = int(parameters.get('ema21_period', 21))
        self.bb_period = int(parameters.get('bb_period', 20))
        self.bb_std = float(parameters.get('bb_std', 2.0))
        self.rsi_period = int(parameters.get('rsi_period', 14))
        self.atr_period = int(parameters.get('atr_period', 14))
        self.volume_ma_period = int(parameters.get('volume_ma_period', 20))
        
        # 风险管理参数
        self.risk_per_trade = float(parameters.get('risk_per_trade', 0.02))  # 2%
        self.max_daily_loss = float(parameters.get('max_daily_loss', 0.06))  # 6%
        self.max_trades_per_day = int(parameters.get('max_trades_per_day', 5))
        self.target_daily_profit = float(parameters.get('target_daily_profit', 10.0))  # USDT
        
        # 止盈止损参数
        self.stop_loss_atr = float(parameters.get('stop_loss_atr', 1.5))
        self.take_profit_1_ratio = float(parameters.get('take_profit_1_ratio', 0.015))  # 1.5%
        self.take_profit_2_ratio = float(parameters.get('take_profit_2_ratio', 0.03))   # 3%
        self.max_holding_minutes = int(parameters.get('max_holding_minutes', 240))  # 4小时
        
        # 入场过滤参数
        self.rsi_oversold = float(parameters.get('rsi_oversold', 40))
        self.rsi_overbought = float(parameters.get('rsi_overbought', 60))
        self.volume_multiplier = float(parameters.get('volume_multiplier', 1.2))
        
        # 交易时间限制
        self.trading_start_hour = int(parameters.get('trading_start_hour', 6))
        self.trading_end_hour = int(parameters.get('trading_end_hour', 22))
        
        # 状态跟踪
        self.daily_pnl = 0.0
        self.daily_trades = 0
        self.consecutive_losses = 0
        self.current_date = None
        self.partial_exit_done = False  # 是否已执行部分止盈
    
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        分析K线数据并生成交易信号
        
        Args:
            klines: K线数据列表
            
        Returns:
            交易信号字典
        """
        if len(klines) < max(self.bb_period, self.ema21_period, self.rsi_period) + 10:
            return {"signal": "hold", "reason": "数据不足"}
        
        # 提取数据
        closes = np.array([float(k['close']) for k in klines])
        highs = np.array([float(k['high']) for k in klines])
        lows = np.array([float(k['low']) for k in klines])
        opens = np.array([float(k['open']) for k in klines])
        volumes = np.array([float(k.get('volume', k.get('vol', 0))) for k in klines])
        timestamps = [k.get('open_time', k.get('timestamp', 0)) for k in klines]
        
        current_price = closes[-1]
        # 处理时间戳（可能是毫秒或已经是datetime对象）
        if isinstance(timestamps[-1], datetime):
            current_time = timestamps[-1]
        else:
            current_time = datetime.fromtimestamp(timestamps[-1] / 1000)
        
        # 重置每日统计
        self._reset_daily_stats(current_time)
        
        # 计算指标
        ema9 = self._calculate_ema(closes, self.ema9_period)
        ema21 = self._calculate_ema(closes, self.ema21_period)
        bb_upper, bb_middle, bb_lower = self._calculate_bollinger_bands(closes, self.bb_period, self.bb_std)
        rsi = self._calculate_rsi(closes, self.rsi_period)
        atr = self._calculate_atr(klines, self.atr_period)
        volume_ma = self._calculate_sma(volumes, self.volume_ma_period)
        
        # 检查是否有持仓
        if self.position:
            exit_signal = self._check_exit_conditions(
                klines, current_price, current_time, 
                bb_upper, bb_middle, bb_lower, atr
            )
            if exit_signal:
                return exit_signal
            return {"signal": "hold", "reason": "持仓中"}
        
        # 检查交易限制
        if self._should_stop_trading(current_time):
            return {"signal": "hold", "reason": self._get_stop_reason()}
        
        # 生成入场信号
        return self._generate_entry_signal(
            klines, current_price, current_time,
            ema9, ema21, bb_upper, bb_middle, bb_lower,
            rsi, atr, volumes, volume_ma
        )
    
    def _reset_daily_stats(self, current_time: datetime):
        """重置每日统计"""
        current_date = current_time.date()
        if self.current_date != current_date:
            self.current_date = current_date
            self.daily_pnl = 0.0
            self.daily_trades = 0
            self.consecutive_losses = 0
            logger.info(f"新的一天开始: {current_date}")
    
    def _should_stop_trading(self, current_time: datetime) -> bool:
        """检查是否应该停止交易"""
        # 时间限制
        current_hour = current_time.hour
        if current_hour < self.trading_start_hour or current_hour >= self.trading_end_hour:
            return True
        
        # 达到日收益目标
        if self.daily_pnl >= self.target_daily_profit:
            return True
        
        # 达到日最大亏损
        if self.daily_pnl <= -self.max_daily_loss * self.capital:
            return True
        
        # 达到日最大交易次数
        if self.daily_trades >= self.max_trades_per_day:
            return True
        
        # 连续亏损保护
        if self.consecutive_losses >= 3:
            return True
        
        return False
    
    def _get_stop_reason(self) -> str:
        """获取停止交易原因"""
        current_time = datetime.now()
        current_hour = current_time.hour
        
        if current_hour < self.trading_start_hour or current_hour >= self.trading_end_hour:
            return f"非交易时段({current_hour}点)"
        if self.daily_pnl >= self.target_daily_profit:
            return f"达到日收益目标({self.daily_pnl:.2f}U)"
        if self.daily_pnl <= -self.max_daily_loss * self.capital:
            return f"达到日最大亏损({self.daily_pnl:.2f}U)"
        if self.daily_trades >= self.max_trades_per_day:
            return f"达到日最大交易次数({self.daily_trades}笔)"
        if self.consecutive_losses >= 3:
            return f"连续亏损{self.consecutive_losses}笔"
        return "未知原因"
    
    def _generate_entry_signal(
        self, klines, current_price, current_time,
        ema9, ema21, bb_upper, bb_middle, bb_lower,
        rsi, atr, volumes, volume_ma
    ) -> Dict[str, Any]:
        """生成入场信号"""
        
        # 当前K线和前一根K线
        current_open = float(klines[-1]['open'])
        current_close = float(klines[-1]['close'])
        current_high = float(klines[-1]['high'])
        current_low = float(klines[-1]['low'])
        current_volume = volumes[-1]
        
        # K线形态判断（简化）
        is_bullish_candle = current_close > current_open  # 只要是阳线
        is_bearish_candle = current_close < current_open  # 只要是阴线
        
        # 做多信号（极度放宽）
        # 价格在布林带下半部分且出现阳线
        long_oversold = current_price <= bb_middle[-1]  # 在中轨下方
        
        if long_oversold and is_bullish_candle and rsi[-1] < 50:  # RSI<50确认超卖
            logger.info(f"✓ 做多信号: 价格={current_price:.2f}, RSI={rsi[-1]:.1f}, 布林中轨={bb_middle[-1]:.2f}")
            return self._create_long_signal(current_price, atr, bb_middle[-1])
        
        # 做空信号（极度放宽）
        # 价格在布林带上半部分且出现阴线
        short_overbought = current_price >= bb_middle[-1]  # 在中轨上方
        
        if short_overbought and is_bearish_candle and rsi[-1] > 50:  # RSI>50确认超买
            logger.info(f"✓ 做空信号: 价格={current_price:.2f}, RSI={rsi[-1]:.1f}, 布林中轨={bb_middle[-1]:.2f}")
            return self._create_short_signal(current_price, atr, bb_middle[-1])
        
        return {"signal": "hold", "reason": "无入场信号"}
    
    def _create_long_signal(self, price: float, atr: float, bb_middle: float) -> Dict[str, Any]:
        """创建做多信号"""
        # 计算止损
        stop_loss = price - (atr * self.stop_loss_atr)
        stop_distance = price - stop_loss
        
        # 风险等额仓位计算
        risk_amount = self.capital * self.risk_per_trade
        leverage = float(self.parameters.get('leverage', 2.0))
        amount = risk_amount / stop_distance
        
        # 第一目标止盈
        take_profit_1 = price * (1 + self.take_profit_1_ratio)
        # 第二目标止盈（布林带中轨或固定比例）
        take_profit_2 = max(bb_middle, price * (1 + self.take_profit_2_ratio))
        
        return {
            "signal": "buy",
            "side": "long",  # 添加side字段
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit_2,
            "take_profit_1": take_profit_1,  # 第一目标
            "leverage": leverage,
            "atr": atr,
            "reason": f"布林下轨反弹做多 止损={stop_loss:.2f} 目标1={take_profit_1:.2f} 目标2={take_profit_2:.2f}"
        }
    
    def _create_short_signal(self, price: float, atr: float, bb_middle: float) -> Dict[str, Any]:
        """创建做空信号"""
        # 计算止损
        stop_loss = price + (atr * self.stop_loss_atr)
        stop_distance = stop_loss - price
        
        # 风险等额仓位计算
        risk_amount = self.capital * self.risk_per_trade
        leverage = float(self.parameters.get('leverage', 2.0))
        amount = risk_amount / stop_distance
        
        # 第一目标止盈
        take_profit_1 = price * (1 - self.take_profit_1_ratio)
        # 第二目标止盈
        take_profit_2 = min(bb_middle, price * (1 - self.take_profit_2_ratio))
        
        return {
            "signal": "sell",
            "side": "short",  # 添加side字段
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit_2,
            "take_profit_1": take_profit_1,
            "leverage": leverage,
            "atr": atr,
            "reason": f"布林上轨回落做空 止损={stop_loss:.2f} 目标1={take_profit_1:.2f} 目标2={take_profit_2:.2f}"
        }
    
    def _check_exit_conditions(
        self, klines, current_price, current_time,
        bb_upper, bb_middle, bb_lower, atr
    ) -> Optional[Dict[str, Any]]:
        """检查出场条件"""
        if not self.position:
            return None
        
        side = self.position.get('side', 'long')
        entry_price = self.position.get('entry_price', current_price)
        entry_time = self.position.get('entry_time', current_time)
        stop_loss = self.position.get('stop_loss', 0)
        take_profit_1 = self.position.get('take_profit_1', 0)
        take_profit_2 = self.position.get('take_profit', 0)
        amount = self.position.get('amount', 0)
        
        # 计算盈亏
        if side == "long":
            pnl_ratio = (current_price - entry_price) / entry_price
        else:
            pnl_ratio = (entry_price - current_price) / entry_price
        
        # 持仓时间
        holding_minutes = (current_time - entry_time).total_seconds() / 60
        
        # 止损
        if side == "long" and current_price <= stop_loss:
            return self._create_exit_signal("stop_loss", current_price, pnl_ratio, amount)
        if side == "short" and current_price >= stop_loss:
            return self._create_exit_signal("stop_loss", current_price, pnl_ratio, amount)
        
        # 第一目标止盈（50%仓位）
        if not self.partial_exit_done:
            if side == "long" and current_price >= take_profit_1:
                self.partial_exit_done = True
                return self._create_exit_signal("take_profit_1", current_price, pnl_ratio, amount * 0.5)
            if side == "short" and current_price <= take_profit_1:
                self.partial_exit_done = True
                return self._create_exit_signal("take_profit_1", current_price, pnl_ratio, amount * 0.5)
        
        # 第二目标止盈（剩余仓位）
        if side == "long" and current_price >= take_profit_2:
            return self._create_exit_signal("take_profit_2", current_price, pnl_ratio, amount)
        if side == "short" and current_price <= take_profit_2:
            return self._create_exit_signal("take_profit_2", current_price, pnl_ratio, amount)
        
        # 布林带反向突破止盈
        if side == "long" and current_price >= bb_upper[-1]:
            return self._create_exit_signal("bb_exit", current_price, pnl_ratio, amount)
        if side == "short" and current_price <= bb_lower[-1]:
            return self._create_exit_signal("bb_exit", current_price, pnl_ratio, amount)
        
        # 时间止损
        if holding_minutes > self.max_holding_minutes:
            return self._create_exit_signal("time_stop", current_price, pnl_ratio, amount)
        
        # 保护性止损：盈利达到1R后移动止损到成本价
        if pnl_ratio >= self.take_profit_1_ratio * 0.67:  # 约1R
            if side == "long" and current_price < entry_price:
                return self._create_exit_signal("breakeven_stop", current_price, pnl_ratio, amount)
            if side == "short" and current_price > entry_price:
                return self._create_exit_signal("breakeven_stop", current_price, pnl_ratio, amount)
        
        return None
    
    def _create_exit_signal(self, exit_type: str, price: float, pnl_ratio: float, amount: float) -> Dict[str, Any]:
        """创建出场信号"""
        return {
            "signal": "close",
            "price": price,
            "amount": amount,
            "exit_type": exit_type,
            "pnl_ratio": pnl_ratio,
            "reason": f"{exit_type} 盈亏={pnl_ratio*100:.2f}%"
        }
    
    def update_position(self, position: Optional[Dict[str, Any]]):
        """更新持仓信息"""
        self.position = position
        self.current_position = position  # 同步更新
        if position is None:
            self.partial_exit_done = False
    
    def update_capital(self, capital: float):
        """更新资金"""
        self.capital = capital
    
    def on_trade_closed(self, pnl: float):
        """交易关闭回调"""
        self.daily_pnl += pnl
        self.daily_trades += 1
        
        if pnl < 0:
            self.consecutive_losses += 1
        else:
            self.consecutive_losses = 0
        
        logger.info(f"交易关闭: 盈亏={pnl:.2f}U, 日盈亏={self.daily_pnl:.2f}U, 日交易={self.daily_trades}笔")
    
    def record_trade(self, signal: Dict[str, Any]):
        """记录交易（兼容回测引擎）"""
        pass  # 可以在这里添加交易记录逻辑
    
    # ========== 指标计算方法 ==========
    
    def _calculate_ema(self, data: np.ndarray, period: int) -> np.ndarray:
        """计算EMA"""
        if len(data) < period:
            return np.array([data[-1]] * len(data))
        
        alpha = 2 / (period + 1)
        ema = np.zeros(len(data))
        ema[0] = data[0]
        
        for i in range(1, len(data)):
            ema[i] = alpha * data[i] + (1 - alpha) * ema[i-1]
        
        return ema
    
    def _calculate_sma(self, data: np.ndarray, period: int) -> np.ndarray:
        """计算SMA"""
        if len(data) < period:
            return np.array([np.mean(data)] * len(data))
        
        sma = np.zeros(len(data))
        sma[:period-1] = np.mean(data[:period])
        
        for i in range(period-1, len(data)):
            sma[i] = np.mean(data[i-period+1:i+1])
        
        return sma
    
    def _calculate_bollinger_bands(self, data: np.ndarray, period: int, std_dev: float):
        """计算布林带"""
        if len(data) < period:
            middle = np.array([np.mean(data)] * len(data))
            std = np.std(data)
            upper = middle + std_dev * std
            lower = middle - std_dev * std
            return upper, middle, lower
        
        middle = self._calculate_sma(data, period)
        
        std = np.zeros(len(data))
        for i in range(period-1, len(data)):
            std[i] = np.std(data[i-period+1:i+1])
        std[:period-1] = std[period-1]
        
        upper = middle + std_dev * std
        lower = middle - std_dev * std
        
        return upper, middle, lower
    
    def _calculate_rsi(self, closes: np.ndarray, period: int = 14) -> np.ndarray:
        """计算RSI（Wilder平滑）"""
        if len(closes) < period + 1:
            return np.array([50.0] * len(closes))
        
        deltas = np.diff(closes)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        
        avg_gain = np.zeros(len(closes))
        avg_loss = np.zeros(len(closes))
        
        avg_gain[period] = np.mean(gains[:period])
        avg_loss[period] = np.mean(losses[:period])
        
        for i in range(period + 1, len(closes)):
            avg_gain[i] = (avg_gain[i-1] * (period - 1) + gains[i-1]) / period
            avg_loss[i] = (avg_loss[i-1] * (period - 1) + losses[i-1]) / period
        
        rsi = np.zeros(len(closes))
        rsi[:period] = 50.0
        
        for i in range(period, len(closes)):
            if avg_loss[i] == 0:
                rsi[i] = 100.0
            else:
                rs = avg_gain[i] / avg_loss[i]
                rsi[i] = 100.0 - (100.0 / (1.0 + rs))
        
        return rsi
    
    def _calculate_atr(self, klines: List[Dict], period: int = 14) -> float:
        """计算ATR（Wilder平滑）"""
        if len(klines) < period + 1:
            return 0.0
        
        highs = np.array([float(k['high']) for k in klines])
        lows = np.array([float(k['low']) for k in klines])
        closes = np.array([float(k['close']) for k in klines])
        
        tr = np.maximum(
            highs[1:] - lows[1:],
            np.maximum(
                np.abs(highs[1:] - closes[:-1]),
                np.abs(lows[1:] - closes[:-1])
            )
        )
        
        atr = np.zeros(len(tr))
        atr[period-1] = np.mean(tr[:period])
        
        for i in range(period, len(tr)):
            atr[i] = (atr[i-1] * (period - 1) + tr[i]) / period
        
        return float(atr[-1]) if len(atr) > 0 else 0.0
