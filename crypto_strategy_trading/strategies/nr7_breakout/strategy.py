"""
NR7缩口突破策略 (Narrow Range 7 Breakout Strategy)

基于拉里·威廉姆斯的经典NR7策略
核心理念：识别波动收窄的K线，突破后往往有大行情

策略特点：
1. 识别近7天波幅最小的K线（NR7）
2. 次日突破前日高低点时入场
3. 止损在前日另一端
4. 高盈亏比（2.5:1）
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import pandas as pd
import logging

logger = logging.getLogger(__name__)


class NR7BreakoutStrategy:
    """NR7缩口突破策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典
        """
        self.name = "NR7缩口突破策略"
        self.parameters = parameters
        
        # 资金管理
        self.capital = float(parameters.get('total_capital', 300.0))
        self.risk_per_trade = float(parameters.get('risk_per_trade', 0.02))  # 每笔风险2%
        self.leverage = float(parameters.get('leverage', 3.0))
        
        # NR7参数
        self.lookback_period = int(parameters.get('lookback_period', 7))  # 回看周期
        
        # 成交量过滤
        self.use_volume_filter = parameters.get('use_volume_filter', True)
        self.volume_period = int(parameters.get('volume_period', 20))
        self.volume_threshold = float(parameters.get('volume_threshold', 0.8))  # 成交量低于平均80%
        
        # 止损止盈
        self.risk_reward_ratio = float(parameters.get('risk_reward_ratio', 2.5))  # 盈亏比
        
        # 趋势过滤（可选）
        self.use_trend_filter = parameters.get('use_trend_filter', False)
        self.trend_ema_period = int(parameters.get('trend_ema_period', 50))
        
        # 允许做空
        self.allow_short = parameters.get('allow_short', True)
        
        # 状态变量
        self.current_position: Optional[Dict] = None
        self.entry_price = None
        self.stop_loss_price = None
        self.take_profit_price = None
        self.nr7_bar = None  # NR7 K线
        self.nr7_high = None  # NR7高点
        self.nr7_low = None   # NR7低点
        
        # 统计
        self.total_trades = 0
        self.winning_trades = 0
        
        logger.info(f"✓ {self.name}初始化完成")
        logger.info(f"  资金: {self.capital} USDT")
        logger.info(f"  每笔风险: {self.risk_per_trade * 100}%")
        logger.info(f"  杠杆: {self.leverage}x")
        logger.info(f"  回看周期: {self.lookback_period}天")
        logger.info(f"  盈亏比: {self.risk_reward_ratio}:1")
        logger.info(f"  成交量过滤: {self.use_volume_filter}")
        logger.info(f"  趋势过滤: {self.use_trend_filter}")
        logger.info(f"  允许做空: {self.allow_short}")
    
    def calculate_ema(self, series: pd.Series, period: int) -> pd.Series:
        """计算EMA"""
        return series.ewm(span=period, adjust=False).mean()
    
    def is_nr7(self, df: pd.DataFrame, index: int) -> bool:
        """
        判断是否为NR7（近7天波幅最小）
        
        Args:
            df: DataFrame
            index: 当前索引
            
        Returns:
            是否为NR7
        """
        if index < self.lookback_period - 1:
            return False
        
        # 获取近7天的数据
        lookback_data = df.iloc[index - self.lookback_period + 1:index + 1]
        
        # 计算每天的波幅
        ranges = lookback_data['high'] - lookback_data['low']
        
        # 当前K线的波幅是否最小
        current_range = ranges.iloc[-1]
        return current_range == ranges.min()
    
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
        
        # 只分析最后一根K线
        return self.analyze_single_bar(df)
    
    def analyze_single_bar(self, df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """
        只分析最后一根K线
        
        Args:
            df: 包含OHLC数据的DataFrame
            
        Returns:
            交易信号或None
        """
        if len(df) < self.lookback_period + 1:
            return None
        
        # 计算技术指标
        if self.use_trend_filter:
            df['trend_ema'] = self.calculate_ema(df['close'], self.trend_ema_period)
        
        if self.use_volume_filter:
            # 检查成交量列名
            volume_col = 'vol' if 'vol' in df.columns else 'volume'
            df['avg_volume'] = df[volume_col].rolling(window=self.volume_period).mean()
        
        # 获取当前K线和前一根K线
        current_bar = df.iloc[-1]
        prev_bar = df.iloc[-2]
        
        timestamp = current_bar.name if isinstance(current_bar.name, datetime) else datetime.fromtimestamp(current_bar['open_time'] / 1000)
        
        # 如果已有持仓，检查止损止盈
        if self.current_position is not None:
            return self._check_exit(current_bar, timestamp)
        
        # 检查前一根K线是否为NR7
        if self.nr7_bar is None:
            # 检查前一根K线
            if self.is_nr7(df, len(df) - 2):
                # 成交量过滤
                if self.use_volume_filter:
                    volume_col = 'vol' if 'vol' in df.columns else 'volume'
                    avg_vol = prev_bar['avg_volume']
                    if prev_bar[volume_col] > avg_vol * self.volume_threshold:
                        return None  # 成交量不符合条件
                
                # 记录NR7 K线
                self.nr7_bar = prev_bar
                self.nr7_high = prev_bar['high']
                self.nr7_low = prev_bar['low']
                
                logger.info(f"🔍 发现NR7信号")
                logger.info(f"  NR7波幅: {self.nr7_high - self.nr7_low:.2f}")
                logger.info(f"  高点: {self.nr7_high:.2f}")
                logger.info(f"  低点: {self.nr7_low:.2f}")
        
        # 如果有NR7信号，检查突破
        if self.nr7_bar is not None:
            return self._check_breakout(current_bar, timestamp, df)
        
        return None
    
    def _check_breakout(self, bar: pd.Series, timestamp: datetime, df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """
        检查突破信号
        
        Args:
            bar: 当前K线
            timestamp: 时间戳
            df: 历史数据
            
        Returns:
            交易信号或None
        """
        price = bar['close']
        
        # 趋势过滤
        if self.use_trend_filter:
            trend_ema = bar['trend_ema']
            is_uptrend = price > trend_ema
            is_downtrend = price < trend_ema
        else:
            is_uptrend = True
            is_downtrend = True
        
        # 向上突破NR7高点
        if price > self.nr7_high and is_uptrend:
            stop_loss_distance = self.nr7_high - self.nr7_low
            position_size = self._calculate_position_size(price, stop_loss_distance)
            
            if position_size > 0:
                self.entry_price = price
                self.stop_loss_price = self.nr7_low
                self.take_profit_price = price + stop_loss_distance * self.risk_reward_ratio
                
                logger.info(f"✓ 做多信号: 突破NR7高点")
                logger.info(f"  入场: {price:.2f}")
                logger.info(f"  止损: {self.stop_loss_price:.2f} (NR7低点)")
                logger.info(f"  止盈: {self.take_profit_price:.2f} ({self.risk_reward_ratio}:1)")
                logger.info(f"  风险: {stop_loss_distance:.2f}")
                
                # 清除NR7信号
                self.nr7_bar = None
                
                return {
                    'signal': 'buy',
                    'price': price,
                    'amount': position_size,
                    'leverage': self.leverage,
                    'timestamp': timestamp,
                    'reason': 'nr7_breakout_long',
                    'stop_loss': self.stop_loss_price,
                    'take_profit': self.take_profit_price
                }
        
        # 向下突破NR7低点
        if self.allow_short and price < self.nr7_low and is_downtrend:
            stop_loss_distance = self.nr7_high - self.nr7_low
            position_size = self._calculate_position_size(price, stop_loss_distance)
            
            if position_size > 0:
                self.entry_price = price
                self.stop_loss_price = self.nr7_high
                self.take_profit_price = price - stop_loss_distance * self.risk_reward_ratio
                
                logger.info(f"✓ 做空信号: 突破NR7低点")
                logger.info(f"  入场: {price:.2f}")
                logger.info(f"  止损: {self.stop_loss_price:.2f} (NR7高点)")
                logger.info(f"  止盈: {self.take_profit_price:.2f} ({self.risk_reward_ratio}:1)")
                logger.info(f"  风险: {stop_loss_distance:.2f}")
                
                # 清除NR7信号
                self.nr7_bar = None
                
                return {
                    'signal': 'sell',
                    'price': price,
                    'amount': position_size,
                    'leverage': self.leverage,
                    'timestamp': timestamp,
                    'reason': 'nr7_breakout_short',
                    'stop_loss': self.stop_loss_price,
                    'take_profit': self.take_profit_price
                }
        
        return None
    
    def _check_exit(self, bar: pd.Series, timestamp: datetime) -> Optional[Dict[str, Any]]:
        """
        检查出场信号
        
        Args:
            bar: 当前K线
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
        根据风险计算仓位大小（2%风险法则）
        
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
    
    def update_capital(self, new_capital: float):
        """更新资金（用于复利）"""
        self.capital = new_capital
    
    def get_stats(self) -> Dict[str, Any]:
        """获取策略统计信息"""
        win_rate = self.winning_trades / self.total_trades if self.total_trades > 0 else 0
        return {
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'win_rate': win_rate
        }
