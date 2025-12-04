from typing import Dict, Any, Optional, List
import pandas as pd
import numpy as np
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class LotteryScalpingStrategy:
    """
    彩票式超短线策略
    
    核心逻辑:
    - 100U本金,每次1U
    - 100倍杠杆,目标100倍收益
    - 100次尝试,成功1次即回本
    - 只要胜率>1%即可盈利
    
    风险控制:
    - 严格止损: 亏损100%立即平仓(1U归零)
    - 严格止盈: 盈利100%立即平仓(1U变100U)
    - 单次最大亏损: 1U
    - 每日最大亏损: 10U (连续止损10次暂停交易)
    """
    
    def __init__(self, parameters: Dict[str, Any]):
        self.name = "Lottery_Scalping"
        self.parameters = parameters
        
        # 资金管理
        self.total_capital = float(parameters.get('total_capital', 100.0))
        self.bet_per_trade = float(parameters.get('bet_per_trade', 1.0))  # 每次1U
        self.leverage = int(parameters.get('leverage', 100))
        
        # 止盈止损
        self.take_profit_pct = float(parameters.get('take_profit_pct', 1.0))  # 100%
        self.stop_loss_pct = float(parameters.get('stop_loss_pct', 1.0))      # 100%
        
        # 入场信号配置
        self.entry_method = parameters.get('entry_method', 'volatility_breakout')
        self.timeframe = parameters.get('timeframe', '1m')  # 1分钟K线
        self.volatility_threshold = float(parameters.get('volatility_threshold', 0.002))  # 0.2%波动触发
        
        # 风险控制
        self.max_daily_losses = int(parameters.get('max_daily_losses', 10))  # 单日最多亏10次
        self.cooldown_after_loss = int(parameters.get('cooldown_after_loss', 5))  # 亏损后冷静5根K线
        
        # 状态追踪
        self.current_position = None
        self.daily_loss_count = 0
        self.last_trade_date = None
        self.cooldown_counter = 0
        self.total_attempts = 0
        self.successful_trades = 0
        
        # 统计
        self.total_pnl = 0.0
        self.win_streak = 0
        self.max_win_streak = 0
        
        logger.info(f"✓ {self.name} 初始化完成")
        logger.info(f"  总资金: {self.total_capital}U")
        logger.info(f"  单次下注: {self.bet_per_trade}U")
        logger.info(f"  杠杆: {self.leverage}x")
        logger.info(f"  目标收益: {self.take_profit_pct * 100}%")
        logger.info(f"  止损: {self.stop_loss_pct * 100}%")
        logger.info(f"  入场方法: {self.entry_method}")
    
    def analyze(self, klines: List[Dict]) -> Optional[Dict[str, Any]]:
        """主分析逻辑"""
        if len(klines) < 20:
            return None
        
        df = pd.DataFrame(klines)
        current = df.iloc[-1]
        price = current['close']
        timestamp = current.get('timestamp', datetime.now())
        
        # 重置每日计数器
        self._reset_daily_stats(timestamp)
        
        # 冷却期检查
        if self.cooldown_counter > 0:
            self.cooldown_counter -= 1
            return None
        
        # 每日止损限制
        if self.daily_loss_count >= self.max_daily_losses:
            logger.warning(f"⛔ 今日已亏损{self.daily_loss_count}次,停止交易")
            return None
        
        # 持仓管理
        if self.current_position:
            return self._check_exit(df, price, timestamp)
        
        # 入场信号
        return self._check_entry(df, price, timestamp)
    
    def _reset_daily_stats(self, timestamp):
        """重置每日统计"""
        current_date = timestamp.date() if hasattr(timestamp, 'date') else datetime.now().date()
        
        if self.last_trade_date != current_date:
            logger.info(f"\n=== 新的一天 {current_date} ===")
            logger.info(f"昨日战绩: 亏损{self.daily_loss_count}次")
            self.daily_loss_count = 0
            self.last_trade_date = current_date
    
    def _check_entry(self, df: pd.DataFrame, price: float, timestamp) -> Optional[Dict]:
        """入场信号检测"""
        
        # 根据配置选择入场方法
        if self.entry_method == 'volatility_breakout':
            signal = self._volatility_breakout_signal(df)
        elif self.entry_method == 'momentum_spike':
            signal = self._momentum_spike_signal(df)
        elif self.entry_method == 'support_resistance':
            signal = self._support_resistance_signal(df)
        else:
            return None
        
        if signal is None:
            return None
        
        side = signal  # 'long' or 'short'
        
        # 计算仓位 (1U下注,100倍杠杆)
        amount = (self.bet_per_trade * self.leverage) / price
        
        # 计算止盈止损价格
        # 100倍杠杆下,价格波动1% = 100%盈亏
        # 目标: 盈利100% = 价格波动1%
        price_move_pct = self.take_profit_pct / self.leverage  # 1.0 / 100 = 0.01 = 1%
        
        if side == 'long':
            stop_loss = price * (1 - price_move_pct)
            take_profit = price * (1 + price_move_pct)
            
            return {
                'signal': 'buy',
                'price': price,
                'amount': amount,
                'stop_loss': stop_loss,
                'take_profit': take_profit,
                'leverage': self.leverage,
                'timestamp': timestamp,
                'reason': f'{self.entry_method}_long'
            }
        else:
            stop_loss = price * (1 + price_move_pct)
            take_profit = price * (1 - price_move_pct)
            
            return {
                'signal': 'sell',
                'price': price,
                'amount': amount,
                'stop_loss': stop_loss,
                'take_profit': take_profit,
                'leverage': self.leverage,
                'timestamp': timestamp,
                'reason': f'{self.entry_method}_short'
            }
    
    def _volatility_breakout_signal(self, df: pd.DataFrame) -> Optional[str]:
        """
        波动率突破入场
        
        逻辑: 
        - 价格快速突破上轨 → 做多
        - 价格快速跌破下轨 → 做空
        """
        if len(df) < 20:
            return None
        
        # 计算ATR (波动率)
        df['hl'] = df['high'] - df['low']
        df['atr'] = df['hl'].rolling(14).mean()
        
        current = df.iloc[-1]
        prev = df.iloc[-2]
        
        # 快速突破: 当前K线涨幅 > ATR
        price_change = (current['close'] - prev['close']) / prev['close']
        atr_pct = current['atr'] / current['close']
        
        # 降低阈值: 0.5倍ATR就触发 (原敥1.5倍)
        if price_change > atr_pct * 0.5:  # 涨幅超过0.5倍ATR
            return 'long'
        
        # 下跌突破
        elif price_change < -atr_pct * 0.5:
            return 'short'
        
        return None
    
    def _momentum_spike_signal(self, df: pd.DataFrame) -> Optional[str]:
        """
        动量尖峰入场
        
        逻辑: 
        - 成交量暴增 + 价格上涨 → 做多
        - 成交量暴增 + 价格下跌 → 做空
        """
        if len(df) < 20:
            return None
        
        df['volume_ma'] = df['volume'].rolling(10).mean()
        
        current = df.iloc[-1]
        prev = df.iloc[-2]
        
        # 成交量暴增 (超过均值3倍)
        volume_spike = current['volume'] > current['volume_ma'] * 3
        
        if not volume_spike:
            return None
        
        # 价格变化
        price_change_pct = (current['close'] - prev['close']) / prev['close']
        
        if price_change_pct > 0.003:  # 上涨0.3%
            return 'long'
        elif price_change_pct < -0.003:  # 下跌0.3%
            return 'short'
        
        return None
    
    def _support_resistance_signal(self, df: pd.DataFrame) -> Optional[str]:
        """
        支撑阻力突破
        
        逻辑:
        - 突破近期高点 → 做多
        - 跌破近期低点 → 做空
        """
        if len(df) < 20:
            return None
        
        lookback = 20
        recent = df.iloc[-lookback:-1]
        current = df.iloc[-1]
        
        resistance = recent['high'].max()
        support = recent['low'].min()
        
        # 突破阻力
        if current['close'] > resistance and current['close'] > current['open']:
            return 'long'
        
        # 跌破支撑
        elif current['close'] < support and current['close'] < current['open']:
            return 'short'
        
        return None
    
    def _check_exit(self, df: pd.DataFrame, price: float, timestamp) -> Optional[Dict]:
        """出场检查"""
        if not self.current_position:
            return None
        
        entry_price = self.current_position.get('entry_price', price)
        side = self.current_position['side']
        
        # 计算盈亏百分比
        if side == 'long':
            pnl_pct = (price - entry_price) / entry_price
        else:
            pnl_pct = (entry_price - price) / entry_price
        
        # 杠杆放大
        leveraged_pnl_pct = pnl_pct * self.leverage
        
        # 止盈: 盈利100%
        if leveraged_pnl_pct >= self.take_profit_pct:
            return {
                'signal': 'close',
                'price': price,
                'timestamp': timestamp,
                'reason': f'🎉 JACKPOT! 盈利{leveraged_pnl_pct:.1%}',
                'pnl_pct': leveraged_pnl_pct,
                'is_win': True
            }
        
        # 止损: 亏损100%
        if leveraged_pnl_pct <= -self.stop_loss_pct:
            return {
                'signal': 'close',
                'price': price,
                'timestamp': timestamp,
                'reason': f'❌ 止损 亏损{leveraged_pnl_pct:.1%}',
                'pnl_pct': leveraged_pnl_pct,
                'is_win': False
            }
        
        return None
    
    def update_position(self, signal: Dict[str, Any]):
        """更新持仓"""
        if signal['signal'] in ['buy', 'sell']:
            self.current_position = {
                'side': 'long' if signal['signal'] == 'buy' else 'short',
                'entry_price': signal['price'],
                'amount': signal['amount'],
                'timestamp': signal['timestamp']
            }
            self.total_attempts += 1
            logger.info(f"🎲 第{self.total_attempts}次尝试: {signal.get('reason', 'unknown')}")
        
        elif signal['signal'] == 'close':
            self._handle_close(signal)
            self.current_position = None
    
    def _handle_close(self, signal: Dict[str, Any]):
        """处理平仓逻辑"""
        pnl_pct = signal.get('pnl_pct', 0)
        is_win = signal.get('is_win', False)
        
        # 计算盈亏金额
        pnl_amount = self.bet_per_trade * pnl_pct
        self.total_pnl += pnl_amount
        remaining_capital = self.total_capital + self.total_pnl
        
        if is_win:
            self.successful_trades += 1
            self.win_streak += 1
            self.max_win_streak = max(self.max_win_streak, self.win_streak)
            
            logger.info("=" * 60)
            logger.info(f"🎊🎊🎊 恭喜! 中奖了! 🎊🎊🎊")
            logger.info(f"  盈利: {pnl_pct:.1%} (+{pnl_amount:.2f}U)")
            logger.info(f"  累计盈利: {self.total_pnl:+.2f}U")
            logger.info(f"  剩余资金: {remaining_capital:.2f}U")
            logger.info(f"  成功次数: {self.successful_trades}/{self.total_attempts}")
            logger.info(f"  胜率: {self.successful_trades/self.total_attempts*100:.1f}%")
            logger.info("=" * 60)
        else:
            self.daily_loss_count += 1
            self.win_streak = 0
            self.cooldown_counter = self.cooldown_after_loss
            
            logger.info(f"💀 平仓: {signal['reason']}")
            logger.info(f"  亏损: {pnl_pct:.1%} ({pnl_amount:+.2f}U)")
            logger.info(f"  累计盈亏: {self.total_pnl:+.2f}U")
            logger.info(f"  剩余资金: {remaining_capital:.2f}U")
            logger.info(f"  今日亏损: {self.daily_loss_count}/{self.max_daily_losses}")
            logger.info(f"  冷却: {self.cooldown_counter}根K线")
            logger.info(f"  成功率: {self.successful_trades}/{self.total_attempts} = {self.successful_trades/self.total_attempts*100:.1f}%")
    
    def on_trade(self, trade: Dict):
        """交易回调"""
        pass
    
    def record_trade(self, signal: Dict[str, Any]):
        """记录交易"""
        pass
    
    def get_stats(self):
        return {
            "total_capital": self.total_capital,
            "total_pnl": self.total_pnl,
            "remaining_capital": self.total_capital + self.total_pnl,
            "total_attempts": self.total_attempts,
            "successful_trades": self.successful_trades,
            "win_rate": self.successful_trades / max(self.total_attempts, 1) * 100,
            "daily_losses": self.daily_loss_count,
            "win_streak": self.win_streak,
            "max_win_streak": self.max_win_streak
        }
