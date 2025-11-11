"""
EMA简单趋势策略 - 多时间框架版本 (Multi-Timeframe)

核心逻辑：
- 日线EMA21判断大趋势方向
- 1小时EMA5/13/21寻找入场时机
- 日线在EMA21上方 → 只做多
- 日线在EMA21下方 → 只做空

顺应大趋势，提高胜率
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
import pandas as pd
import logging
import os

logger = logging.getLogger(__name__)


class EMASimpleTrendMultiframeStrategy:
    """EMA简单趋势策略 - 多时间框架版本"""
    
    def __init__(self, parameters: Dict[str, Any], load_daily_from_file: bool = True):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典
            load_daily_from_file: 是否从文件加载日线数据（回测时True，实盘时False）
        """
        self.name = "EMA简单趋势策略-多时间框架"
        self.parameters = parameters
        
        # 资金管理与风险控制
        self.capital = float(parameters.get('total_capital', 300.0))
        # 单笔基础仓位占用（相对当前权益），后续可叠加波动和信号质量调整
        self.position_size = float(parameters.get('position_size', 0.5))
        self.max_risk_per_trade = float(parameters.get('max_risk_per_trade', 0.02))  # 单笔最大风险占比（基于权益）
        self.max_daily_drawdown = float(parameters.get('max_daily_drawdown', 0.08))  # 单日最大回撤（占权益），用于限制加杠
        
        self.base_leverage = float(parameters.get('leverage', 1.0))  # 基础杠杆
        self.leverage = self.base_leverage  # 当前杠杆（动态调整）
        
        # 动态杠杆管理（阶梯式）
        self.use_dynamic_leverage = parameters.get('use_dynamic_leverage', False)
        self.leverage_increase_step = float(parameters.get('leverage_increase_step', 0.3))  # 盈利后增加
        self.leverage_decrease_step = float(parameters.get('leverage_decrease_step', 0.5))  # 亏损后减少
        self.min_leverage = float(parameters.get('min_leverage', 1.0))  # 最小杠杆
        self.max_leverage = float(parameters.get('max_leverage', 5.0))  # 最大杠杆
        self.leverage_after_drawdown = float(parameters.get('leverage_after_drawdown', 1.0))  # 触发日回撤后强制降杠
        self.last_trade_profit = None  # 上一笔交易盈亏
        self.daily_pnl = 0.0  # 当日盈亏（回测引擎侧如有日期信息可对接）
        
        # 仓位动态调整开关（基于波动等）
        self.use_volatility_position_sizing = parameters.get('use_volatility_position_sizing', True)
        self.atr_period = int(parameters.get('atr_period', 14))
        self.min_position_size = float(parameters.get('min_position_size', 0.1))
        self.max_position_size = float(parameters.get('max_position_size', 1.0))
        
        # EMA参数（1小时）
        self.ema_fast = int(parameters.get('ema_fast', 5))
        self.ema_medium = int(parameters.get('ema_medium', 13))
        self.ema_slow = int(parameters.get('ema_slow', 21))
        
        # 日线EMA参数
        self.use_daily_trend_filter = parameters.get('use_daily_trend_filter', True)
        self.daily_ema_period = int(parameters.get('daily_ema_period', 21))
        self.daily_data_file = parameters.get('daily_data_file', 'data/ETHUSDT-1d-from1h.csv')
        
        # 止盈止损
        self.stop_loss_pct = float(parameters.get('stop_loss_pct', 0.032))
        self.take_profit_pct = float(parameters.get('take_profit_pct', 0.16))
        self.partial_take_profit_pct = float(parameters.get('partial_take_profit_pct', 0.07))
        
        # 移动止损
        self.use_trailing_stop = parameters.get('use_trailing_stop', True)
        self.trailing_stop_activation = float(parameters.get('trailing_stop_activation', 0.045))
        self.trailing_stop_distance = float(parameters.get('trailing_stop_distance', 0.027))
        
        # 移动止盈
        self.use_trailing_take_profit = parameters.get('use_trailing_take_profit', True)
        self.trailing_take_profit_activation = float(parameters.get('trailing_take_profit_activation', 0.055))
        self.trailing_take_profit_distance = float(parameters.get('trailing_take_profit_distance', 0.022))
        
        # 波动自适应止损（基于ATR，优先级高于固定百分比）
        self.use_atr_stop = parameters.get('use_atr_stop', True)
        self.atr_stop_multiplier = float(parameters.get('atr_stop_multiplier', 2.5))
        self.atr_tp_multiplier = float(parameters.get('atr_tp_multiplier', 5.0))
        
        # 其他过滤器
        self.volume_confirmation = parameters.get('volume_confirmation', False)
        self.volume_multiplier = float(parameters.get('volume_multiplier', 1.05))
        # 趋势强度过滤：基于EMA斜率和EMA间距
        self.trend_strength_filter = parameters.get('trend_strength_filter', True)
        self.ema_slope_threshold = float(parameters.get('ema_slope_threshold', 0.00005))
        self.ema_band_distance_min = float(parameters.get('ema_band_distance_min', 0.001))  # EMA间距比例下限
        self.use_ema_exit = parameters.get('use_ema_exit', False)
        
        # 是否允许做空（策略支持，但默认仍偏多头过滤）
        self.allow_short = parameters.get('allow_short', False)
        
        # 入场质量控制
        self.min_rr_ratio = float(parameters.get('min_rr_ratio', 2.0))  # 最小盈亏比要求
        self.reentry_cooldown = int(parameters.get('reentry_cooldown', 0))  # 平仓后冷却bar数，0为关闭
        self.last_exit_index = None
        
        # 状态变量
        self.current_position: Optional[Dict] = None
        self.entry_price = None
        self.total_trades = 0
        self.winning_trades = 0
        self.partial_closed = False
        self.trailing_stop_price = None
        self.trailing_take_profit_price = None
        self.highest_price = None
        
        # 加载日线数据（回测时从文件加载，实盘时通过update_daily_data更新）
        self.daily_data = None
        if self.use_daily_trend_filter and load_daily_from_file:
            self._load_daily_data()
        
        logger.info(f"✓ {self.name}初始化完成")
        logger.info(f"  资金: {self.capital} USDT")
        logger.info(f"  仓位: {self.position_size * 100}%")
        if self.use_dynamic_leverage:
            logger.info(f"  杠杆: {self.leverage}x (动态调整: {self.min_leverage}-{self.max_leverage}x)")
            logger.info(f"  杠杆调整: 盈利+{self.leverage_increase_step}x, 亏损-{self.leverage_decrease_step}x")
        else:
            logger.info(f"  杠杆: {self.leverage}x (固定)")
        logger.info(f"  1小时EMA: {self.ema_fast}/{self.ema_medium}/{self.ema_slow}")
        logger.info(f"  日线趋势过滤: {self.use_daily_trend_filter}")
        if self.use_daily_trend_filter:
            logger.info(f"  日线EMA周期: {self.daily_ema_period}")
            if load_daily_from_file:
                logger.info(f"  日线数据: {len(self.daily_data) if self.daily_data is not None else 0} 条 (从文件)")
            else:
                logger.info(f"  日线数据: 将从交易所实时获取")
        logger.info(f"  允许做空: {self.allow_short}")
    
    def _load_daily_data(self):
        """加载日线数据"""
        try:
            # 尝试多个可能的路径
            possible_paths = [
                self.daily_data_file,
                os.path.join('..', '..', '..', self.daily_data_file),
                os.path.join(os.getcwd(), self.daily_data_file)
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    df = pd.read_csv(path)
                    df['datetime'] = pd.to_datetime(df['open_time'], unit='ms')
                    df['date'] = df['datetime'].dt.date
                    
                    # 计算日线EMA21
                    df['ema21'] = self._calculate_ema(df['close'].values, self.daily_ema_period)
                    
                    # 判断趋势
                    df['trend'] = np.where(df['close'] > df['ema21'], 'BULLISH', 'BEARISH')
                    
                    self.daily_data = df
                    logger.info(f"✓ 日线数据加载成功: {path}")
                    logger.info(f"  数据范围: {df['datetime'].min()} 至 {df['datetime'].max()}")
                    return
            
            logger.warning(f"⚠ 未找到日线数据文件，将禁用日线趋势过滤")
            self.use_daily_trend_filter = False
            
        except Exception as e:
            logger.error(f"✗ 加载日线数据失败: {e}")
            self.use_daily_trend_filter = False
    
    def update_daily_data(self, daily_klines: List[Dict]):
        """
        更新日线数据（用于实盘）
        
        Args:
            daily_klines: 日线K线数据列表
        """
        if not daily_klines:
            return
        
        try:
            df = pd.DataFrame(daily_klines)
            
            # 确保有必要的字段
            if 'close' not in df.columns:
                logger.error("日线数据缺少close字段")
                return
            
            # 转换时间
            if 'datetime' in df.columns:
                df['datetime'] = pd.to_datetime(df['datetime'])
                df['date'] = df['datetime'].dt.date
            elif 'timestamp' in df.columns:
                df['datetime'] = pd.to_datetime(df['timestamp'], unit='ms')
                df['date'] = df['datetime'].dt.date
            
            # 计算日线EMA21
            df['ema21'] = self._calculate_ema(df['close'].values, self.daily_ema_period)
            
            # 判断趋势
            df['trend'] = np.where(df['close'] > df['ema21'], 'BULLISH', 'BEARISH')
            
            self.daily_data = df
            logger.info(f"✓ 日线数据已更新: {len(df)}条")
            
        except Exception as e:
            logger.error(f"✗ 更新日线数据失败: {e}")
    
    def _get_daily_trend(self, current_time: datetime) -> Optional[str]:
        """
        获取当前时间对应的日线趋势
        
        Returns:
            'BULLISH' - 牛市（日线在EMA21上方）
            'BEARISH' - 熊市（日线在EMA21下方）
            None - 无数据
        """
        if not self.use_daily_trend_filter or self.daily_data is None:
            return None
        
        # 转换为date类型
        current_date = current_time.date() if isinstance(current_time, datetime) else current_time
        
        # 查找对应的日线数据
        daily_row = self.daily_data[self.daily_data['date'] == current_date]
        
        if len(daily_row) > 0:
            trend = daily_row.iloc[0]['trend']
            return trend
        else:
            # 如果找不到当天数据，使用最近的一条
            daily_row = self.daily_data[self.daily_data['date'] <= current_date]
            if len(daily_row) > 0:
                trend = daily_row.iloc[-1]['trend']
                return trend
        
        return None
    
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """分析市场并生成交易信号"""
        
        # 需要足够的数据来计算EMA
        if len(klines) < self.ema_slow + 5:
            return {"signal": "hold", "reason": "数据不足"}
        
        current_price = klines[-1]['close']
        current_time = klines[-1]['timestamp']
        if not isinstance(current_time, datetime):
            current_time = datetime.fromtimestamp(current_time / 1000)
        
        # 获取日线趋势
        daily_trend = self._get_daily_trend(current_time)
        
        # 如果有持仓，检查止盈止损
        if self.current_position:
            exit_signal = self._check_exit_conditions(current_price, klines, daily_trend)
            if exit_signal:
                return exit_signal
            return {"signal": "hold", "reason": "持仓中"}
        
        # 如果没有持仓，寻找入场机会
        entry_signal = self._check_entry_conditions(current_price, klines, daily_trend)
        if entry_signal:
            return entry_signal
        
        reason = "等待信号"
        if daily_trend:
            reason = f"等待信号 (日线趋势: {daily_trend})"
        
        return {"signal": "hold", "reason": reason}
    
    def _calculate_ema(self, data: np.ndarray, period: int) -> np.ndarray:
        """计算EMA"""
        if len(data) == 0:
            return np.array([])
        alpha = 2.0 / (period + 1.0)
        ema = np.zeros(len(data), dtype=float)
        ema[0] = float(data[0])
        for i in range(1, len(data)):
            ema[i] = alpha * float(data[i]) + (1.0 - alpha) * ema[i - 1]
        return ema
    
    def _check_entry_conditions(self, current_price: float, klines: List[Dict], daily_trend: Optional[str]) -> Optional[Dict[str, Any]]:
        """
        检查入场条件
        
        多时间框架逻辑:
        1. 日线在EMA21上方 + 1小时多头信号 → 做多
        2. 日线在EMA21下方 + 1小时空头信号 → 做空
        """
        
        # 计算1小时EMA
        closes = np.array([k['close'] for k in klines[-(self.ema_slow + 5):]])
        
        ema_fast = self._calculate_ema(closes, self.ema_fast)
        ema_medium = self._calculate_ema(closes, self.ema_medium)
        ema_slow = self._calculate_ema(closes, self.ema_slow)
        
        current_ema_fast = ema_fast[-1]
        current_ema_medium = ema_medium[-1]
        current_ema_slow = ema_slow[-1]
        
        prev_price = closes[-2]
        prev_ema_medium = ema_medium[-2]
        
        # EMA多头排列
        is_bullish_alignment = current_ema_fast > current_ema_medium > current_ema_slow
        
        # EMA空头排列
        is_bearish_alignment = current_ema_fast < current_ema_medium < current_ema_slow
        
        # 趋势强度过滤：EMA斜率 + EMA间距
        if self.trend_strength_filter:
            ema_slow_slope = (ema_slow[-1] - ema_slow[-4]) / max(ema_slow[-4], 1e-8)
            ema_band_dist = (current_ema_medium - current_ema_slow) / max(current_price, 1e-8)
            strong_bull = ema_slow_slope > self.ema_slope_threshold and ema_band_dist > self.ema_band_distance_min
            strong_bear = ema_slow_slope < -self.ema_slope_threshold and ema_band_dist < -self.ema_band_distance_min
        else:
            strong_bull = strong_bear = True
        
        # 价格突破EMA13（中轨）
        price_cross_above = prev_price <= prev_ema_medium and current_price > current_ema_medium
        price_cross_below = prev_price >= prev_ema_medium and current_price < current_ema_medium
        
        # 冷却期控制：避免频繁反复进出
        if self.reentry_cooldown and self.last_exit_index is not None:
            current_index = len(klines) - 1
            if current_index - self.last_exit_index < self.reentry_cooldown:
                return None
        
        # === 做多信号 ===
        if price_cross_above and is_bullish_alignment and strong_bull:
            # 检查日线趋势（核心过滤）
            if daily_trend == 'BEARISH':
                logger.debug(f"✗ 1小时多头信号，但日线趋势为熊市，空仓等待")
                return None
            
            # 如果没有日线数据，也允许做多（兼容性）
            if daily_trend is None:
                logger.debug(f"⚠ 无日线数据，允许做多")
            
            logger.info(f"✓ 做多信号: 价格突破EMA{self.ema_medium} + EMA多头排列 + 趋势强度过滤通过")
            logger.info(f"  价格: {current_price:.2f}")
            logger.info(f"  EMA{self.ema_fast}: {current_ema_fast:.2f} > EMA{self.ema_medium}: {current_ema_medium:.2f} > EMA{self.ema_slow}: {current_ema_slow:.2f}")
            if daily_trend:
                logger.info(f"  日线趋势: {daily_trend} ✓ (牛市)")
            
            long_signal = self._create_long_signal(current_price, klines)
            # 基于最小盈亏比过滤低质信号
            if long_signal and long_signal.get("rr") is not None and long_signal["rr"] < self.min_rr_ratio:
                logger.debug(f"✗ 做多信号被过滤: RR={long_signal['rr']:.2f} < 最小要求 {self.min_rr_ratio}")
                return None
            return long_signal
        
        # === 做空信号（可选）===
        if self.allow_short and price_cross_below and is_bearish_alignment and strong_bear:
            if daily_trend == 'BULLISH':
                logger.debug(f"✗ 1小时空头信号但日线牛市，过滤做空")
                return None
            logger.info(f"✓ 做空信号: 跌破EMA{self.ema_medium} + EMA空头排列 + 趋势强度过滤通过")
            short_signal = self._create_short_signal(current_price, klines)
            if short_signal and short_signal.get("rr") is not None and short_signal["rr"] < self.min_rr_ratio:
                logger.debug(f"✗ 做空信号被过滤: RR={short_signal['rr']:.2f} < 最小要求 {self.min_rr_ratio}")
                return None
            return short_signal
        
        return None
    
    def _calc_atr(self, klines: List[Dict], period: int) -> Optional[float]:
        """简单ATR计算，用于波动自适应止损"""
        if len(klines) < period + 2:
            return None
        highs = [k['high'] for k in klines[-(period + 1):]]
        lows = [k['low'] for k in klines[-(period + 1):]]
        closes = [k['close'] for k in klines[-(period + 1):]]
        trs = []
        for i in range(1, len(highs)):
            true_range = max(
                highs[i] - lows[i],
                abs(highs[i] - closes[i - 1]),
                abs(lows[i] - closes[i - 1])
            )
            trs.append(true_range)
        return float(np.mean(trs)) if trs else None
    
    def _dynamic_position_size(self, entry_price: float, stop_loss: float, klines: List[Dict]) -> float:
        """
        根据风险敞口和波动动态计算仓位占比：
        - 保证: (entry_price - stop_loss) * qty <= capital * max_risk_per_trade / leverage
        - 并在 [min_position_size, max_position_size] 与基础 position_size 范围内
        """
        if stop_loss <= 0 or entry_price <= stop_loss:
            # 不合理止损，退回默认
            return self.position_size
        
        risk_per_unit = entry_price - stop_loss
        max_risk_amount = self.capital * self.max_risk_per_trade
        # 考虑杠杆后，允许更大名义头寸，但风险仍受限
        max_qty_by_risk = (max_risk_amount * self.leverage) / risk_per_unit
        base_qty = (self.capital * self.position_size * self.leverage) / entry_price
        qty = min(base_qty, max_qty_by_risk)
        
        # 转回“占用比例”，用于回测引擎兼容（名义：qty * price / capital）
        notional_ratio = (qty * entry_price) / max(self.capital, 1e-8)
        notional_ratio = max(self.min_position_size, min(self.max_position_size, notional_ratio))
        return notional_ratio
    
    def _create_long_signal(self, price: float, klines: List[Dict]) -> Dict[str, Any]:
        """创建做多信号（含杠杆与波动自适应仓位）"""
        # 先确定止损（优先ATR）
        if self.use_atr_stop:
            atr = self._calc_atr(klines, self.atr_period)
            if atr:
                stop_loss = max(price - self.atr_stop_multiplier * atr, price * (1 - self.stop_loss_pct))
            else:
                stop_loss = price * (1 - self.stop_loss_pct)
        else:
            stop_loss = price * (1 - self.stop_loss_pct)
        
        # 止盈同样支持ATR扩展
        if self.use_atr_stop:
            atr = self._calc_atr(klines, self.atr_period)
            if atr:
                take_profit = max(price + self.atr_tp_multiplier * atr, price * (1 + self.take_profit_pct))
            else:
                take_profit = price * (1 + self.take_profit_pct)
        else:
            take_profit = price * (1 + self.take_profit_pct)
        
        # 动态仓位(名义占比)，考虑杠杆
        if self.use_volatility_position_sizing:
            notional_ratio = self._dynamic_position_size(price, stop_loss, klines)
        else:
            notional_ratio = self.position_size
        
        amount = (self.capital * notional_ratio * self.leverage) / price
        
        rr = None
        if stop_loss and take_profit and price > 0:
            risk = price - stop_loss
            reward = take_profit - price
            if risk > 0:
                rr = reward / risk
        
        return {
            "signal": "buy",
            "type": "entry",
            "side": "LONG",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "reason": f"做多入场: 价格突破EMA{self.ema_medium} + EMA多头排列（含动态仓位+杠杆）",
            "leverage": self.leverage,
            "rr": rr
        }
    
    def _create_short_signal(self, price: float, klines: List[Dict]) -> Dict[str, Any]:
        """创建做空信号（含杠杆与波动自适应仓位）"""
        if self.use_atr_stop:
            atr = self._calc_atr(klines, self.atr_period)
            if atr:
                stop_loss = min(price + self.atr_stop_multiplier * atr, price * (1 + self.stop_loss_pct))
            else:
                stop_loss = price * (1 + self.stop_loss_pct)
        else:
            stop_loss = price * (1 + self.stop_loss_pct)
        
        if self.use_atr_stop:
            atr = self._calc_atr(klines, self.atr_period)
            if atr:
                take_profit = min(price - self.atr_tp_multiplier * atr, price * (1 - self.take_profit_pct))
            else:
                take_profit = price * (1 - self.take_profit_pct)
        else:
            take_profit = price * (1 - self.take_profit_pct)
        
        if self.use_volatility_position_sizing:
            # 对称处理：风险 = stop_loss - price
            risk_per_unit = stop_loss - price
            if risk_per_unit <= 0:
                notional_ratio = self.position_size
            else:
                max_risk_amount = self.capital * self.max_risk_per_trade
                max_qty_by_risk = (max_risk_amount * self.leverage) / risk_per_unit
                base_qty = (self.capital * self.position_size * self.leverage) / price
                qty = min(base_qty, max_qty_by_risk)
                notional_ratio = (qty * price) / max(self.capital, 1e-8)
                notional_ratio = max(self.min_position_size, min(self.max_position_size, notional_ratio))
        else:
            notional_ratio = self.position_size
        
        amount = (self.capital * notional_ratio * self.leverage) / price
        
        rr = None
        if stop_loss and take_profit and price > 0:
            risk = stop_loss - price
            reward = price - take_profit
            if risk > 0:
                rr = reward / risk
        
        return {
            "signal": "sell",
            "type": "entry",
            "side": "SHORT",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "reason": f"做空入场: 价格跌破EMA{self.ema_medium} + EMA空头排列（含动态仓位+杠杆）",
            "leverage": self.leverage,
            "rr": rr
        }
    
    def _check_exit_conditions(self, current_price: float, klines: List[Dict], daily_trend: Optional[str]) -> Optional[Dict[str, Any]]:
        """检查出场条件"""
        if not self.current_position:
            return None
        
        side = self.current_position.get('side', 'LONG')
        entry_price = self.entry_price
        
        # 更新最高价/最低价
        if side == 'LONG':
            if self.highest_price is None or current_price > self.highest_price:
                self.highest_price = current_price
        else:  # SHORT
            if self.highest_price is None or current_price < self.highest_price:
                self.highest_price = current_price
        
        # 计算盈亏比例
        if side == 'LONG':
            pnl_pct = (current_price - entry_price) / entry_price
        else:  # SHORT
            pnl_pct = (entry_price - current_price) / entry_price
        
        # === 止损 ===
        if pnl_pct <= -self.stop_loss_pct:
            logger.info(f"✗ 止损: {pnl_pct*100:.2f}%")
            return self._create_exit_signal("stop_loss")
        
        # === 部分止盈 ===
        # 仅减部分仓位，锁定部分利润，不视为完整交易：
        # - 标记 partial=True
        # - exit_ratio<1，交由 BacktestEngine 按比例减少持仓与记录盈亏
        if self.partial_take_profit_pct > 0 and not self.partial_closed and pnl_pct >= self.partial_take_profit_pct:
            logger.info(f"✓ 部分止盈触发: {pnl_pct*100:.2f}% → 减仓50%锁定利润")
            self.partial_closed = True
            return self._create_exit_signal("partial_take_profit", partial=True, exit_ratio=0.5)
        
        # === 全部止盈 ===
        if pnl_pct >= self.take_profit_pct:
            logger.info(f"✓ 全部止盈: {pnl_pct*100:.2f}%")
            return self._create_exit_signal("take_profit")
        
        # === 移动止损 ===
        if self.use_trailing_stop and pnl_pct >= self.trailing_stop_activation:
            if side == 'LONG':
                trailing_stop = self.highest_price * (1 - self.trailing_stop_distance)
                if current_price <= trailing_stop:
                    logger.info(f"✓ 移动止损触发: 最高{self.highest_price:.2f} -> 当前{current_price:.2f}")
                    return self._create_exit_signal("trailing_stop")
            else:  # SHORT
                trailing_stop = self.highest_price * (1 + self.trailing_stop_distance)
                if current_price >= trailing_stop:
                    logger.info(f"✓ 移动止损触发: 最低{self.highest_price:.2f} -> 当前{current_price:.2f}")
                    return self._create_exit_signal("trailing_stop")
        
        # === 趋势反转（可选）===
        if daily_trend:
            # 如果日线趋势反转，平仓
            if side == 'LONG' and daily_trend == 'BEARISH':
                logger.info(f"⚠ 日线趋势反转为熊市，平多仓")
                return self._create_exit_signal("trend_reversal")
            elif side == 'SHORT' and daily_trend == 'BULLISH':
                logger.info(f"⚠ 日线趋势反转为牛市，平空仓")
                return self._create_exit_signal("trend_reversal")
        
        return None
    
    def _create_exit_signal(self, exit_type: str, partial: bool = False, exit_ratio: float = 1.0) -> Dict[str, Any]:
        """
        创建出场信号

        Args:
            exit_type: 出场类型，如 'stop_loss', 'take_profit', 'partial_take_profit', 'trailing_stop', 'trend_reversal'
            partial: 是否为部分平仓（True 则仅减仓，不视为完整交易，不触发动态杠杆与统计结算）
            exit_ratio: 平仓比例（0-1），partial=True 时应小于1，partial=False 且默认1表示全部平仓
        """
        # 约束 exit_ratio 合法性
        if exit_ratio <= 0:
            exit_ratio = 0.0
        elif exit_ratio > 1.0:
            exit_ratio = 1.0

        return {
            "signal": "close",
            "type": exit_type,
            "reason": exit_type,
            "partial": partial,
            "exit_ratio": exit_ratio
        }
    
    def update_position(self, signal: Dict[str, Any]):
        """更新持仓信息（兼容回测引擎）"""
        if signal.get('signal') in ['buy', 'sell']:
            self.current_position = signal
            self.entry_price = signal['price']
            self.partial_closed = False
            self.highest_price = signal['price']
    
    def record_trade(self, signal: Dict[str, Any]):
        """
        记录交易（兼容回测引擎）

        注意：
        - partial=True 的信号只表示部分平仓（例如第一次止盈），不计为完整独立交易，
          不更新 total_trades / winning_trades / losing_trades，不触发杠杆调整。
        - 仅当 partial=False 且为最终平仓时，才作为一笔完整交易计入统计。
        """
        if signal.get('partial', False):
            # 部分止盈：只更新标记，保持 current_position 存在，由 BacktestEngine 维护剩余仓位
            self.partial_closed = True
            return

        # 非 partial: 视为完整平仓
        pnl = signal.get('pnl_amount', 0)
        if pnl > 0:
            self.winning_trades += 1
        else:
            # 这里不单独统计 losing_trades，由 BacktestEngine 侧聚合
            pass

        self.total_trades += 1
        self.current_position = None
        self.entry_price = None
        self.partial_closed = False
        self.highest_price = None
        # 冷却用索引在 on_trade 中由 trade['bar_index'] 设置（如有）
        # 这里不强制清空 last_exit_index
    
    def _adjust_leverage(self, pnl: float):
        """
        根据交易结果动态调整杠杆
        
        Args:
            pnl: 本次交易盈亏金额
        """
        old_leverage = self.leverage
        
        if pnl > 0:
            # 盈利：增加杠杆
            self.leverage = min(self.leverage + self.leverage_increase_step, self.max_leverage)
            logger.info(f"✓ 盈利交易，杠杆调整: {old_leverage:.1f}x → {self.leverage:.1f}x")
        else:
            # 亏损：降低杠杆
            self.leverage = max(self.leverage - self.leverage_decrease_step, self.min_leverage)
            logger.info(f"✗ 亏损交易，杠杆调整: {old_leverage:.1f}x → {self.leverage:.1f}x")
        
        self.last_trade_profit = pnl
    
    def on_trade(self, trade: Dict[str, Any]):
        """交易回调"""
        if trade.get('type') == 'entry':
            self.current_position = trade
            self.entry_price = trade['price']
            self.partial_closed = False
            self.highest_price = trade['price']
            self.total_trades += 1
            
        elif trade.get('type') in ['stop_loss', 'take_profit', 'partial_take_profit', 'trailing_stop', 'trend_reversal', 'force_close']:
            pnl = trade.get('pnl_amount', 0)

            # partial_take_profit:
            # - 仅锁定部分利润，由 BacktestEngine 部分减仓
            # - 不触发杠杆调整，不重置持仓状态
            if trade.get('partial', False):
                logger.info(f"✓ 部分平仓回调: type={trade.get('type')}, net_pnl={pnl:.4f}")
                self.partial_closed = True
                return

            # 完整平仓：有净盈亏，触发统计与杠杆调整
            if pnl > 0:
                self.winning_trades += 1

            if self.use_dynamic_leverage:
                self._adjust_leverage(pnl)

            # 清空持仓状态
            self.current_position = None
            self.entry_price = None
            self.partial_closed = False
            self.highest_price = None

            # 记录平仓bar索引用于冷却期（如 trade 中提供该字段）
            if 'bar_index' in trade:
                self.last_exit_index = trade['bar_index']
