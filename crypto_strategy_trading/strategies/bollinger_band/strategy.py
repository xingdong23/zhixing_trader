"""
布林带策略 (Bollinger Band Strategy)

核心逻辑:
1. 价格触及下轨 + 反转信号 → 做多
2. 价格触及上轨 + 反转信号 → 做空
3. 回归中轨止盈

布林带参数:
- 中轨: 20周期SMA
- 上轨: 中轨 + 2倍标准差
- 下轨: 中轨 - 2倍标准差
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)


class BollingerBandStrategy:
    """布林带策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        self.name = "布林带策略"
        self.parameters = parameters
        
        # 资金管理
        self.capital = float(parameters.get('total_capital', 300.0))
        self.risk_per_trade = float(parameters.get('risk_per_trade', 0.03))
        self.leverage = float(parameters.get('leverage', 5.0))
        
        # 布林带参数
        self.bb_period = int(parameters.get('bb_period', 20))
        self.bb_std = float(parameters.get('bb_std', 2.0))
        
        # 入场条件
        self.touch_threshold = float(parameters.get('touch_threshold', 0.002))  # 触及轨道阈值0.2%
        self.require_reversal = parameters.get('require_reversal', True)  # 需要反转K线
        
        # 止损止盈
        self.stop_loss_std = float(parameters.get('stop_loss_std', 0.5))  # 止损在轨道外0.5倍标准差
        self.take_profit_target = parameters.get('take_profit_target', 'middle')  # 止盈目标: middle/opposite
        self.risk_reward_min = float(parameters.get('risk_reward_min', 1.5))  # 最小盈亏比
        
        # RSI过滤
        self.use_rsi = parameters.get('use_rsi', True)
        self.rsi_period = int(parameters.get('rsi_period', 14))
        self.rsi_oversold = float(parameters.get('rsi_oversold', 30))
        self.rsi_overbought = float(parameters.get('rsi_overbought', 70))
        
        # 趋势过滤
        self.use_trend_filter = parameters.get('use_trend_filter', True)
        self.trend_ema_period = int(parameters.get('trend_ema_period', 50))
        
        # 允许做空
        self.allow_short = parameters.get('allow_short', True)
        
        # 冷却期
        self.cooldown_bars = int(parameters.get('cooldown_bars', 3))
        
        # 状态变量
        self.current_position: Optional[Dict] = None
        self.entry_price = None
        self.stop_loss_price = None
        self.take_profit_price = None
        
        # 统计
        self.total_trades = 0
        self.winning_trades = 0
        self.cooldown_counter = 0
        self.bars_since_last_trade = 0
        self.highest_profit = 0.0
        
        logger.info(f"✓ {self.name}初始化完成")
        logger.info(f"  资金: {self.capital} USDT, 杠杆: {self.leverage}x")
        logger.info(f"  布林带: {self.bb_period}周期, {self.bb_std}倍标准差")
        logger.info(f"  止盈目标: {self.take_profit_target}")
    
    def calculate_bollinger_bands(self, df: pd.DataFrame) -> pd.DataFrame:
        """计算布林带"""
        df = df.copy()
        df['bb_middle'] = df['close'].rolling(window=self.bb_period).mean()
        df['bb_std'] = df['close'].rolling(window=self.bb_period).std()
        df['bb_upper'] = df['bb_middle'] + self.bb_std * df['bb_std']
        df['bb_lower'] = df['bb_middle'] - self.bb_std * df['bb_std']
        df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df['bb_middle']  # 带宽
        return df
    
    def calculate_rsi(self, series: pd.Series, period: int) -> pd.Series:
        """计算RSI"""
        delta = series.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))
    
    def calculate_ema(self, series: pd.Series, period: int) -> pd.Series:
        """计算EMA"""
        return series.ewm(span=period, adjust=False).mean()
    
    def is_bullish_reversal(self, bar: pd.Series, prev_bar: pd.Series) -> bool:
        """检测看涨反转信号"""
        # 锤子线: 下影线长，实体小
        body = abs(bar['close'] - bar['open'])
        total_range = bar['high'] - bar['low']
        lower_shadow = min(bar['open'], bar['close']) - bar['low']
        
        if total_range > 0:
            is_hammer = lower_shadow > body * 2 and body / total_range < 0.3
            if is_hammer:
                return True
        
        # 看涨吞没
        if prev_bar['close'] < prev_bar['open'] and bar['close'] > bar['open']:
            if bar['close'] > prev_bar['open'] and bar['open'] < prev_bar['close']:
                return True
        
        # 阳线收盘
        if bar['close'] > bar['open']:
            return True
        
        return False
    
    def is_bearish_reversal(self, bar: pd.Series, prev_bar: pd.Series) -> bool:
        """检测看跌反转信号"""
        # 射击之星: 上影线长，实体小
        body = abs(bar['close'] - bar['open'])
        total_range = bar['high'] - bar['low']
        upper_shadow = bar['high'] - max(bar['open'], bar['close'])
        
        if total_range > 0:
            is_shooting_star = upper_shadow > body * 2 and body / total_range < 0.3
            if is_shooting_star:
                return True
        
        # 看跌吞没
        if prev_bar['close'] > prev_bar['open'] and bar['close'] < bar['open']:
            if bar['open'] > prev_bar['close'] and bar['close'] < prev_bar['open']:
                return True
        
        # 阴线收盘
        if bar['close'] < bar['open']:
            return True
        
        return False
    
    def detect_signal(self, df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """检测交易信号"""
        if len(df) < self.bb_period + 5:
            return None
        
        current_bar = df.iloc[-1]
        prev_bar = df.iloc[-2]
        
        price = current_bar['close']
        bb_upper = current_bar['bb_upper']
        bb_lower = current_bar['bb_lower']
        bb_middle = current_bar['bb_middle']
        bb_std_val = current_bar['bb_std']
        
        # 计算价格与轨道的距离
        dist_to_lower = (price - bb_lower) / bb_lower
        dist_to_upper = (bb_upper - price) / bb_upper
        
        # RSI
        rsi = None
        if self.use_rsi:
            rsi_series = self.calculate_rsi(df['close'], self.rsi_period)
            rsi = rsi_series.iloc[-1]
        
        # 趋势判断
        trend = 'neutral'
        if self.use_trend_filter:
            ema = self.calculate_ema(df['close'], self.trend_ema_period)
            if len(ema) > 0:
                current_ema = ema.iloc[-1]
                if price > current_ema * 1.01:
                    trend = 'up'
                elif price < current_ema * 0.99:
                    trend = 'down'
        
        signal = None
        
        # 做多信号: 价格触及下轨
        if dist_to_lower < self.touch_threshold:
            # RSI确认超卖
            rsi_ok = not self.use_rsi or (rsi is not None and rsi < self.rsi_oversold + 20)
            # 趋势不是强下跌
            trend_ok = not self.use_trend_filter or trend != 'down'
            # 反转K线确认
            reversal_ok = not self.require_reversal or self.is_bullish_reversal(current_bar, prev_bar)
            
            if rsi_ok and trend_ok and reversal_ok:
                signal = {
                    'direction': 'long',
                    'entry_price': price,
                    'bb_lower': bb_lower,
                    'bb_middle': bb_middle,
                    'bb_upper': bb_upper,
                    'bb_std': bb_std_val,
                    'rsi': rsi,
                    'reason': 'touch_lower_band'
                }
        
        # 做空信号: 价格触及上轨
        elif dist_to_upper < self.touch_threshold and self.allow_short:
            # RSI确认超买
            rsi_ok = not self.use_rsi or (rsi is not None and rsi > self.rsi_overbought - 20)
            # 趋势不是强上涨
            trend_ok = not self.use_trend_filter or trend != 'up'
            # 反转K线确认
            reversal_ok = not self.require_reversal or self.is_bearish_reversal(current_bar, prev_bar)
            
            if rsi_ok and trend_ok and reversal_ok:
                signal = {
                    'direction': 'short',
                    'entry_price': price,
                    'bb_lower': bb_lower,
                    'bb_middle': bb_middle,
                    'bb_upper': bb_upper,
                    'bb_std': bb_std_val,
                    'rsi': rsi,
                    'reason': 'touch_upper_band'
                }
        
        return signal
    
    def analyze(self, klines: List[Dict]) -> Optional[Dict[str, Any]]:
        """分析K线数据"""
        df = pd.DataFrame(klines)
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df.set_index('timestamp', inplace=True)
        return self.analyze_single_bar(df)
    
    def analyze_single_bar(self, df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """分析最后一根K线"""
        min_bars = max(self.bb_period, self.trend_ema_period, self.rsi_period) + 10
        if len(df) < min_bars:
            return None
        
        self.bars_since_last_trade += 1
        
        # 计算布林带
        df = self.calculate_bollinger_bands(df)
        
        current_bar = df.iloc[-1]
        timestamp = current_bar.name if isinstance(current_bar.name, datetime) else datetime.now()
        
        # 如果已有持仓，检查出场
        if self.current_position is not None:
            return self._check_exit(df, timestamp)
        
        # 冷却期
        if self.cooldown_counter > 0:
            self.cooldown_counter -= 1
            return None
        
        # 检测信号
        signal = self.detect_signal(df)
        if signal is None:
            return None
        
        return self._generate_entry_signal(signal, df, timestamp)
    
    def _generate_entry_signal(self, signal: Dict, df: pd.DataFrame, 
                                timestamp: datetime) -> Optional[Dict[str, Any]]:
        """生成入场信号"""
        direction = signal['direction']
        price = signal['entry_price']
        bb_std = signal['bb_std']
        bb_middle = signal['bb_middle']
        bb_upper = signal['bb_upper']
        bb_lower = signal['bb_lower']
        
        if direction == 'long':
            # 止损: 下轨下方
            self.stop_loss_price = bb_lower - bb_std * self.stop_loss_std
            # 止盈: 中轨或上轨
            if self.take_profit_target == 'middle':
                self.take_profit_price = bb_middle
            else:
                self.take_profit_price = bb_upper
            signal_type = 'buy'
        else:
            # 止损: 上轨上方
            self.stop_loss_price = bb_upper + bb_std * self.stop_loss_std
            # 止盈: 中轨或下轨
            if self.take_profit_target == 'middle':
                self.take_profit_price = bb_middle
            else:
                self.take_profit_price = bb_lower
            signal_type = 'sell'
        
        # 检查盈亏比
        stop_loss_distance = abs(price - self.stop_loss_price)
        take_profit_distance = abs(self.take_profit_price - price)
        
        if stop_loss_distance <= 0:
            return None
        
        rr_ratio = take_profit_distance / stop_loss_distance
        if rr_ratio < self.risk_reward_min:
            return None
        
        # 计算仓位
        risk_amount = self.capital * self.risk_per_trade
        position_size = risk_amount / stop_loss_distance
        margin_required = (position_size * price) / self.leverage
        
        if margin_required > self.capital * 0.95:
            position_size = (self.capital * 0.95 * self.leverage) / price
        
        if position_size <= 0:
            return None
        
        self.entry_price = price
        
        rsi_info = f", RSI={signal['rsi']:.1f}" if signal['rsi'] else ""
        logger.info(f"✓ 布林带{signal['reason']}: {'做多' if direction == 'long' else '做空'}{rsi_info}")
        logger.info(f"  入场: {price:.2f}, 中轨: {bb_middle:.2f}")
        logger.info(f"  止损: {self.stop_loss_price:.2f}, 止盈: {self.take_profit_price:.2f}")
        logger.info(f"  盈亏比: {rr_ratio:.2f}")
        
        return {
            'signal': signal_type,
            'price': price,
            'amount': position_size,
            'leverage': self.leverage,
            'timestamp': timestamp,
            'reason': f"bollinger_{signal['reason']}",
            'stop_loss': self.stop_loss_price,
            'take_profit': self.take_profit_price
        }
    
    def _check_exit(self, df: pd.DataFrame, timestamp: datetime) -> Optional[Dict[str, Any]]:
        """检查出场信号"""
        if self.current_position is None:
            return None
        
        current_bar = df.iloc[-1]
        price = current_bar['close']
        side = self.current_position['side']
        
        # 更新布林带止盈目标（动态跟踪中轨）
        if self.take_profit_target == 'middle':
            bb_middle = current_bar['bb_middle']
            if side == 'long':
                self.take_profit_price = bb_middle
            else:
                self.take_profit_price = bb_middle
        
        if side == 'long':
            current_profit = (price - self.entry_price) / self.entry_price
            
            # 止盈
            if price >= self.take_profit_price:
                pnl_pct = current_profit * 100
                logger.info(f"✓ 止盈(回归中轨): +{pnl_pct:.2f}%")
                return self._create_exit_signal('take_profit', price, timestamp)
            
            # 止损
            if price <= self.stop_loss_price:
                pnl_pct = current_profit * 100
                logger.info(f"✗ 止损: {pnl_pct:.2f}%")
                return self._create_exit_signal('stop_loss', price, timestamp)
        
        elif side == 'short':
            current_profit = (self.entry_price - price) / self.entry_price
            
            # 止盈
            if price <= self.take_profit_price:
                pnl_pct = current_profit * 100
                logger.info(f"✓ 止盈(回归中轨): +{pnl_pct:.2f}%")
                return self._create_exit_signal('take_profit', price, timestamp)
            
            # 止损
            if price >= self.stop_loss_price:
                pnl_pct = current_profit * 100
                logger.info(f"✗ 止损: {pnl_pct:.2f}%")
                return self._create_exit_signal('stop_loss', price, timestamp)
        
        return None
    
    def _create_exit_signal(self, exit_type: str, price: float, timestamp: datetime) -> Dict[str, Any]:
        """创建出场信号"""
        return {
            'signal': 'close',
            'type': exit_type,
            'price': price,
            'timestamp': timestamp,
            'reason': exit_type
        }
    
    def update_position(self, signal: Dict[str, Any]):
        """更新持仓"""
        if signal.get('signal') in ['buy', 'sell']:
            self.current_position = {
                'side': 'long' if signal['signal'] == 'buy' else 'short',
                'entry_price': signal['price'],
                'amount': signal['amount'],
                'timestamp': signal['timestamp']
            }
            self.entry_price = signal['price']
            self.bars_since_last_trade = 0
        elif signal.get('signal') == 'close':
            self.current_position = None
            self.entry_price = None
            self.stop_loss_price = None
            self.take_profit_price = None
            self.highest_profit = 0.0
            self.cooldown_counter = self.cooldown_bars
    
    def on_trade(self, trade: Dict[str, Any]):
        """交易回调"""
        if trade.get('type') == 'entry':
            self.total_trades += 1
        elif trade.get('type') in ['stop_loss', 'take_profit', 'force_close']:
            pnl = trade.get('pnl_amount', 0)
            if pnl > 0:
                self.winning_trades += 1
    
    def update_capital(self, new_capital: float):
        """更新资金"""
        self.capital = new_capital
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计"""
        win_rate = self.winning_trades / self.total_trades if self.total_trades > 0 else 0
        return {
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'win_rate': win_rate
        }
