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
        
        # 资金管理
        self.capital = float(parameters.get('total_capital', 300.0))
        self.position_size = float(parameters.get('position_size', 0.5))
        self.leverage = float(parameters.get('leverage', 1.0))
        
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
        
        # 其他过滤器
        self.volume_confirmation = parameters.get('volume_confirmation', False)
        self.volume_multiplier = float(parameters.get('volume_multiplier', 1.05))
        self.trend_strength_filter = parameters.get('trend_strength_filter', False)
        self.ema_slope_threshold = float(parameters.get('ema_slope_threshold', 0.0001))
        self.use_ema_exit = parameters.get('use_ema_exit', False)
        
        # 允许做空（多时间框架版本默认开启）
        self.allow_short = parameters.get('allow_short', True)
        
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
        logger.info(f"  杠杆: {self.leverage}x")
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
        
        # 价格突破EMA13（中轨）
        price_cross_above = prev_price <= prev_ema_medium and current_price > current_ema_medium
        price_cross_below = prev_price >= prev_ema_medium and current_price < current_ema_medium
        
        # === 做多信号 ===
        if price_cross_above and is_bullish_alignment:
            # 检查日线趋势（核心过滤）
            if daily_trend == 'BEARISH':
                logger.debug(f"✗ 1小时多头信号，但日线趋势为熊市，空仓等待")
                return None
            
            # 如果没有日线数据，也允许做多（兼容性）
            if daily_trend is None:
                logger.debug(f"⚠ 无日线数据，允许做多")
            
            logger.info(f"✓ 做多信号: 价格突破EMA{self.ema_medium} + EMA多头排列")
            logger.info(f"  价格: {current_price:.2f}")
            logger.info(f"  EMA{self.ema_fast}: {current_ema_fast:.2f} > EMA{self.ema_medium}: {current_ema_medium:.2f} > EMA{self.ema_slow}: {current_ema_slow:.2f}")
            if daily_trend:
                logger.info(f"  日线趋势: {daily_trend} ✓ (牛市)")
            
            return self._create_long_signal(current_price)
        
        # 不做空（即使有空头信号也忽略）
        if price_cross_below and is_bearish_alignment:
            if daily_trend == 'BEARISH':
                logger.debug(f"✗ 1小时空头信号 + 日线熊市 → 空仓等待（不做空）")
            else:
                logger.debug(f"✗ 1小时空头信号但日线牛市 → 忽略信号")
        
        return None
    
    def _create_long_signal(self, price: float) -> Dict[str, Any]:
        """创建做多信号"""
        amount = (self.capital * self.position_size) / price
        stop_loss = price * (1 - self.stop_loss_pct)
        take_profit = price * (1 + self.take_profit_pct)
        
        return {
            "signal": "buy",
            "type": "entry",
            "side": "LONG",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "reason": f"做多入场: 价格突破EMA{self.ema_medium} + EMA多头排列"
        }
    
    def _create_short_signal(self, price: float) -> Dict[str, Any]:
        """创建做空信号"""
        amount = (self.capital * self.position_size) / price
        stop_loss = price * (1 + self.stop_loss_pct)
        take_profit = price * (1 - self.take_profit_pct)
        
        return {
            "signal": "sell",
            "type": "entry",
            "side": "SHORT",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "reason": f"做空入场: 价格跌破EMA{self.ema_medium} + EMA空头排列"
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
        if self.partial_take_profit_pct > 0 and not self.partial_closed and pnl_pct >= self.partial_take_profit_pct:
            logger.info(f"✓ 部分止盈: {pnl_pct*100:.2f}%")
            self.partial_closed = True
            return self._create_exit_signal("partial_take_profit", partial=True)
        
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
    
    def _create_exit_signal(self, exit_type: str, partial: bool = False) -> Dict[str, Any]:
        """创建出场信号"""
        return {
            "signal": "close",
            "type": exit_type,
            "reason": exit_type,
            "partial": partial
        }
    
    def update_position(self, signal: Dict[str, Any]):
        """更新持仓信息（兼容回测引擎）"""
        if signal.get('signal') in ['buy', 'sell']:
            self.current_position = signal
            self.entry_price = signal['price']
            self.partial_closed = False
            self.highest_price = signal['price']
    
    def record_trade(self, signal: Dict[str, Any]):
        """记录交易（兼容回测引擎）"""
        # 部分止盈不算完成交易
        if signal.get('partial', False):
            self.partial_closed = True
        else:
            # 全部平仓
            if signal.get('pnl_amount', 0) > 0:
                self.winning_trades += 1
            self.total_trades += 1
            self.current_position = None
            self.entry_price = None
            self.partial_closed = False
            self.highest_price = None
    
    def on_trade(self, trade: Dict[str, Any]):
        """交易回调"""
        if trade.get('type') == 'entry':
            self.current_position = trade
            self.entry_price = trade['price']
            self.partial_closed = False
            self.highest_price = trade['price']
            self.total_trades += 1
            
        elif trade.get('type') in ['stop_loss', 'take_profit', 'partial_take_profit', 'trailing_stop', 'trend_reversal', 'force_close']:
            if trade.get('pnl_amount', 0) > 0:
                self.winning_trades += 1
            
            if not trade.get('partial', False):
                self.current_position = None
                self.entry_price = None
                self.partial_closed = False
                self.highest_price = None
