"""
假突破陷阱策略 (False Breakout Trap / Oops Pattern)

拉里·威廉姆斯的经典Oops模式
核心理念：捕捉假突破后的反转

策略特点：
1. 识别假突破（开盘突破但收盘回到区间）
2. 反向交易（假突破后反转）
3. 严格止损（假突破极值点外）
4. 高胜率（55-65%）

Oops模式定义：
- 做多Oops：开盘低于昨日低点，但随后回到昨日区间内
- 做空Oops：开盘高于昨日高点，但随后回到昨日区间内
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import pandas as pd
import logging

logger = logging.getLogger(__name__)


class FalseBreakoutStrategy:
    """假突破陷阱策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典
        """
        self.name = "假突破陷阱策略"
        self.parameters = parameters
        
        # 资金管理
        self.capital = float(parameters.get('total_capital', 300.0))
        self.risk_per_trade = float(parameters.get('risk_per_trade', 0.02))  # 每笔风险2%
        self.leverage = float(parameters.get('leverage', 3.0))
        
        # ATR参数
        self.atr_period = int(parameters.get('atr_period', 14))
        self.stop_loss_atr_multiplier = float(parameters.get('stop_loss_atr_multiplier', 1.5))
        
        # 止盈参数
        self.take_profit_ratio = float(parameters.get('take_profit_ratio', 2.0))  # 盈亏比2:1
        
        # 确认参数
        self.require_close_in_range = parameters.get('require_close_in_range', True)  # 要求收盘回到区间内
        self.min_breakout_pct = float(parameters.get('min_breakout_pct', 0.001))  # 最小突破幅度0.1%
        
        # 允许做空
        self.allow_short = parameters.get('allow_short', True)
        
        # 状态变量
        self.current_position: Optional[Dict] = None
        self.entry_price = None
        self.stop_loss_price = None
        self.take_profit_price = None
        
        # 统计
        self.total_trades = 0
        self.winning_trades = 0
        
        logger.info(f"✓ {self.name}初始化完成")
        logger.info(f"  资金: {self.capital} USDT")
        logger.info(f"  每笔风险: {self.risk_per_trade * 100}%")
        logger.info(f"  杠杆: {self.leverage}x")
        logger.info(f"  ATR周期: {self.atr_period}")
        logger.info(f"  止损: {self.stop_loss_atr_multiplier} ATR")
        logger.info(f"  盈亏比: {self.take_profit_ratio}:1")
        logger.info(f"  要求收盘回区间: {self.require_close_in_range}")
    
    def calculate_atr(self, df: pd.DataFrame, period: int) -> pd.Series:
        """计算ATR（平均真实波幅）"""
        high = df['high']
        low = df['low']
        close = df['close']
        
        tr1 = high - low
        tr2 = abs(high - close.shift())
        tr3 = abs(low - close.shift())
        
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(window=period).mean()
        
        return atr
    
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
        if len(df) < self.atr_period + 2:
            return None
        
        # 计算ATR
        df['atr'] = self.calculate_atr(df, self.atr_period)
        
        # 获取当前K线和前一根K线
        current_bar = df.iloc[-1]
        prev_bar = df.iloc[-2]
        
        timestamp = current_bar.name if isinstance(current_bar.name, datetime) else datetime.fromtimestamp(current_bar['open_time'] / 1000)
        
        # 如果已有持仓，检查出场信号
        if self.current_position is not None:
            return self._check_exit(current_bar, timestamp)
        
        # 检查假突破信号
        return self._check_false_breakout(current_bar, prev_bar, timestamp)
    
    def _check_false_breakout(self, current_bar: pd.Series, prev_bar: pd.Series, timestamp: datetime) -> Optional[Dict[str, Any]]:
        """
        检查假突破信号（Oops模式）
        
        Args:
            current_bar: 当前K线
            prev_bar: 前一根K线（昨日）
            timestamp: 时间戳
            
        Returns:
            交易信号或None
        """
        # 获取价格和ATR
        current_open = current_bar['open']
        current_close = current_bar['close']
        current_high = current_bar['high']
        current_low = current_bar['low']
        
        prev_high = prev_bar['high']
        prev_low = prev_bar['low']
        prev_range = prev_high - prev_low
        
        atr = current_bar['atr']
        
        if pd.isna(atr) or atr == 0:
            return None
        
        # 做多Oops：当日最低点低于昨日低点（向下突破），但收盘回到昨日区间内
        # 这表示向下假突破，应该做多
        if current_low < prev_low:
            # 计算突破幅度（使用实际最低点）
            breakout_pct = (prev_low - current_low) / prev_low
            
            # 检查是否满足最小突破幅度
            if breakout_pct < self.min_breakout_pct:
                return None
            
            # 检查是否回到区间内
            if self.require_close_in_range:
                # 收盘必须回到昨日区间内
                if current_close <= prev_low:
                    return None
            else:
                # 只要价格曾经回到区间内即可（高点 > 昨日低点）
                if current_high <= prev_low:
                    return None
            
            # 生成做多信号
            price = current_close
            
            # 止损：假突破低点外1.5个ATR
            stop_loss_distance = (price - (current_low - self.stop_loss_atr_multiplier * atr))
            position_size = self._calculate_position_size(price, stop_loss_distance)
            
            if position_size > 0:
                self.entry_price = price
                self.stop_loss_price = current_low - self.stop_loss_atr_multiplier * atr
                self.take_profit_price = price + (stop_loss_distance * self.take_profit_ratio)
                
                logger.info("✓ 做多Oops: 向下假突破后反转")
                logger.info(f"  最低: {current_low:.2f} (< 昨低 {prev_low:.2f})")
                logger.info(f"  收盘: {current_close:.2f} (回到区间)")
                logger.info(f"  突破幅度: {breakout_pct * 100:.2f}%")
                logger.info(f"  入场: {price:.2f}")
                logger.info(f"  止损: {self.stop_loss_price:.2f} (低点-{self.stop_loss_atr_multiplier}ATR)")
                logger.info(f"  止盈: {self.take_profit_price:.2f} ({self.take_profit_ratio}:1)")
                
                return {
                    'signal': 'buy',
                    'price': price,
                    'amount': position_size,
                    'leverage': self.leverage,
                    'timestamp': timestamp,
                    'reason': 'false_breakout_down',
                    'stop_loss': self.stop_loss_price,
                    'take_profit': self.take_profit_price,
                    'breakout_pct': breakout_pct
                }
        
        # 做空Oops：当日最高点高于昨日高点（向上突破），但收盘回到昨日区间内
        # 这表示向上假突破，应该做空
        if self.allow_short and current_high > prev_high:
            # 计算突破幅度（使用实际最高点）
            breakout_pct = (current_high - prev_high) / prev_high
            
            # 检查是否满足最小突破幅度
            if breakout_pct < self.min_breakout_pct:
                return None
            
            # 检查是否回到区间内
            if self.require_close_in_range:
                # 收盘必须回到昨日区间内
                if current_close >= prev_high:
                    return None
            else:
                # 只要价格曾经回到区间内即可（低点 < 昨日高点）
                if current_low >= prev_high:
                    return None
            
            # 生成做空信号
            price = current_close
            
            # 止损：假突破高点外1.5个ATR
            stop_loss_distance = ((current_high + self.stop_loss_atr_multiplier * atr) - price)
            position_size = self._calculate_position_size(price, stop_loss_distance)
            
            if position_size > 0:
                self.entry_price = price
                self.stop_loss_price = current_high + self.stop_loss_atr_multiplier * atr
                self.take_profit_price = price - (stop_loss_distance * self.take_profit_ratio)
                
                logger.info("✓ 做空Oops: 向上假突破后反转")
                logger.info(f"  最高: {current_high:.2f} (> 昨高 {prev_high:.2f})")
                logger.info(f"  收盘: {current_close:.2f} (回到区间)")
                logger.info(f"  突破幅度: {breakout_pct * 100:.2f}%")
                logger.info(f"  入场: {price:.2f}")
                logger.info(f"  止损: {self.stop_loss_price:.2f} (高点+{self.stop_loss_atr_multiplier}ATR)")
                logger.info(f"  止盈: {self.take_profit_price:.2f} ({self.take_profit_ratio}:1)")
                
                return {
                    'signal': 'sell',
                    'price': price,
                    'amount': position_size,
                    'leverage': self.leverage,
                    'timestamp': timestamp,
                    'reason': 'false_breakout_up',
                    'stop_loss': self.stop_loss_price,
                    'take_profit': self.take_profit_price,
                    'breakout_pct': breakout_pct
                }
        
        return None
    
    def _check_exit(self, current_bar: pd.Series, timestamp: datetime) -> Optional[Dict[str, Any]]:
        """
        检查出场信号
        
        Args:
            current_bar: 当前K线
            timestamp: 时间戳
            
        Returns:
            出场信号或None
        """
        if self.current_position is None:
            return None
        
        price = current_bar['close']
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
        if stop_loss_distance <= 0:
            return 0
        
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
