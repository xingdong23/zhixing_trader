"""
3-5-7日均线策略 (Triple Moving Average Strategy)

简单的三均线趋势跟踪策略
核心理念：使用三条短期均线捕捉短期趋势

策略特点：
1. 非常简单易懂
2. 适合短期趋势
3. 信号明确
4. 风险可控
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import pandas as pd
import logging

logger = logging.getLogger(__name__)


class TripleMAStrategy:
    """3-5-7日均线策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典
        """
        self.name = "3-5-7日均线策略"
        self.parameters = parameters
        
        # 资金管理
        self.capital = float(parameters.get('total_capital', 300.0))
        self.risk_per_trade = float(parameters.get('risk_per_trade', 0.02))  # 每笔风险2%
        self.leverage = float(parameters.get('leverage', 3.0))
        
        # 均线参数
        self.ma_short = int(parameters.get('ma_short', 3))    # 短期均线
        self.ma_medium = int(parameters.get('ma_medium', 5))  # 中期均线
        self.ma_long = int(parameters.get('ma_long', 7))      # 长期均线
        
        # 止损参数
        self.stop_loss_pct = float(parameters.get('stop_loss_pct', 0.02))  # 7日均线下方2%
        self.take_profit_pct = float(parameters.get('take_profit_pct', 0.08))  # 止盈8%
        
        # 允许做空
        self.allow_short = parameters.get('allow_short', True)
        
        # 状态变量
        self.current_position: Optional[Dict] = None
        self.entry_price = None
        self.stop_loss_price = None
        self.take_profit_price = None
        self.ma_long_value = None  # 记录入场时的7日均线值
        
        # 统计
        self.total_trades = 0
        self.winning_trades = 0
        
        logger.info(f"✓ {self.name}初始化完成")
        logger.info(f"  资金: {self.capital} USDT")
        logger.info(f"  每笔风险: {self.risk_per_trade * 100}%")
        logger.info(f"  杠杆: {self.leverage}x")
        logger.info(f"  均线周期: {self.ma_short}-{self.ma_medium}-{self.ma_long}")
        logger.info(f"  止损: 7日均线下方{self.stop_loss_pct * 100}%")
        logger.info(f"  止盈: {self.take_profit_pct * 100}%")
        logger.info(f"  允许做空: {self.allow_short}")
    
    def calculate_sma(self, series: pd.Series, period: int) -> pd.Series:
        """计算简单移动平均线"""
        return series.rolling(window=period).mean()
    
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
        if len(df) < self.ma_long + 1:
            return None
        
        # 计算三条均线
        df['ma_short'] = self.calculate_sma(df['close'], self.ma_short)
        df['ma_medium'] = self.calculate_sma(df['close'], self.ma_medium)
        df['ma_long'] = self.calculate_sma(df['close'], self.ma_long)
        
        # 获取当前K线和前一根K线
        current_bar = df.iloc[-1]
        prev_bar = df.iloc[-2]
        
        timestamp = current_bar.name if isinstance(current_bar.name, datetime) else datetime.fromtimestamp(current_bar['open_time'] / 1000)
        
        # 如果已有持仓，检查出场信号
        if self.current_position is not None:
            return self._check_exit(current_bar, prev_bar, timestamp)
        
        # 检查入场信号
        return self._check_entry(current_bar, prev_bar, timestamp)
    
    def _check_entry(self, current_bar: pd.Series, prev_bar: pd.Series, timestamp: datetime) -> Optional[Dict[str, Any]]:
        """
        检查入场信号
        
        Args:
            current_bar: 当前K线
            prev_bar: 前一根K线
            timestamp: 时间戳
            
        Returns:
            交易信号或None
        """
        price = current_bar['close']
        
        # 获取均线值
        ma_short_curr = current_bar['ma_short']
        ma_medium_curr = current_bar['ma_medium']
        ma_long_curr = current_bar['ma_long']
        
        ma_short_prev = prev_bar['ma_short']
        ma_medium_prev = prev_bar['ma_medium']
        
        # 做多信号：3日均线上穿5日均线，且5日均线在7日均线之上
        if (ma_short_prev <= ma_medium_prev and ma_short_curr > ma_medium_curr and 
            ma_medium_curr > ma_long_curr):
            
            # 计算止损止盈
            self.ma_long_value = ma_long_curr
            stop_loss_distance = price - (ma_long_curr * (1 - self.stop_loss_pct))
            position_size = self._calculate_position_size(price, stop_loss_distance)
            
            if position_size > 0:
                self.entry_price = price
                self.stop_loss_price = ma_long_curr * (1 - self.stop_loss_pct)
                self.take_profit_price = price * (1 + self.take_profit_pct)
                
                logger.info(f"✓ 做多信号: 3日均线上穿5日均线")
                logger.info(f"  价格: {price:.2f}")
                logger.info(f"  3日均线: {ma_short_curr:.2f}")
                logger.info(f"  5日均线: {ma_medium_curr:.2f}")
                logger.info(f"  7日均线: {ma_long_curr:.2f}")
                logger.info(f"  止损: {self.stop_loss_price:.2f} (7日均线-{self.stop_loss_pct*100}%)")
                logger.info(f"  止盈: {self.take_profit_price:.2f} (+{self.take_profit_pct*100}%)")
                
                return {
                    'signal': 'buy',
                    'price': price,
                    'amount': position_size,
                    'leverage': self.leverage,
                    'timestamp': timestamp,
                    'reason': 'triple_ma_golden_cross',
                    'stop_loss': self.stop_loss_price,
                    'take_profit': self.take_profit_price
                }
        
        # 做空信号：3日均线下穿5日均线，且5日均线在7日均线之下
        if self.allow_short and (ma_short_prev >= ma_medium_prev and ma_short_curr < ma_medium_curr and 
            ma_medium_curr < ma_long_curr):
            
            # 计算止损止盈
            self.ma_long_value = ma_long_curr
            stop_loss_distance = (ma_long_curr * (1 + self.stop_loss_pct)) - price
            position_size = self._calculate_position_size(price, stop_loss_distance)
            
            if position_size > 0:
                self.entry_price = price
                self.stop_loss_price = ma_long_curr * (1 + self.stop_loss_pct)
                self.take_profit_price = price * (1 - self.take_profit_pct)
                
                logger.info(f"✓ 做空信号: 3日均线下穿5日均线")
                logger.info(f"  价格: {price:.2f}")
                logger.info(f"  3日均线: {ma_short_curr:.2f}")
                logger.info(f"  5日均线: {ma_medium_curr:.2f}")
                logger.info(f"  7日均线: {ma_long_curr:.2f}")
                logger.info(f"  止损: {self.stop_loss_price:.2f} (7日均线+{self.stop_loss_pct*100}%)")
                logger.info(f"  止盈: {self.take_profit_price:.2f} (-{self.take_profit_pct*100}%)")
                
                return {
                    'signal': 'sell',
                    'price': price,
                    'amount': position_size,
                    'leverage': self.leverage,
                    'timestamp': timestamp,
                    'reason': 'triple_ma_death_cross',
                    'stop_loss': self.stop_loss_price,
                    'take_profit': self.take_profit_price
                }
        
        return None
    
    def _check_exit(self, current_bar: pd.Series, prev_bar: pd.Series, timestamp: datetime) -> Optional[Dict[str, Any]]:
        """
        检查出场信号
        
        Args:
            current_bar: 当前K线
            prev_bar: 前一根K线
            timestamp: 时间戳
            
        Returns:
            出场信号或None
        """
        if self.current_position is None:
            return None
        
        price = current_bar['close']
        side = self.current_position['side']
        
        # 获取均线值
        ma_short_curr = current_bar['ma_short']
        ma_medium_curr = current_bar['ma_medium']
        ma_long_curr = current_bar['ma_long']
        
        ma_short_prev = prev_bar['ma_short']
        ma_medium_prev = prev_bar['ma_medium']
        
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
            
            # 反向穿越：3日均线下穿5日均线
            if ma_short_prev >= ma_medium_prev and ma_short_curr < ma_medium_curr:
                pnl_pct = (price - self.entry_price) / self.entry_price * 100
                logger.info(f"↓ 反向穿越: {pnl_pct:.2f}%")
                return self._create_exit_signal('signal_reverse', price, timestamp)
            
            # 价格跌破7日均线
            if price < ma_long_curr:
                pnl_pct = (price - self.entry_price) / self.entry_price * 100
                logger.info(f"↓ 跌破7日均线: {pnl_pct:.2f}%")
                return self._create_exit_signal('break_ma_long', price, timestamp)
        
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
            
            # 反向穿越：3日均线上穿5日均线
            if ma_short_prev <= ma_medium_prev and ma_short_curr > ma_medium_curr:
                pnl_pct = (self.entry_price - price) / self.entry_price * 100
                logger.info(f"↑ 反向穿越: {pnl_pct:.2f}%")
                return self._create_exit_signal('signal_reverse', price, timestamp)
            
            # 价格突破7日均线
            if price > ma_long_curr:
                pnl_pct = (self.entry_price - price) / self.entry_price * 100
                logger.info(f"↑ 突破7日均线: {pnl_pct:.2f}%")
                return self._create_exit_signal('break_ma_long', price, timestamp)
        
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
            self.ma_long_value = None
    
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
        elif trade.get('type') in ['stop_loss', 'take_profit', 'signal_reverse', 'break_ma_long']:
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
