"""
2日RSI策略 - 自适应版本 (Adaptive 2-Day RSI Strategy)

根据市场环境自动调整策略参数：
- 牛市：放宽RSI阈值，禁止做空
- 熊市：严格RSI阈值，允许做空
- 震荡市：使用原版配置

核心优势：
1. 自动识别市场环境
2. 动态调整策略参数
3. 适应不同市场阶段
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import pandas as pd
import logging
import sys
import os

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from utils.market_regime import MarketRegimeDetector

logger = logging.getLogger(__name__)


class AdaptiveRSI2DayStrategy:
    """2日RSI策略 - 自适应版本"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典
        """
        self.name = "2日RSI策略 - 自适应版本"
        self.parameters = parameters
        
        # 资金管理
        self.capital = float(parameters.get('total_capital', 300.0))
        self.risk_per_trade = float(parameters.get('risk_per_trade', 0.02))
        self.position_size = float(parameters.get('position_size', 0.9))
        self.leverage = float(parameters.get('leverage', 3.0))
        
        # RSI参数（基础值，会根据市场环境调整）
        self.rsi_period = int(parameters.get('rsi_period', 2))
        self.base_oversold_threshold = int(parameters.get('oversold_threshold', 10))
        self.base_overbought_threshold = int(parameters.get('overbought_threshold', 90))
        self.exit_threshold = int(parameters.get('exit_threshold', 50))
        
        # 当前使用的阈值（会动态调整）
        self.oversold_threshold = self.base_oversold_threshold
        self.overbought_threshold = self.base_overbought_threshold
        
        # 趋势过滤（会根据市场环境调整）
        self.base_use_trend_filter = parameters.get('use_trend_filter', True)
        self.use_trend_filter = self.base_use_trend_filter
        self.trend_period = int(parameters.get('trend_period', 50))
        
        # 止损止盈（会根据市场环境调整）
        self.base_stop_loss_pct = float(parameters.get('stop_loss_pct', 0.05))
        self.base_take_profit_pct = float(parameters.get('take_profit_pct', 0.10))
        self.stop_loss_pct = self.base_stop_loss_pct
        self.take_profit_pct = self.base_take_profit_pct
        
        # 持仓时间限制（会根据市场环境调整）
        self.base_max_holding_days = int(parameters.get('max_holding_days', 5))
        self.max_holding_days = self.base_max_holding_days
        
        # 允许做空（会根据市场环境调整）
        self.base_allow_short = parameters.get('allow_short', True)
        self.allow_short = self.base_allow_short
        
        # 市场环境识别器
        self.regime_detector = MarketRegimeDetector(
            trend_ma_short=50,
            trend_ma_long=200,
            volatility_period=20,
            trend_threshold=0.02
        )
        
        # 市场环境检测频率（每N根K线检测一次）
        self.regime_check_interval = int(parameters.get('regime_check_interval', 20))
        self.bars_since_regime_check = 0
        self.current_regime = 'unknown'
        
        # 状态变量
        self.current_position: Optional[Dict] = None
        self.entry_time = None
        self.entry_price = None
        self.stop_loss_price = None
        self.take_profit_price = None
        
        # 统计
        self.total_trades = 0
        self.winning_trades = 0
        self.regime_changes = 0
        
        logger.info(f"✓ {self.name}初始化完成")
        logger.info(f"  资金: {self.capital} USDT")
        logger.info(f"  杠杆: {self.leverage}x")
        logger.info(f"  基础RSI阈值: {self.base_oversold_threshold}/{self.base_overbought_threshold}")
        logger.info(f"  市场环境检测间隔: {self.regime_check_interval}根K线")
    
    def calculate_rsi(self, series: pd.Series, period: int) -> pd.Series:
        """计算RSI指标"""
        delta = series.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    def analyze(self, klines: List[Dict]) -> Optional[Dict[str, Any]]:
        """
        分析当前市场状态并生成交易信号
        
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
        
        # 检查是否需要更新市场环境
        self.bars_since_regime_check += 1
        if self.bars_since_regime_check >= self.regime_check_interval:
            self._update_market_regime(df)
            self.bars_since_regime_check = 0
        
        # 只分析最后一根K线
        return self.analyze_single_bar(df)
    
    def _update_market_regime(self, df: pd.DataFrame):
        """更新市场环境并调整策略参数"""
        regime, details = self.regime_detector.detect_regime(df)
        
        if regime != self.current_regime:
            old_regime = self.current_regime
            self.current_regime = regime
            self.regime_changes += 1
            
            # 根据市场环境调整参数
            config = self.regime_detector.get_regime_config(regime)
            
            self.oversold_threshold = config['oversold_threshold']
            self.overbought_threshold = config['overbought_threshold']
            self.use_trend_filter = config['use_trend_filter']
            self.allow_short = config['allow_short']
            self.stop_loss_pct = config['stop_loss_pct']
            self.take_profit_pct = config['take_profit_pct']
            self.max_holding_days = config['max_holding_days']
            
            logger.info(f"🔄 市场环境变化: {old_regime.upper()} → {regime.upper()}")
            logger.info(f"  {config['reason']}")
            logger.info(f"  RSI阈值: {self.oversold_threshold}/{self.overbought_threshold}")
            logger.info(f"  趋势过滤: {self.use_trend_filter}")
            logger.info(f"  允许做空: {self.allow_short}")
            logger.info(f"  止损/止盈: {self.stop_loss_pct*100:.0f}%/{self.take_profit_pct*100:.0f}%")
    
    def analyze_single_bar(self, df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """
        只分析最后一根K线
        
        Args:
            df: 包含OHLC数据的DataFrame
            
        Returns:
            交易信号或None
        """
        if len(df) < max(self.rsi_period + 1, self.trend_period):
            return None
        
        # 计算RSI
        df['rsi'] = self.calculate_rsi(df['close'], self.rsi_period)
        
        # 计算趋势均线（如果启用）
        if self.use_trend_filter:
            df['trend_ma'] = df['close'].rolling(window=self.trend_period).mean()
        
        # 获取当前K线
        current_bar = df.iloc[-1]
        timestamp = current_bar.name if isinstance(current_bar.name, datetime) else datetime.fromtimestamp(current_bar['open_time'] / 1000)
        
        # 如果已有持仓，检查出场信号
        if self.current_position is not None:
            return self._check_exit(current_bar, timestamp)
        
        # 检查入场信号
        return self._check_entry(current_bar, df, timestamp)
    
    def _check_entry(self, current_bar: pd.Series, df: pd.DataFrame, timestamp: datetime) -> Optional[Dict[str, Any]]:
        """检查入场信号"""
        price = current_bar['close']
        rsi = current_bar['rsi']
        
        # 趋势过滤
        in_uptrend = True
        in_downtrend = True
        if self.use_trend_filter:
            trend_ma = current_bar['trend_ma']
            in_uptrend = price > trend_ma
            in_downtrend = price < trend_ma
        
        # 做多信号：RSI极度超卖
        if rsi < self.oversold_threshold and in_uptrend:
            position_value = self.capital * self.position_size
            position_size = (position_value * self.leverage) / price
            
            self.entry_price = price
            self.entry_time = timestamp
            self.stop_loss_price = price * (1 - self.stop_loss_pct)
            self.take_profit_price = price * (1 + self.take_profit_pct)
            
            logger.info(f"✓ 做多信号: RSI极度超卖 ({self.current_regime.upper()})")
            logger.info(f"  价格: {price:.2f}")
            logger.info(f"  RSI: {rsi:.2f}")
            logger.info(f"  止损: {self.stop_loss_price:.2f} (-{self.stop_loss_pct*100:.0f}%)")
            logger.info(f"  止盈: {self.take_profit_price:.2f} (+{self.take_profit_pct*100:.0f}%)")
            
            return {
                'signal': 'buy',
                'price': price,
                'amount': position_size,
                'leverage': self.leverage,
                'timestamp': timestamp,
                'reason': f'rsi_oversold_{self.current_regime}',
                'stop_loss': self.stop_loss_price,
                'take_profit': self.take_profit_price,
                'regime': self.current_regime
            }
        
        # 做空信号：RSI极度超买
        if self.allow_short and rsi > self.overbought_threshold and in_downtrend:
            position_value = self.capital * self.position_size
            position_size = (position_value * self.leverage) / price
            
            self.entry_price = price
            self.entry_time = timestamp
            self.stop_loss_price = price * (1 + self.stop_loss_pct)
            self.take_profit_price = price * (1 - self.take_profit_pct)
            
            logger.info(f"✓ 做空信号: RSI极度超买 ({self.current_regime.upper()})")
            logger.info(f"  价格: {price:.2f}")
            logger.info(f"  RSI: {rsi:.2f}")
            logger.info(f"  止损: {self.stop_loss_price:.2f} (+{self.stop_loss_pct*100:.0f}%)")
            logger.info(f"  止盈: {self.take_profit_price:.2f} (-{self.take_profit_pct*100:.0f}%)")
            
            return {
                'signal': 'sell',
                'price': price,
                'amount': position_size,
                'leverage': self.leverage,
                'timestamp': timestamp,
                'reason': f'rsi_overbought_{self.current_regime}',
                'stop_loss': self.stop_loss_price,
                'take_profit': self.take_profit_price,
                'regime': self.current_regime
            }
        
        return None
    
    def _check_exit(self, current_bar: pd.Series, timestamp: datetime) -> Optional[Dict[str, Any]]:
        """检查出场信号"""
        if self.current_position is None:
            return None
        
        price = current_bar['close']
        rsi = current_bar['rsi']
        side = self.current_position['side']
        
        # 计算持仓时间
        holding_days = (timestamp - self.entry_time).total_seconds() / 86400
        
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
            
            # RSI回归中轴
            if rsi >= self.exit_threshold:
                pnl_pct = (price - self.entry_price) / self.entry_price * 100
                logger.info(f"→ RSI回归中轴: {pnl_pct:.2f}%")
                return self._create_exit_signal('rsi_exit', price, timestamp)
            
            # 时间止损
            if holding_days >= self.max_holding_days:
                pnl_pct = (price - self.entry_price) / self.entry_price * 100
                logger.info(f"⏰ 时间止损: {pnl_pct:.2f}% (持仓{holding_days:.0f}天)")
                return self._create_exit_signal('time_exit', price, timestamp)
        
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
            
            # RSI回归中轴
            if rsi <= self.exit_threshold:
                pnl_pct = (self.entry_price - price) / self.entry_price * 100
                logger.info(f"→ RSI回归中轴: {pnl_pct:.2f}%")
                return self._create_exit_signal('rsi_exit', price, timestamp)
            
            # 时间止损
            if holding_days >= self.max_holding_days:
                pnl_pct = (self.entry_price - price) / self.entry_price * 100
                logger.info(f"⏰ 时间止损: {pnl_pct:.2f}% (持仓{holding_days:.0f}天)")
                return self._create_exit_signal('time_exit', price, timestamp)
        
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
        """更新持仓信息"""
        if signal.get('signal') in ['buy', 'sell']:
            self.current_position = {
                'side': 'long' if signal['signal'] == 'buy' else 'short',
                'entry_price': signal['price'],
                'amount': signal['amount'],
                'timestamp': signal['timestamp']
            }
            self.entry_price = signal['price']
            self.entry_time = signal['timestamp']
        elif signal.get('signal') == 'close':
            self.current_position = None
            self.entry_price = None
            self.entry_time = None
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
        elif trade.get('type') in ['stop_loss', 'take_profit', 'rsi_exit', 'time_exit']:
            pnl = trade.get('pnl_amount', 0)
            if pnl > 0:
                self.winning_trades += 1
    
    def update_capital(self, new_capital: float):
        """更新资金（用于复利）"""
        self.capital = new_capital
    
    def get_stats(self) -> Dict[str, Any]:
        """获取策略统计信息"""
        win_rate = self.winning_trades / self.total_trades if self.total_trades > 0 else 0
        return {
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'win_rate': win_rate,
            'regime_changes': self.regime_changes,
            'current_regime': self.current_regime
        }
