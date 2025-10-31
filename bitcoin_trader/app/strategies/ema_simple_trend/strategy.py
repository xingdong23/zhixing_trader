"""
EMA简单趋势策略 (EMA Simple Trend Strategy)

核心逻辑：
- 使用 EMA9/21/55
- 价格站上 EMA21 → 做多
- 价格跌破 EMA21 → 做空（或平多）
- 固定止损止盈

简单、清晰、有效
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
import logging

logger = logging.getLogger(__name__)


class EMASimpleTrendStrategy:
    """EMA简单趋势策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典
        """
        self.name = "EMA简单趋势策略"
        self.parameters = parameters
        
        # 资金管理
        self.capital = float(parameters.get('total_capital', 300.0))
        self.position_size = float(parameters.get('position_size', 0.5))
        
        # EMA参数
        self.ema_fast = int(parameters.get('ema_fast', 9))
        self.ema_medium = int(parameters.get('ema_medium', 21))
        self.ema_slow = int(parameters.get('ema_slow', 55))
        
        # 止盈止损
        self.stop_loss_pct = float(parameters.get('stop_loss_pct', 0.03))  # 3%止损
        self.take_profit_pct = float(parameters.get('take_profit_pct', 0.10))  # 10%止盈
        self.partial_take_profit_pct = float(parameters.get('partial_take_profit_pct', 0.05))  # 5%部分止盈
        
        # 移动止损
        self.use_trailing_stop = parameters.get('use_trailing_stop', True)
        self.trailing_stop_activation = float(parameters.get('trailing_stop_activation', 0.02))  # 盈利2%后激活
        self.trailing_stop_distance = float(parameters.get('trailing_stop_distance', 0.015))  # 移动止损距离1.5%
        
        # 移动止盈
        self.use_trailing_take_profit = parameters.get('use_trailing_take_profit', False)  # 默认关闭
        self.trailing_take_profit_activation = float(parameters.get('trailing_take_profit_activation', 0.04))  # 盈利4%后激活
        self.trailing_take_profit_distance = float(parameters.get('trailing_take_profit_distance', 0.02))  # 移动止盈回撤距离2%
        
        # 成交量确认
        self.volume_confirmation = parameters.get('volume_confirmation', True)
        self.volume_multiplier = float(parameters.get('volume_multiplier', 1.2))  # 成交量放大1.2倍
        
        # 趋势强度过滤
        self.trend_strength_filter = parameters.get('trend_strength_filter', True)
        self.ema_slope_threshold = float(parameters.get('ema_slope_threshold', 0.001))  # EMA斜率阈值
        
        # 是否使用EMA出场
        self.use_ema_exit = parameters.get('use_ema_exit', True)  # 默认使用EMA出场
        
        # 是否允许做空
        self.allow_short = parameters.get('allow_short', False)  # 默认不做空，只做多
        
        # 状态变量
        self.current_position: Optional[Dict] = None
        self.entry_price = None
        self.total_trades = 0
        self.winning_trades = 0
        self.partial_closed = False  # 是否已部分止盈
        self.trailing_stop_price = None  # 移动止损价格
        self.trailing_take_profit_price = None  # 移动止盈价格
        self.highest_price = None  # 最高价（多单）或最低价（空单，用于移动止盈）
        
        logger.info(f"✓ {self.name}初始化完成")
        logger.info(f"  资金: {self.capital} USDT")
        logger.info(f"  仓位: {self.position_size * 100}%")
        logger.info(f"  EMA: {self.ema_fast}/{self.ema_medium}/{self.ema_slow}")
        logger.info(f"  止损: {self.stop_loss_pct * 100}%")
        logger.info(f"  止盈: {self.take_profit_pct * 100}%")
        logger.info(f"  允许做空: {self.allow_short}")
    
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """分析市场并生成交易信号"""
        
        # 需要足够的数据来计算EMA
        if len(klines) < self.ema_slow + 5:
            return {"signal": "hold", "reason": "数据不足"}
        
        current_price = klines[-1]['close']
        
        # 如果有持仓，检查止盈止损
        if self.current_position:
            exit_signal = self._check_exit_conditions(current_price, klines)
            if exit_signal:
                return exit_signal
            return {"signal": "hold", "reason": "持仓中"}
        
        # 如果没有持仓，寻找入场机会
        entry_signal = self._check_entry_conditions(current_price, klines)
        if entry_signal:
            return entry_signal
        
        return {"signal": "hold", "reason": "等待价格突破EMA21"}
    
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
    
    def _check_volume_confirmation(self, klines: List[Dict]) -> bool:
        """检查成交量确认 - 当前成交量是否放大"""
        if not self.volume_confirmation:
            return True
        
        if len(klines) < 20:
            return False
        
        volumes = np.array([k['volume'] for k in klines[-20:]])
        current_volume = volumes[-1]
        avg_volume = np.mean(volumes[-20:-1])  # 最近19根K线的平均成交量
        
        volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1.0
        is_confirmed = volume_ratio >= self.volume_multiplier
        
        if not is_confirmed:
            logger.debug(f"✗ 成交量未放大: {volume_ratio:.2f} < {self.volume_multiplier}")
        
        return is_confirmed
    
    def _check_trend_strength(self, ema9: np.ndarray, ema21: np.ndarray, ema55: np.ndarray) -> bool:
        """检查趋势强度 - EMA是否明显上升"""
        if not self.trend_strength_filter:
            return True
        
        if len(ema9) < 5 or len(ema21) < 5 or len(ema55) < 5:
            return False
        
        # 计算EMA斜率（最近5个周期的变化率）
        ema9_slope = (ema9[-1] - ema9[-5]) / ema9[-5] if ema9[-5] > 0 else 0
        ema21_slope = (ema21[-1] - ema21[-5]) / ema21[-5] if ema21[-5] > 0 else 0
        ema55_slope = (ema55[-1] - ema55[-5]) / ema55[-5] if ema55[-5] > 0 else 0
        
        # EMA都在上升
        is_strong = ema9_slope > self.ema_slope_threshold and \
                   ema21_slope > self.ema_slope_threshold and \
                   ema55_slope > self.ema_slope_threshold
        
        if not is_strong:
            logger.debug(f"✗ 趋势强度不足: EMA9斜率={ema9_slope:.4f}, EMA21斜率={ema21_slope:.4f}, EMA55斜率={ema55_slope:.4f}")
        
        return is_strong
    
    def _check_entry_conditions(self, current_price: float, klines: List[Dict]) -> Optional[Dict[str, Any]]:
        """
        检查入场条件
        
        做多条件：
        1. 价格站上EMA21
        2. EMA多头排列：EMA9 > EMA21 > EMA55
        
        做空条件：
        1. 价格跌破EMA21（如果允许做空）
        2. EMA空头排列：EMA9 < EMA21 < EMA55
        """
        
        # 计算EMA
        closes = np.array([k['close'] for k in klines[-(self.ema_slow + 5):]])
        
        ema9 = self._calculate_ema(closes, self.ema_fast)
        ema21 = self._calculate_ema(closes, self.ema_medium)
        ema55 = self._calculate_ema(closes, self.ema_slow)
        
        current_ema9 = ema9[-1]
        current_ema21 = ema21[-1]
        current_ema55 = ema55[-1]
        
        prev_price = closes[-2]
        prev_ema21 = ema21[-2]
        
        # 检查EMA多头排列
        is_bullish_alignment = current_ema9 > current_ema21 > current_ema55
        
        # 检查EMA空头排列
        is_bearish_alignment = current_ema9 < current_ema21 < current_ema55
        
        # 做多信号：价格从下方突破EMA21 + EMA多头排列 + 成交量确认 + 趋势强度
        if prev_price <= prev_ema21 and current_price > current_ema21:
            if is_bullish_alignment:
                # 检查成交量确认
                if not self._check_volume_confirmation(klines):
                    logger.debug(f"✗ 价格突破EMA21但成交量未放大，不入场")
                    return None
                
                # 检查趋势强度
                if not self._check_trend_strength(ema9, ema21, ema55):
                    logger.debug(f"✗ 价格突破EMA21但趋势强度不足，不入场")
                    return None
                
                logger.info(f"✓ 做多信号: 价格突破EMA21 + EMA多头排列 + 成交量确认 + 趋势强度")
                logger.info(f"  价格: {current_price:.2f}")
                logger.info(f"  EMA9: {current_ema9:.2f} > EMA21: {current_ema21:.2f} > EMA55: {current_ema55:.2f}")
                
                return self._create_long_signal(current_price, current_ema21)
            else:
                logger.debug(f"✗ 价格突破EMA21但EMA未多头排列，不入场")
                logger.debug(f"  EMA9: {current_ema9:.2f}, EMA21: {current_ema21:.2f}, EMA55: {current_ema55:.2f}")
        
        # 做空信号：价格从上方跌破EMA21 + EMA空头排列（如果允许做空）
        if self.allow_short and prev_price >= prev_ema21 and current_price < current_ema21:
            if is_bearish_alignment:
                logger.info(f"✓ 做空信号: 价格跌破EMA21 + EMA空头排列")
                logger.info(f"  价格: {current_price:.2f}")
                logger.info(f"  EMA9: {current_ema9:.2f} < EMA21: {current_ema21:.2f} < EMA55: {current_ema55:.2f}")
                
                return self._create_short_signal(current_price, current_ema21)
            else:
                logger.debug(f"✗ 价格跌破EMA21但EMA未空头排列，不入场")
                logger.debug(f"  EMA9: {current_ema9:.2f}, EMA21: {current_ema21:.2f}, EMA55: {current_ema55:.2f}")
        
        return None
    
    def _create_long_signal(self, price: float, ema21: float) -> Dict[str, Any]:
        """创建做多信号"""
        
        # 计算仓位
        amount = (self.capital * self.position_size) / price
        
        # 固定止损：3%
        stop_loss = price * (1 - self.stop_loss_pct)
        
        # 固定止盈：10%
        take_profit = price * (1 + self.take_profit_pct)
        
        return {
            "signal": "buy",
            "type": "entry",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": self.parameters.get("leverage", 1.0),
            "reason": f"价格突破EMA21做多 @ {price:.2f}, 止损={stop_loss:.2f}, 止盈={take_profit:.2f}"
        }
    
    def _create_short_signal(self, price: float, ema21: float) -> Dict[str, Any]:
        """创建做空信号"""
        
        # 计算仓位
        amount = (self.capital * self.position_size) / price
        
        # 固定止损：3%
        stop_loss = price * (1 + self.stop_loss_pct)
        
        # 固定止盈：10%
        take_profit = price * (1 - self.take_profit_pct)
        
        return {
            "signal": "sell",
            "type": "entry",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": self.parameters.get("leverage", 1.0),
            "reason": f"价格跌破EMA21做空 @ {price:.2f}, 止损={stop_loss:.2f}, 止盈={take_profit:.2f}"
        }
    
    def _check_exit_conditions(self, current_price: float, klines: List[Dict]) -> Optional[Dict[str, Any]]:
        """
        检查出场条件
        
        优先级：
        1. 固定止损
        2. 固定止盈
        3. 反向信号（价格跌破EMA55）
        """
        if not self.current_position or not self.entry_price:
            return None
        
        side = self.current_position['side']
        stop_loss = self.current_position.get('stop_loss')
        take_profit = self.current_position.get('take_profit')
        
        # 计算盈亏
        if side == 'long':
            profit_ratio = (current_price - self.entry_price) / self.entry_price
            # 更新最高价（用于移动止盈）
            if self.highest_price is None or current_price > self.highest_price:
                self.highest_price = current_price
        else:
            profit_ratio = (self.entry_price - current_price) / self.entry_price
            # 更新最低价（用于移动止盈，空单时使用最低价）
            if self.highest_price is None or current_price < self.highest_price:
                self.highest_price = current_price
        
        # 0. 移动止盈（优先级最高，如果启用）
        if self.use_trailing_take_profit and profit_ratio >= self.trailing_take_profit_activation:
            if side == 'long':
                # 多单：价格回撤到移动止盈线时平仓
                if self.trailing_take_profit_price is None:
                    # 首次激活，设置移动止盈
                    self.trailing_take_profit_price = self.highest_price * (1 - self.trailing_take_profit_distance)
                else:
                    # 更新移动止盈（只能向上移动）
                    new_trailing_tp = self.highest_price * (1 - self.trailing_take_profit_distance)
                    if new_trailing_tp > self.trailing_take_profit_price:
                        self.trailing_take_profit_price = new_trailing_tp
                
                # 检查是否触发移动止盈
                if current_price <= self.trailing_take_profit_price:
                    logger.info(f"💰💰 多单触发移动止盈: {profit_ratio*100:.2f}%, 最高价={self.highest_price:.2f}, 止盈价={self.trailing_take_profit_price:.2f}")
                    return self._create_exit_signal(current_price, "trailing_take_profit", "移动止盈")
            else:
                # 空单：价格回撤到移动止盈线时平仓
                if self.trailing_take_profit_price is None:
                    # 首次激活，设置移动止盈
                    self.trailing_take_profit_price = self.highest_price * (1 + self.trailing_take_profit_distance)
                else:
                    # 更新移动止盈（只能向下移动）
                    new_trailing_tp = self.highest_price * (1 + self.trailing_take_profit_distance)
                    if new_trailing_tp < self.trailing_take_profit_price:
                        self.trailing_take_profit_price = new_trailing_tp
                
                # 检查是否触发移动止盈
                if current_price >= self.trailing_take_profit_price:
                    logger.info(f"💰💰 空单触发移动止盈: {profit_ratio*100:.2f}%, 最低价={self.highest_price:.2f}, 止盈价={self.trailing_take_profit_price:.2f}")
                    return self._create_exit_signal(current_price, "trailing_take_profit", "移动止盈")
        
        # 1. 固定止损（考虑移动止损）
        effective_stop_loss = stop_loss
        if self.use_trailing_stop and profit_ratio > self.trailing_stop_activation:
            # 移动止损已激活
            if self.trailing_stop_price is None:
                # 首次激活，设置移动止损
                if side == 'long':
                    self.trailing_stop_price = current_price * (1 - self.trailing_stop_distance)
                else:
                    self.trailing_stop_price = current_price * (1 + self.trailing_stop_distance)
            else:
                # 更新移动止损（只能向上移动）
                if side == 'long':
                    new_trailing_stop = current_price * (1 - self.trailing_stop_distance)
                    if new_trailing_stop > self.trailing_stop_price:
                        self.trailing_stop_price = new_trailing_stop
                    effective_stop_loss = max(stop_loss, self.trailing_stop_price)
                else:
                    new_trailing_stop = current_price * (1 + self.trailing_stop_distance)
                    if new_trailing_stop < self.trailing_stop_price:
                        self.trailing_stop_price = new_trailing_stop
                    effective_stop_loss = min(stop_loss, self.trailing_stop_price)
        
        if side == 'long' and current_price <= effective_stop_loss:
            stop_type = "移动止损" if (self.trailing_stop_price and current_price <= self.trailing_stop_price) else "固定止损"
            logger.warning(f"⛔ 多单触发{stop_type}: {profit_ratio*100:.2f}%")
            return self._create_exit_signal(current_price, "stop_loss", stop_type)
        
        if side == 'short' and current_price >= effective_stop_loss:
            stop_type = "移动止损" if (self.trailing_stop_price and current_price >= self.trailing_stop_price) else "固定止损"
            logger.warning(f"⛔ 空单触发{stop_type}: {profit_ratio*100:.2f}%")
            return self._create_exit_signal(current_price, "stop_loss", stop_type)
        
        # 2. 分批止盈（5%时部分平仓50%）
        if not self.partial_closed:
            if side == 'long' and profit_ratio >= self.partial_take_profit_pct:
                logger.info(f"💰 多单第一次止盈（部分平仓50%）: {profit_ratio*100:.2f}%")
                self.partial_closed = True
                return self._create_exit_signal(current_price, "partial_take_profit", "第一次部分止盈", 0.5)
            
            if side == 'short' and profit_ratio >= self.partial_take_profit_pct:
                logger.info(f"💰 空单第一次止盈（部分平仓50%）: {profit_ratio*100:.2f}%")
                self.partial_closed = True
                return self._create_exit_signal(current_price, "partial_take_profit", "第一次部分止盈", 0.5)
        
        # 3. 固定止盈（只在未启用移动止盈时使用）
        if not self.use_trailing_take_profit:
            if side == 'long' and current_price >= take_profit:
                logger.info(f"💰💰 多单第二次止盈（全部平仓）: {profit_ratio*100:.2f}%")
                return self._create_exit_signal(current_price, "take_profit", "第二次全部止盈")
            
            if side == 'short' and current_price <= take_profit:
                logger.info(f"💰💰 空单第二次止盈（全部平仓）: {profit_ratio*100:.2f}%")
                return self._create_exit_signal(current_price, "take_profit", "第二次全部止盈")
        
        # 3. 反向信号（价格跌破EMA55）
        closes = np.array([k['close'] for k in klines[-(self.ema_slow + 5):]])
        ema55 = self._calculate_ema(closes, self.ema_slow)
        
        current_ema55 = ema55[-1]
        prev_price = closes[-2]
        prev_ema55 = ema55[-2]
        
        # EMA出场（可选，默认关闭以避免过早止盈）
        if self.use_ema_exit:
            # 多单：价格跌破EMA55（只在亏损或小幅盈利时出场，大幅盈利时用移动止损保护）
            if side == 'long' and prev_price >= prev_ema55 and current_price < current_ema55:
                # 如果已经大幅盈利（>3%），不使用EMA55出场，让移动止损来处理
                if profit_ratio > 0.03:
                    logger.debug(f"📈 多单跌破EMA55但盈利>3%，由移动止损保护，不提前出场")
                    return None
                
                exit_ratio = 1.0 if self.partial_closed else 1.0
                logger.info(f"📉 多单跌破EMA55: {profit_ratio*100:.2f}%")
                return self._create_exit_signal(current_price, "ema55_cross", "跌破EMA55", exit_ratio)
            
            # 空单：价格突破EMA55（只在亏损或小幅盈利时出场）
            if side == 'short' and prev_price <= prev_ema55 and current_price > current_ema55:
                # 如果已经大幅盈利（>3%），不使用EMA55出场
                if profit_ratio > 0.03:
                    logger.debug(f"📉 空单突破EMA55但盈利>3%，由移动止损保护，不提前出场")
                    return None
                
                exit_ratio = 1.0 if self.partial_closed else 1.0
                logger.info(f"📈 空单突破EMA55: {profit_ratio*100:.2f}%")
                return self._create_exit_signal(current_price, "ema55_cross", "突破EMA55", exit_ratio)
        
        return None
    
    def _create_exit_signal(self, current_price: float, exit_type: str, reason: str, exit_ratio: float = 1.0) -> Dict[str, Any]:
        """创建出场信号
        
        Args:
            current_price: 当前价格
            exit_type: 出场类型
            reason: 出场原因
            exit_ratio: 平仓比例（0.5=50%, 1.0=100%）
        """
        
        if not self.current_position or not self.entry_price:
            return None
        
        side = self.current_position['side']
        amount = self.current_position.get("amount", 0) * exit_ratio
        
        # 计算盈亏
        if side == 'long':
            profit_ratio = (current_price - self.entry_price) / self.entry_price
        else:
            profit_ratio = (self.entry_price - current_price) / self.entry_price
        
        return {
            "signal": "sell" if side == "long" else "buy",
            "type": exit_type,
            "price": current_price,
            "amount": amount,
            "exit_ratio": exit_ratio,
            "reason": f"{reason} @ {current_price:.2f} ({profit_ratio*100:+.2f}%)"
        }
    
    def update_position(self, position: Optional[Dict[str, Any]], current_time: int = None):
        """更新持仓信息"""
        if position:
            signal_type = position.get('type', 'entry')
            exit_types = ['stop_loss', 'take_profit', 'ema21_cross', 'ema55_cross', 'trailing_take_profit']
            partial_exit_types = ['partial_take_profit']
            
            if signal_type in partial_exit_types:
                # 部分平仓
                exit_ratio = position.get('exit_ratio', 0.5)
                if self.current_position:
                    # 更新持仓数量
                    self.current_position['amount'] = self.current_position['amount'] * (1 - exit_ratio)
                    logger.info(f"📊 部分平仓 {exit_ratio*100:.0f}%，剩余仓位: {self.current_position['amount']:.4f}")
            elif signal_type in exit_types or position.get('signal') == 'close':
                # 全部平仓
                self.current_position = None
                self.entry_price = None
                self.partial_closed = False
                self.trailing_stop_price = None
                self.trailing_take_profit_price = None
                self.highest_price = None
            elif not self.current_position:
                # 新建仓位
                side = 'long' if position.get('signal') == 'buy' else 'short'
                self.current_position = {
                    'side': side,
                    'price': position.get('price'),
                    'entry_price': position.get('price') or position.get('entry_price'),
                    'amount': position.get('amount'),
                    'stop_loss': position.get('stop_loss'),
                    'take_profit': position.get('take_profit'),
                }
                self.entry_price = self.current_position['entry_price']
                self.partial_closed = False
                self.trailing_stop_price = None
                self.trailing_take_profit_price = None
                self.highest_price = None
                logger.info(f"📊 建仓 {side.upper()}: {self.entry_price:.2f}")
        else:
            # 清空仓位
            self.current_position = None
            self.entry_price = None
            self.partial_closed = False
            self.trailing_stop_price = None
            self.trailing_take_profit_price = None
            self.highest_price = None
    
    def record_trade(self, trade: Dict[str, Any]):
        """记录交易"""
        self.total_trades += 1
        if trade.get("pnl_amount", 0) > 0:
            self.winning_trades += 1
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取策略统计信息"""
        win_rate = self.winning_trades / self.total_trades if self.total_trades > 0 else 0
        return {
            "total_trades": self.total_trades,
            "winning_trades": self.winning_trades,
            "win_rate": win_rate,
            "has_position": self.current_position is not None
        }

