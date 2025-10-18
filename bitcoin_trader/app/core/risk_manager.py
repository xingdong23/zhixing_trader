"""
风险管理模块 - 资金管理和风险控制
"""
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class RiskLimits:
    """风险限制配置"""
    # 仓位限制
    max_position_size: float = 1.0  # 单笔最大仓位（BTC）
    max_position_value: float = 10000.0  # 单笔最大价值（USDT）
    max_total_position: float = 0.3  # 最大总仓位占比
    
    # 亏损限制
    max_daily_loss: float = 0.03  # 单日最大亏损比例（3%）
    max_weekly_loss: float = 0.10  # 单周最大亏损比例（10%）
    max_single_loss: float = 0.01  # 单笔最大亏损比例（1%）
    
    # 交易频率限制
    max_trades_per_day: int = 20  # 每日最大交易次数
    max_trades_per_hour: int = 5  # 每小时最大交易次数
    min_trade_interval: int = 60  # 最小交易间隔（秒）
    
    # 连续亏损限制
    max_consecutive_losses: int = 3  # 最大连续亏损次数
    cooldown_after_losses: int = 3600  # 连续亏损后冷却时间（秒）
    
    # 杠杆限制
    max_leverage: float = 3.0  # 最大杠杆倍数
    
    # 滑点限制
    max_slippage: float = 0.001  # 最大滑点（0.1%）


