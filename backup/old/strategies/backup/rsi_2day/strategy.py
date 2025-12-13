"""
2日RSI策略 (2-Day RSI Strategy)

基于拉里·威廉姆斯的极短期RSI策略
核心理念：使用2日RSI捕捉极度超买超卖后的反转

策略特点：
1. 使用极短期RSI（2日）识别极端情况
2. 在趋势市场中效果更好
3. 持仓时间短（2-5天）
4. 简单有效，易于执行
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import pandas as pd
import logging

logger = logging.getLogger(__name__)


class RSI2DayStrategy:
    """2日RSI策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典
        """
        self.name = "2日RSI策略"
        self.parameters = parameters
        
        # 资金管理
        self.capital = float(parameters.get('total_capital', 300.0))
        self.risk_per_trade = float(parameters.get('risk_per_trade', 0.02))
        self.position_size = float(parameters.get('position_size', 0.9))
        self.leverage = float(parameters.get('leverage', 3.0))
        
        # RSI参数
        self.rsi_period = int(parameters.get('rsi_period', 2))
        self.oversold_threshold = float(parameters.get('oversold_threshold', 10))
        self.overbought_threshold = float(parameters.get('overbought_threshold', 90))
        self.exit_threshold = float(parameters.get('exit_threshold', 50))
        
        # 趋势过滤
        self.use_trend_filter = parameters.get('use_trend_filter', True)
        self.trend_period = int(parameters.get('trend_period', 50))
        
        # 止损止盈
        self.stop_loss_pct = float(parameters.get('stop_loss_pct', 0.05))
        self.take_profit_pct = float(parameters.get('take_profit_pct', 0.10))
        
        # 持仓时间限制
        self.max_holding_days = int(parameters.get('max_holding_days', 5))
        
        # 允许做空
        self.allow_short = parameters.get('allow_short', True)
        
        # 移动止损
        self.use_trailing_stop = parameters.get('use_trailing_stop', False)
        self.trailing_stop_activation = float(parameters.get('trailing_stop_activation', 0.03))  # 盈利3%后启动
        self.trailing_stop_distance = float(parameters.get('trailing_stop_distance', 0.02))  # 跟随距离2%
        self.highest_price = None  # 做多时的最高价
        self.lowest_price = None   # 做空时的最低价
        
        # 动态杠杆管理
        self.use_dynamic_leverage = parameters.get('use_dynamic_leverage', False)
        self.base_leverage = self.leverage  # 保存基础杠杆
        self.min_leverage = float(parameters.get('min_leverage', 2.0))
        self.max_leverage = float(parameters.get('max_leverage', 5.0))
        self.leverage_step = float(parameters.get('leverage_step', 0.5))
        
        # 状态变量
        self.current_position: Optional[Dict] = None
        self.entry_price = None
        self.entry_time = None
        self.stop_loss_price = None
        self.take_profit_price = None
        self.last_trade_pnl = 0  # 上一笔交易盈亏
        
        # 统计
        self.total_trades = 0
        self.winning_trades = 0
        self.consecutive_wins = 0  # 连续盈利次数
        self.consecutive_losses = 0  # 连续亏损次数
        
        logger.info(f"✓ {self.name}初始化完成")
        logger.info(f"  资金: {self.capital} USDT")
        logger.info(f"  仓位: {self.position_size * 100}%")
        logger.info(f"  杠杆: {self.leverage}x")
        logger.info(f"  RSI周期: {self.rsi_period}日")
        logger.info(f"  超卖阈值: {self.oversold_threshold}")
        logger.info(f"  超买阈值: {self.overbought_threshold}")
        logger.info(f"  出场阈值: {self.exit_threshold}")
        logger.info(f"  止损: {self.stop_loss_pct * 100}%")
        logger.info(f"  止盈: {self.take_profit_pct * 100}%")
        logger.info(f"  最大持仓: {self.max_holding_days}天")
        logger.info(f"  趋势过滤: {self.use_trend_filter}")
        logger.info(f"  允许做空: {self.allow_short}")
        if self.use_trailing_stop:
            logger.info(f"  移动止损: 开启")
            logger.info(f"  启动条件: 盈利{self.trailing_stop_activation * 100}%")
            logger.info(f"  跟随距离: {self.trailing_stop_distance * 100}%")
        if self.use_dynamic_leverage:
            logger.info(f"  动态杠杆: 开启")
            logger.info(f"  杠杆范围: {self.min_leverage}x - {self.max_leverage}x")
            logger.info(f"  调整步长: {self.leverage_step}x")
    
    def calculate_rsi(self, prices: pd.Series, period: int = None) -> pd.Series:
        """
        计算RSI指标
        
        Args:
            prices: 价格序列
            period: RSI周期
            
        Returns:
            RSI序列
        """
        if period is None:
            period = self.rsi_period
        
        # 计算价格变化
        delta = prices.diff()
        
        # 分离上涨和下跌
        gain = delta.where(delta > 0, 0)
        loss = -delta.where(delta < 0, 0)
        
        # 计算平均涨跌幅
        avg_gain = gain.rolling(window=period, min_periods=period).mean()
        avg_loss = loss.rolling(window=period, min_periods=period).mean()
        
        # 计算RS和RSI
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def calculate_sma(self, series: pd.Series, period: int) -> pd.Series:
        """计算简单移动平均"""
        return series.rolling(window=period, min_periods=period).mean()
    
    def _adjust_leverage(self, pnl: float):
        """
        根据上一笔交易盈亏动态调整杠杆
        
        Args:
            pnl: 上一笔交易盈亏金额
        """
        if not self.use_dynamic_leverage:
            return
        
        old_leverage = self.leverage
        
        if pnl > 0:
            # 盈利：增加杠杆
            self.leverage = min(self.leverage + self.leverage_step, self.max_leverage)
            self.consecutive_wins += 1
            self.consecutive_losses = 0
            logger.info(f"✓ 盈利 +{pnl:.2f} USDT，杠杆提升: {old_leverage:.1f}x → {self.leverage:.1f}x (连胜{self.consecutive_wins})")
        else:
            # 亏损：降低杠杆
            self.leverage = max(self.leverage - self.leverage_step, self.min_leverage)
            self.consecutive_losses += 1
            self.consecutive_wins = 0
            logger.info(f"✗ 亏损 {pnl:.2f} USDT，杠杆降低: {old_leverage:.1f}x → {self.leverage:.1f}x (连亏{self.consecutive_losses})")
        
        # 连续亏损保护：连续亏损3次，杠杆降到最低
        if self.consecutive_losses >= 3:
            self.leverage = self.min_leverage
            logger.warning(f"⚠️  连续亏损{self.consecutive_losses}次，杠杆降至最低: {self.leverage:.1f}x")
    
    def analyze(self, klines: List[Dict]) -> Optional[Dict[str, Any]]:
        """
        分析当前市场状态并生成交易信号
        
        Args:
            klines: K线数据列表
            
        Returns:
            交易信号或None
        """
        if len(klines) < max(self.rsi_period + 1, self.trend_period):
            return None
        
        # 转换为DataFrame
        df = pd.DataFrame(klines)
        
        # 计算RSI
        df['rsi'] = self.calculate_rsi(df['close'])
        
        # 计算趋势（如果启用）
        if self.use_trend_filter:
            df['trend_ma'] = self.calculate_sma(df['close'], self.trend_period)
        
        # 获取最新数据
        current = df.iloc[-1]
        prev = df.iloc[-2] if len(df) > 1 else None
        
        price = current['close']
        rsi = current['rsi']
        
        # 如果RSI为NaN，返回None
        if pd.isna(rsi):
            return None
        
        # 趋势判断
        if self.use_trend_filter:
            trend_ma = current['trend_ma']
            if pd.isna(trend_ma):
                return None
            is_uptrend = price > trend_ma
            is_downtrend = price < trend_ma
        else:
            is_uptrend = True
            is_downtrend = True
        
        # 如果有持仓，检查出场信号
        if self.current_position is not None:
            exit_signal = self._check_exit(current, df)
            if exit_signal:
                return exit_signal
            return None
        
        # 检查入场信号
        return self._check_entry(current, prev, is_uptrend, is_downtrend, rsi)
    
    def _check_entry(self, current: pd.Series, prev: Optional[pd.Series], 
                     is_uptrend: bool, is_downtrend: bool, rsi: float) -> Optional[Dict[str, Any]]:
        """
        检查入场信号
        
        Args:
            current: 当前K线数据
            prev: 前一根K线数据
            is_uptrend: 是否上升趋势
            is_downtrend: 是否下降趋势
            rsi: 当前RSI值
            
        Returns:
            入场信号或None
        """
        price = current['close']
        timestamp = current.get('timestamp', datetime.now())
        
        # 做多信号：RSI < 10（极度超卖）且处于上升趋势
        if rsi < self.oversold_threshold and is_uptrend:
            # 计算仓位
            position_value = self.capital * self.position_size * self.leverage
            position_size = position_value / price
            
            # 计算止损止盈
            self.entry_price = price
            self.entry_time = timestamp
            self.stop_loss_price = price * (1 - self.stop_loss_pct)
            self.take_profit_price = price * (1 + self.take_profit_pct)
            
            # 初始化移动止损追踪价格
            if self.use_trailing_stop:
                self.highest_price = price
                self.lowest_price = None
            
            logger.info(f"✓ 做多信号: RSI极度超卖")
            logger.info(f"  价格: {price:.2f}")
            logger.info(f"  RSI: {rsi:.2f}")
            logger.info(f"  止损: {self.stop_loss_price:.2f} (-{self.stop_loss_pct * 100}%)")
            logger.info(f"  止盈: {self.take_profit_price:.2f} (+{self.take_profit_pct * 100}%)")
            
            return {
                'signal': 'buy',
                'price': price,
                'amount': position_size,
                'leverage': self.leverage,
                'timestamp': timestamp,
                'reason': 'rsi_oversold',
                'rsi': rsi,
                'stop_loss': self.stop_loss_price,
                'take_profit': self.take_profit_price
            }
        
        # 做空信号：RSI > 90（极度超买）且处于下降趋势
        if self.allow_short and rsi > self.overbought_threshold and is_downtrend:
            # 计算仓位
            position_value = self.capital * self.position_size * self.leverage
            position_size = position_value / price
            
            # 计算止损止盈
            self.entry_price = price
            self.entry_time = timestamp
            self.stop_loss_price = price * (1 + self.stop_loss_pct)
            self.take_profit_price = price * (1 - self.take_profit_pct)
            
            # 初始化移动止损追踪价格
            if self.use_trailing_stop:
                self.highest_price = None
                self.lowest_price = price
            
            logger.info(f"✓ 做空信号: RSI极度超买")
            logger.info(f"  价格: {price:.2f}")
            logger.info(f"  RSI: {rsi:.2f}")
            logger.info(f"  止损: {self.stop_loss_price:.2f} (+{self.stop_loss_pct * 100}%)")
            logger.info(f"  止盈: {self.take_profit_price:.2f} (-{self.take_profit_pct * 100}%)")
            
            return {
                'signal': 'sell',
                'price': price,
                'amount': position_size,
                'leverage': self.leverage,
                'timestamp': timestamp,
                'reason': 'rsi_overbought',
                'rsi': rsi,
                'stop_loss': self.stop_loss_price,
                'take_profit': self.take_profit_price
            }
        
        return None
    
    def _check_exit(self, current: pd.Series, df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """
        检查出场信号
        
        Args:
            current: 当前K线数据
            df: 完整的K线DataFrame
            
        Returns:
            出场信号或None
        """
        if self.current_position is None:
            return None
        
        price = current['close']
        rsi = current['rsi']
        timestamp = current.get('timestamp', datetime.now())
        side = self.current_position['side']
        
        # 计算持仓时间（天数）
        if isinstance(self.entry_time, datetime) and isinstance(timestamp, datetime):
            holding_days = (timestamp - self.entry_time).days
        else:
            holding_days = 0
        
        # 做多持仓
        if side == 'long':
            # 更新最高价（用于移动止损）
            if self.use_trailing_stop and (self.highest_price is None or price > self.highest_price):
                self.highest_price = price
            
            # 移动止损
            if self.use_trailing_stop and self.highest_price:
                # 计算当前盈利
                profit_pct = (self.highest_price - self.entry_price) / self.entry_price
                
                # 如果盈利超过启动条件，启用移动止损
                if profit_pct >= self.trailing_stop_activation:
                    trailing_stop_price = self.highest_price * (1 - self.trailing_stop_distance)
                    
                    # 移动止损价格高于固定止损价格时，使用移动止损
                    if trailing_stop_price > self.stop_loss_price:
                        if price <= trailing_stop_price:
                            pnl_pct = (price - self.entry_price) / self.entry_price * 100
                            logger.info(f"📍 移动止损触发: +{pnl_pct:.2f}% (最高{self.highest_price:.2f})")
                            return self._create_exit_signal('trailing_stop', price, timestamp)
            
            # 止盈
            if price >= self.take_profit_price:
                pnl_pct = (price - self.entry_price) / self.entry_price * 100
                logger.info(f"✓ 止盈: +{pnl_pct:.2f}%")
                return self._create_exit_signal('take_profit', price, timestamp)
            
            # 固定止损
            if price <= self.stop_loss_price:
                pnl_pct = (price - self.entry_price) / self.entry_price * 100
                logger.info(f"✗ 止损: {pnl_pct:.2f}%")
                return self._create_exit_signal('stop_loss', price, timestamp)
            
            # RSI回到中轴
            if not pd.isna(rsi) and rsi >= self.exit_threshold:
                pnl_pct = (price - self.entry_price) / self.entry_price * 100
                logger.info(f"→ RSI回归中轴: {pnl_pct:.2f}%")
                return self._create_exit_signal('rsi_exit', price, timestamp)
            
            # 时间止损
            if holding_days >= self.max_holding_days:
                pnl_pct = (price - self.entry_price) / self.entry_price * 100
                logger.info(f"⏰ 时间止损: {pnl_pct:.2f}% (持仓{holding_days}天)")
                return self._create_exit_signal('time_exit', price, timestamp)
        
        # 做空持仓
        elif side == 'short':
            # 更新最低价（用于移动止损）
            if self.use_trailing_stop and (self.lowest_price is None or price < self.lowest_price):
                self.lowest_price = price
            
            # 移动止损
            if self.use_trailing_stop and self.lowest_price:
                # 计算当前盈利
                profit_pct = (self.entry_price - self.lowest_price) / self.entry_price
                
                # 如果盈利超过启动条件，启用移动止损
                if profit_pct >= self.trailing_stop_activation:
                    trailing_stop_price = self.lowest_price * (1 + self.trailing_stop_distance)
                    
                    # 移动止损价格低于固定止损价格时，使用移动止损
                    if trailing_stop_price < self.stop_loss_price:
                        if price >= trailing_stop_price:
                            pnl_pct = (self.entry_price - price) / self.entry_price * 100
                            logger.info(f"📍 移动止损触发: +{pnl_pct:.2f}% (最低{self.lowest_price:.2f})")
                            return self._create_exit_signal('trailing_stop', price, timestamp)
            
            # 止盈
            if price <= self.take_profit_price:
                pnl_pct = (self.entry_price - price) / self.entry_price * 100
                logger.info(f"✓ 止盈: +{pnl_pct:.2f}%")
                return self._create_exit_signal('take_profit', price, timestamp)
            
            # 固定止损
            if price >= self.stop_loss_price:
                pnl_pct = (self.entry_price - price) / self.entry_price * 100
                logger.info(f"✗ 止损: {pnl_pct:.2f}%")
                return self._create_exit_signal('stop_loss', price, timestamp)
            
            # RSI回到中轴
            if not pd.isna(rsi) and rsi <= self.exit_threshold:
                pnl_pct = (self.entry_price - price) / self.entry_price * 100
                logger.info(f"→ RSI回归中轴: {pnl_pct:.2f}%")
                return self._create_exit_signal('rsi_exit', price, timestamp)
            
            # 时间止损
            if holding_days >= self.max_holding_days:
                pnl_pct = (self.entry_price - price) / self.entry_price * 100
                logger.info(f"⏰ 时间止损: {pnl_pct:.2f}% (持仓{holding_days}天)")
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
            self.highest_price = None
            self.lowest_price = None
    
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
        elif trade.get('type') in ['stop_loss', 'take_profit', 'rsi_exit', 'time_exit', 'trailing_stop']:
            pnl = trade.get('pnl_amount', 0)
            if pnl > 0:
                self.winning_trades += 1
            
            # 动态调整杠杆
            self._adjust_leverage(pnl)
            self.last_trade_pnl = pnl
    
    def get_stats(self) -> Dict[str, Any]:
        """获取策略统计信息"""
        win_rate = self.winning_trades / self.total_trades if self.total_trades > 0 else 0
        return {
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'win_rate': win_rate
        }
