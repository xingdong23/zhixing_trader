"""
威廉姆斯波动性突破策略 (Williams Volatility Breakout Strategy)

基于拉里·威廉姆斯的经典波动性突破系统
核心理念：在开盘价基础上，根据ATR计算突破点，价格突破时入场

策略特点：
1. 完全机械化，无需主观判断
2. 基于ATR动态调整，适应市场波动
3. 严格的风险管理（2%风险法则）
4. 高盈亏比（2.5:1）
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
import pandas as pd
import logging

logger = logging.getLogger(__name__)


class WilliamsVolatilityBreakoutStrategy:
    """威廉姆斯波动性突破策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典
        """
        self.name = "威廉姆斯波动性突破策略"
        self.parameters = parameters
        
        # 资金管理
        self.capital = float(parameters.get('total_capital', 300.0))
        self.risk_per_trade = float(parameters.get('risk_per_trade', 0.02))  # 每笔风险2%
        self.leverage = float(parameters.get('leverage', 3.0))
        
        # ATR参数
        self.atr_period = int(parameters.get('atr_period', 7))
        self.breakout_multiplier = float(parameters.get('breakout_multiplier', 0.6))
        
        # 止损止盈
        self.stop_loss_atr_multiplier = float(parameters.get('stop_loss_atr_multiplier', 1.5))
        self.take_profit_atr_multiplier = float(parameters.get('take_profit_atr_multiplier', 2.5))
        
        # 趋势过滤（可选）
        self.use_trend_filter = parameters.get('use_trend_filter', True)
        self.trend_ema_period = int(parameters.get('trend_ema_period', 21))
        
        # 成交量过滤（可选）
        self.use_volume_filter = parameters.get('use_volume_filter', False)
        self.volume_period = int(parameters.get('volume_period', 20))
        self.volume_multiplier = float(parameters.get('volume_multiplier', 1.2))
        
        # 允许做空
        self.allow_short = parameters.get('allow_short', True)
        
        # 状态变量
        self.current_position: Optional[Dict] = None
        self.entry_price = None
        self.stop_loss_price = None
        self.take_profit_price = None
        self.current_bar_open = None  # 当前K线开盘价
        self.upper_band = None  # 上轨
        self.lower_band = None  # 下轨
        self.signal_triggered = False  # 当前K线是否已触发信号
        
        # 统计
        self.total_trades = 0
        self.winning_trades = 0
        
        logger.info(f"✓ {self.name}初始化完成")
        logger.info(f"  资金: {self.capital} USDT")
        logger.info(f"  每笔风险: {self.risk_per_trade * 100}%")
        logger.info(f"  杠杆: {self.leverage}x")
        logger.info(f"  ATR周期: {self.atr_period}")
        logger.info(f"  突破系数: {self.breakout_multiplier}")
        logger.info(f"  止损: {self.stop_loss_atr_multiplier} × ATR")
        logger.info(f"  止盈: {self.take_profit_atr_multiplier} × ATR")
        logger.info(f"  趋势过滤: {self.use_trend_filter}")
        logger.info(f"  允许做空: {self.allow_short}")
    
    def calculate_atr(self, df: pd.DataFrame, period: int = None) -> pd.Series:
        """
        计算ATR (Average True Range)
        
        Args:
            df: 包含OHLC数据的DataFrame
            period: ATR周期
            
        Returns:
            ATR序列
        """
        if period is None:
            period = self.atr_period
        
        high = df['high']
        low = df['low']
        close = df['close']
        
        # 计算真实波幅
        tr1 = high - low
        tr2 = abs(high - close.shift(1))
        tr3 = abs(low - close.shift(1))
        
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        
        # 计算ATR（使用EMA）
        atr = tr.ewm(span=period, adjust=False).mean()
        
        return atr
    
    def calculate_ema(self, series: pd.Series, period: int) -> pd.Series:
        """计算EMA"""
        return series.ewm(span=period, adjust=False).mean()
    
    def analyze(self, klines: List[Dict]) -> Optional[Dict[str, Any]]:
        """
        分析当前市场状态并生成交易信号（兼容回测引擎）
        
        Args:
            klines: K线数据列表
            
        Returns:
            交易信号或None
        """
        # 转换为DataFrame
        df = pd.DataFrame(klines)
        
        # 确保有datetime索引
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df.set_index('timestamp', inplace=True)
        
        # 只分析最后一根K线
        return self.analyze_single_bar(df)
    
    def analyze_single_bar(self, df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """
        只分析最后一根K线（用于回测引擎）
        
        Args:
            df: 包含OHLC数据的DataFrame
            
        Returns:
            交易信号或None
        """
        if len(df) < self.atr_period:
            return None
        
        # 计算技术指标
        df['atr'] = self.calculate_atr(df)
        if self.use_trend_filter:
            df['trend_ema'] = self.calculate_ema(df['close'], self.trend_ema_period)
        if self.use_volume_filter:
            df['avg_volume'] = df['vol'].rolling(window=self.volume_period).mean()
        
        # 获取最后一根K线
        current_bar = df.iloc[-1]
        timestamp = current_bar.name if isinstance(current_bar.name, datetime) else datetime.fromtimestamp(current_bar['open_time'] / 1000)
        
        # 检查是否是新K线开盘
        if self.current_bar_open != current_bar['open']:
            # 新K线开始，重置状态
            self.current_bar_open = current_bar['open']
            self.signal_triggered = False
            
            # 计算突破带
            atr = current_bar['atr']
            self.upper_band = current_bar['open'] + self.breakout_multiplier * atr
            self.lower_band = current_bar['open'] - self.breakout_multiplier * atr
        
        # 如果已有持仓，只检查止损止盈
        if self.current_position is not None:
            return self._check_exit(current_bar, timestamp)
        
        # 如果当前K线已经触发过信号，返回None
        if self.signal_triggered:
            return None
        
        # 检查入场信号
        entry_signal = self._check_entry(current_bar, timestamp, df)
        if entry_signal:
            self.signal_triggered = True
        
        return entry_signal
    
    def generate_signals(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        生成交易信号（用于批量回测）
        
        Args:
            df: 包含OHLC数据的DataFrame
            
        Returns:
            信号列表
        """
        signals = []
        
        # 计算ATR
        df['atr'] = self.calculate_atr(df)
        
        # 计算趋势EMA（如果启用）
        if self.use_trend_filter:
            df['trend_ema'] = self.calculate_ema(df['close'], self.trend_ema_period)
        
        # 计算平均成交量（如果启用）
        if self.use_volume_filter:
            df['avg_volume'] = df['vol'].rolling(window=self.volume_period).mean()
        
        # 遍历每根K线
        for i in range(len(df)):
            if i < self.atr_period:  # 需要足够的数据计算ATR
                continue
            
            current_bar = df.iloc[i]
            timestamp = current_bar.name if isinstance(current_bar.name, datetime) else datetime.fromtimestamp(current_bar['open_time'] / 1000)
            
            # 检查是否是新K线开盘
            if self.current_bar_open != current_bar['open']:
                # 新K线开始，重置状态
                self.current_bar_open = current_bar['open']
                self.signal_triggered = False
                
                # 计算突破带（只在新K线开盘时计算一次）
                atr = current_bar['atr']
                self.upper_band = current_bar['open'] + self.breakout_multiplier * atr
                self.lower_band = current_bar['open'] - self.breakout_multiplier * atr
            
            # 如果已有持仓，只检查止损止盈
            if self.current_position is not None:
                exit_signal = self._check_exit(current_bar, timestamp)
                if exit_signal:
                    signals.append(exit_signal)
                continue
            
            # 如果当前K线已经触发过信号，跳过
            if self.signal_triggered:
                continue
            
            # 检查入场信号（只在没有持仓且未触发信号时）
            entry_signal = self._check_entry(current_bar, timestamp, df.iloc[:i+1])
            if entry_signal:
                signals.append(entry_signal)
                self.signal_triggered = True  # 标记当前K线已触发信号
        
        return signals
    
    def _check_entry(self, bar: pd.Series, timestamp: datetime, historical_df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """
        检查入场信号
        
        Args:
            bar: 当前K线数据
            timestamp: 时间戳
            historical_df: 历史数据（用于趋势判断）
            
        Returns:
            入场信号或None
        """
        price = bar['close']
        atr = bar['atr']
        
        # 趋势过滤
        if self.use_trend_filter:
            trend_ema = bar['trend_ema']
            is_uptrend = price > trend_ema
            is_downtrend = price < trend_ema
        else:
            is_uptrend = True
            is_downtrend = True
        
        # 成交量过滤
        volume_confirmed = True
        if self.use_volume_filter:
            avg_volume = bar['avg_volume']
            volume_confirmed = bar['vol'] > avg_volume * self.volume_multiplier
        
        # 做多信号：价格突破上轨
        if price >= self.upper_band and is_uptrend and volume_confirmed:
            # 计算仓位
            stop_loss_distance = self.stop_loss_atr_multiplier * atr
            position_size = self._calculate_position_size(price, stop_loss_distance)
            
            if position_size > 0:
                self.entry_price = price
                self.stop_loss_price = price - stop_loss_distance
                self.take_profit_price = price + self.take_profit_atr_multiplier * atr
                
                logger.info(f"✓ 做多信号: 价格突破上轨")
                logger.info(f"  价格: {price:.2f}")
                logger.info(f"  上轨: {self.upper_band:.2f}")
                logger.info(f"  ATR: {atr:.2f}")
                logger.info(f"  止损: {self.stop_loss_price:.2f} (-{stop_loss_distance:.2f})")
                logger.info(f"  止盈: {self.take_profit_price:.2f} (+{self.take_profit_atr_multiplier * atr:.2f})")
                
                return {
                    'signal': 'buy',
                    'price': price,
                    'amount': position_size,
                    'leverage': self.leverage,
                    'timestamp': timestamp,
                    'reason': 'volatility_breakout_long',
                    'atr': atr,
                    'stop_loss': self.stop_loss_price,
                    'take_profit': self.take_profit_price
                }
        
        # 做空信号：价格突破下轨
        if self.allow_short and price <= self.lower_band and is_downtrend and volume_confirmed:
            # 计算仓位
            stop_loss_distance = self.stop_loss_atr_multiplier * atr
            position_size = self._calculate_position_size(price, stop_loss_distance)
            
            if position_size > 0:
                self.entry_price = price
                self.stop_loss_price = price + stop_loss_distance
                self.take_profit_price = price - self.take_profit_atr_multiplier * atr
                
                logger.info(f"✓ 做空信号: 价格突破下轨")
                logger.info(f"  价格: {price:.2f}")
                logger.info(f"  下轨: {self.lower_band:.2f}")
                logger.info(f"  ATR: {atr:.2f}")
                logger.info(f"  止损: {self.stop_loss_price:.2f} (+{stop_loss_distance:.2f})")
                logger.info(f"  止盈: {self.take_profit_price:.2f} (-{self.take_profit_atr_multiplier * atr:.2f})")
                
                return {
                    'signal': 'sell',
                    'price': price,
                    'amount': position_size,
                    'leverage': self.leverage,
                    'timestamp': timestamp,
                    'reason': 'volatility_breakout_short',
                    'atr': atr,
                    'stop_loss': self.stop_loss_price,
                    'take_profit': self.take_profit_price
                }
        
        return None
    
    def _check_exit(self, bar: pd.Series, timestamp: datetime) -> Optional[Dict[str, Any]]:
        """
        检查出场信号
        
        Args:
            bar: 当前K线数据
            timestamp: 时间戳
            
        Returns:
            出场信号或None
        """
        if self.current_position is None:
            return None
        
        price = bar['close']
        side = self.current_position['side']
        
        # 做多持仓
        if side == 'long':
            # 止盈
            if price >= self.take_profit_price:
                pnl_pct = (price - self.entry_price) / self.entry_price * 100
                logger.info(f"✓ 止盈: +{pnl_pct:.2f}%")
                return self._create_exit_signal('take_profit', price, timestamp)
            
            # 止损
            if price <= self.stop_loss_price:
                pnl_pct = (price - self.entry_price) / self.entry_price * 100
                logger.info(f"✗ 止损: {pnl_pct:.2f}%")
                return self._create_exit_signal('stop_loss', price, timestamp)
        
        # 做空持仓
        elif side == 'short':
            # 止盈
            if price <= self.take_profit_price:
                pnl_pct = (self.entry_price - price) / self.entry_price * 100
                logger.info(f"✓ 止盈: +{pnl_pct:.2f}%")
                return self._create_exit_signal('take_profit', price, timestamp)
            
            # 止损
            if price >= self.stop_loss_price:
                pnl_pct = (self.entry_price - price) / self.entry_price * 100
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
    
    def _calculate_position_size(self, price: float, stop_loss_distance: float) -> float:
        """
        根据风险计算仓位大小（拉里·威廉姆斯的2%风险法则）
        
        Args:
            price: 入场价格
            stop_loss_distance: 止损距离
            
        Returns:
            仓位大小（币的数量）
        """
        # 风险金额 = 账户 × 风险百分比
        risk_amount = self.capital * self.risk_per_trade
        
        # 仓位 = 风险金额 / 止损距离
        position_size = risk_amount / stop_loss_distance
        
        # 考虑杠杆，计算实际需要的保证金
        margin_required = (position_size * price) / self.leverage
        
        # 确保保证金不超过账户资金
        if margin_required > self.capital * 0.95:  # 最多使用95%资金
            position_size = (self.capital * 0.95 * self.leverage) / price
        
        return position_size
    
    def update_position(self, signal: Dict[str, Any]):
        """更新持仓信息"""
        if signal.get('signal') in ['buy', 'sell']:
            self.current_position = {
                'side': 'long' if signal['signal'] == 'buy' else 'short',
                'entry_price': signal['price'],
                'amount': signal['amount'],
                'timestamp': signal['timestamp']
            }
            self.entry_price = signal['price']
        elif signal.get('signal') == 'close':
            self.current_position = None
            self.entry_price = None
            self.stop_loss_price = None
            self.take_profit_price = None
    
    def record_trade(self, signal: Dict[str, Any]):
        """记录交易"""
        if signal.get('signal') == 'close':
            pnl = signal.get('pnl_amount', 0)
            if pnl > 0:
                self.winning_trades += 1
            self.total_trades += 1
    
    def on_trade(self, trade: Dict[str, Any]):
        """交易回调"""
        if trade.get('type') == 'entry':
            self.total_trades += 1
        elif trade.get('type') in ['stop_loss', 'take_profit']:
            pnl = trade.get('pnl_amount', 0)
            if pnl > 0:
                self.winning_trades += 1
    
    def get_stats(self) -> Dict[str, Any]:
        """获取策略统计信息"""
        win_rate = self.winning_trades / self.total_trades if self.total_trades > 0 else 0
        return {
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'win_rate': win_rate
        }