class RiskManager:
    """
    风险管理器
    
    功能：
    1. 仓位管理
    2. 资金管理
    3. 风险限制检查
    4. 交易频率控制
    """
    
    def __init__(self, initial_capital: float, limits: Optional[RiskLimits] = None):
        """
        初始化风险管理器
        
        Args:
            initial_capital: 初始资金
            limits: 风险限制配置
        """
        self.initial_capital = initial_capital
        self.current_capital = initial_capital
        self.limits = limits or RiskLimits()
        
        # 交易记录
        self.trade_history: List[Dict] = []
        self.daily_trades: List[Dict] = []
        self.hourly_trades: List[Dict] = []
        
        # 盈亏统计
        self.daily_pnl = 0.0
        self.weekly_pnl = 0.0
        self.total_pnl = 0.0
        
        # 连续亏损追踪
        self.consecutive_losses = 0
        self.last_loss_time: Optional[datetime] = None
        self.in_cooldown = False
        
        # 最后交易时间
        self.last_trade_time: Optional[datetime] = None
        
        # 当前持仓
        self.current_positions: Dict[str, Dict] = {}
        
        logger.info(f"风险管理器初始化: 初始资金={initial_capital}")
    
    def check_trade_allowed(self, symbol: str, side: str, amount: float, 
                           price: float) -> tuple[bool, str]:
        """
        检查是否允许交易
        
        Args:
            symbol: 交易对
            side: 买入或卖出
            amount: 数量
            price: 价格
        
        Returns:
            (是否允许, 原因)
        """
        # 1. 检查冷却期
        if self.in_cooldown:
            if self.last_loss_time:
                cooldown_end = self.last_loss_time + timedelta(
                    seconds=self.limits.cooldown_after_losses
                )
                if datetime.now() < cooldown_end:
                    remaining = (cooldown_end - datetime.now()).seconds
                    return False, f"冷却期中，剩余 {remaining} 秒"
                else:
                    self.in_cooldown = False
                    self.consecutive_losses = 0
        
        # 2. 检查交易间隔
        if self.last_trade_time:
            elapsed = (datetime.now() - self.last_trade_time).seconds
            if elapsed < self.limits.min_trade_interval:
                return False, f"交易间隔过短，需等待 {self.limits.min_trade_interval - elapsed} 秒"
        
        # 3. 检查交易频率
        self._update_trade_counters()
        
        if len(self.daily_trades) >= self.limits.max_trades_per_day:
            return False, f"超过每日交易次数限制 ({self.limits.max_trades_per_day})"
        
        if len(self.hourly_trades) >= self.limits.max_trades_per_hour:
            return False, f"超过每小时交易次数限制 ({self.limits.max_trades_per_hour})"
        
        # 4. 检查仓位限制
        position_value = amount * price
        
        if amount > self.limits.max_position_size:
            return False, f"超过单笔最大仓位 ({self.limits.max_position_size} BTC)"
        
        if position_value > self.limits.max_position_value:
            return False, f"超过单笔最大价值 ({self.limits.max_position_value} USDT)"
        
        # 5. 检查总仓位占比
        total_position_value = self._calculate_total_position_value()
        if side == 'buy':
            new_total = total_position_value + position_value
            if new_total > self.current_capital * self.limits.max_total_position:
                return False, f"超过最大总仓位占比 ({self.limits.max_total_position:.0%})"
        
        # 6. 检查亏损限制
        if self.daily_pnl < -self.current_capital * self.limits.max_daily_loss:
            return False, f"超过单日最大亏损限制 ({self.limits.max_daily_loss:.0%})"
        
        if self.weekly_pnl < -self.current_capital * self.limits.max_weekly_loss:
            return False, f"超过单周最大亏损限制 ({self.limits.max_weekly_loss:.0%})"
        
        # 7. 检查资金充足性
        if side == 'buy':
            required_capital = position_value
            available = self.current_capital - total_position_value
            if required_capital > available:
                return False, f"资金不足，需要 {required_capital:.2f}，可用 {available:.2f}"
        
        return True, "通过风险检查"
    
    def calculate_position_size(self, symbol: str, entry_price: float, 
                               stop_loss: float, risk_percent: float = 0.01) -> float:
        """
        根据风险计算仓位大小
        
        使用固定风险百分比法：
        仓位大小 = (账户资金 × 风险百分比) / (入场价 - 止损价)
        
        Args:
            symbol: 交易对
            entry_price: 入场价格
            stop_loss: 止损价格
            risk_percent: 风险百分比（默认1%）
        
        Returns:
            建议仓位大小
        """
        # 计算每单位的风险
        risk_per_unit = abs(entry_price - stop_loss)
        
        if risk_per_unit == 0:
            logger.warning("止损价格与入场价格相同，无法计算仓位")
            return 0.0
        
        # 计算风险金额
        risk_amount = self.current_capital * min(risk_percent, self.limits.max_single_loss)
        
        # 计算仓位大小
        position_size = risk_amount / risk_per_unit
        
        # 应用限制
        position_size = min(position_size, self.limits.max_position_size)
        
        # 检查价值限制
        position_value = position_size * entry_price
        if position_value > self.limits.max_position_value:
            position_size = self.limits.max_position_value / entry_price
        
        logger.info(f"计算仓位: 风险={risk_percent:.2%}, 仓位={position_size:.4f}")
        
        return position_size
    
    def calculate_stop_loss(self, entry_price: float, side: str, 
                           atr: Optional[float] = None, 
                           percent: float = 0.02) -> float:
        """
        计算止损价格
        
        Args:
            entry_price: 入场价格
            side: 'long' 或 'short'
            atr: ATR值（可选）
            percent: 止损百分比（默认2%）
        
        Returns:
            止损价格
        """
        if atr:
            # 基于ATR的止损
            multiplier = 1.5
            if side == 'long':
                stop_loss = entry_price - atr * multiplier
            else:
                stop_loss = entry_price + atr * multiplier
        else:
            # 基于百分比的止损
            if side == 'long':
                stop_loss = entry_price * (1 - percent)
            else:
                stop_loss = entry_price * (1 + percent)
        
        return stop_loss
    
    def calculate_take_profit(self, entry_price: float, stop_loss: float, 
                             side: str, risk_reward_ratio: float = 2.0) -> float:
        """
        计算止盈价格
        
        Args:
            entry_price: 入场价格
            stop_loss: 止损价格
            side: 'long' 或 'short'
            risk_reward_ratio: 风险收益比（默认1:2）
        
        Returns:
            止盈价格
        """
        risk = abs(entry_price - stop_loss)
        reward = risk * risk_reward_ratio
        
        if side == 'long':
            take_profit = entry_price + reward
        else:
            take_profit = entry_price - reward
        
        return take_profit
    
    def record_trade(self, trade: Dict[str, Any]):
        """
        记录交易
        
        Args:
            trade: 交易信息，包含 symbol, side, amount, price, pnl 等
        """
        trade['timestamp'] = datetime.now()
        
        # 添加到历史记录
        self.trade_history.append(trade)
        self.daily_trades.append(trade)
        self.hourly_trades.append(trade)
        
        # 更新盈亏
        pnl = trade.get('pnl', 0)
        self.daily_pnl += pnl
        self.weekly_pnl += pnl
        self.total_pnl += pnl
        self.current_capital += pnl
        
        # 更新连续亏损
        if pnl < 0:
            self.consecutive_losses += 1
            self.last_loss_time = datetime.now()
            
            # 检查是否需要进入冷却期
            if self.consecutive_losses >= self.limits.max_consecutive_losses:
                self.in_cooldown = True
                logger.warning(f"连续亏损 {self.consecutive_losses} 次，进入冷却期")
        else:
            self.consecutive_losses = 0
            self.in_cooldown = False
        
        # 更新最后交易时间
        self.last_trade_time = datetime.now()
        
        logger.info(f"记录交易: {trade['symbol']} {trade['side']}, "
                   f"盈亏={pnl:.2f}, 账户={self.current_capital:.2f}")
    
    def update_position(self, symbol: str, position: Dict[str, Any]):
        """
        更新持仓信息
        
        Args:
            symbol: 交易对
            position: 持仓信息
        """
        if position.get('size', 0) > 0:
            self.current_positions[symbol] = position
        else:
            # 平仓
            if symbol in self.current_positions:
                del self.current_positions[symbol]
    
    def _calculate_total_position_value(self) -> float:
        """计算总持仓价值"""
        total = 0.0
        for position in self.current_positions.values():
            total += position.get('size', 0) * position.get('entry_price', 0)
        return total
    
    def _update_trade_counters(self):
        """更新交易计数器"""
        now = datetime.now()
        
        # 清理过期的每日交易记录
        self.daily_trades = [
            t for t in self.daily_trades 
            if (now - t['timestamp']).days < 1
        ]
        
        # 清理过期的每小时交易记录
        self.hourly_trades = [
            t for t in self.hourly_trades 
            if (now - t['timestamp']).seconds < 3600
        ]
    
    def reset_daily_stats(self):
        """重置每日统计"""
        logger.info(f"重置每日统计: 今日盈亏={self.daily_pnl:.2f}")
        self.daily_pnl = 0.0
        self.daily_trades.clear()
    
    def reset_weekly_stats(self):
        """重置每周统计"""
        logger.info(f"重置每周统计: 本周盈亏={self.weekly_pnl:.2f}")
        self.weekly_pnl = 0.0
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取风险统计信息"""
        total_position_value = self._calculate_total_position_value()
        position_ratio = total_position_value / self.current_capital if self.current_capital > 0 else 0
        
        # 计算胜率
        winning_trades = sum(1 for t in self.trade_history if t.get('pnl', 0) > 0)
        total_trades = len(self.trade_history)
        win_rate = winning_trades / total_trades * 100 if total_trades > 0 else 0
        
        # 计算收益率
        total_return = (self.current_capital - self.initial_capital) / self.initial_capital
        
        return {
            'capital': {
                'initial': self.initial_capital,
                'current': self.current_capital,
                'total_pnl': self.total_pnl,
                'total_return': total_return
            },
            'positions': {
                'count': len(self.current_positions),
                'total_value': total_position_value,
                'position_ratio': position_ratio
            },
            'pnl': {
                'daily': self.daily_pnl,
                'weekly': self.weekly_pnl,
                'total': self.total_pnl
            },
            'trades': {
                'total': total_trades,
                'winning': winning_trades,
                'losing': total_trades - winning_trades,
                'win_rate': win_rate,
                'today': len(self.daily_trades),
                'this_hour': len(self.hourly_trades)
            },
            'risk': {
                'consecutive_losses': self.consecutive_losses,
                'in_cooldown': self.in_cooldown,
                'daily_loss_limit': self.limits.max_daily_loss,
                'daily_loss_used': abs(self.daily_pnl) / self.current_capital if self.daily_pnl < 0 else 0
            }
        }
    
    def get_risk_report(self) -> str:
        """生成风险报告"""
        stats = self.get_statistics()
        
        report = f"""
╔══════════════════════════════════════════════════════════════╗
║                        风险管理报告                          ║
╚══════════════════════════════════════════════════════════════╝

【资金状况】
  初始资金: {stats['capital']['initial']:,.2f} USDT
  当前资金: {stats['capital']['current']:,.2f} USDT
  总盈亏:   {stats['capital']['total_pnl']:+,.2f} USDT ({stats['capital']['total_return']:+.2%})

【持仓情况】
  持仓数量: {stats['positions']['count']}
  持仓价值: {stats['positions']['total_value']:,.2f} USDT
  仓位占比: {stats['positions']['position_ratio']:.2%}

【盈亏统计】
  今日盈亏: {stats['pnl']['daily']:+,.2f} USDT
  本周盈亏: {stats['pnl']['weekly']:+,.2f} USDT
  累计盈亏: {stats['pnl']['total']:+,.2f} USDT

【交易统计】
  总交易数: {stats['trades']['total']}
  盈利次数: {stats['trades']['winning']}
  亏损次数: {stats['trades']['losing']}
  胜率:     {stats['trades']['win_rate']:.1f}%
  今日交易: {stats['trades']['today']} / {self.limits.max_trades_per_day}
  本时交易: {stats['trades']['this_hour']} / {self.limits.max_trades_per_hour}

【风险状态】
  连续亏损: {stats['risk']['consecutive_losses']} / {self.limits.max_consecutive_losses}
  冷却状态: {'是' if stats['risk']['in_cooldown'] else '否'}
  日亏损率: {stats['risk']['daily_loss_used']:.2%} / {stats['risk']['daily_loss_limit']:.2%}

╚══════════════════════════════════════════════════════════════╝
        """
        
        return report
