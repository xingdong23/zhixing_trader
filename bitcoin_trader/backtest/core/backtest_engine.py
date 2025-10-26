"""
回测引擎 - 优雅地模拟交易执行
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class BacktestEngine:
    """回测引擎"""
    
    def __init__(self, strategy, initial_capital: float = 300.0, 
                 taker_fee_rate: float = 0.0005, maker_fee_rate: float = 0.0002):
        """
        初始化回测引擎
        
        Args:
            strategy: 交易策略实例
            initial_capital: 初始资金
            taker_fee_rate: Taker手续费率（吃单，默认0.05%）
            maker_fee_rate: Maker手续费率（挂单，默认0.02%）
        """
        self.strategy = strategy
        self.initial_capital = initial_capital
        self.current_capital = initial_capital
        
        # 手续费设置（欧易Lv1费率）
        self.taker_fee_rate = taker_fee_rate
        self.maker_fee_rate = maker_fee_rate
        self.total_fees = 0.0  # 累计手续费
        
        # 交易记录
        self.trades: List[Dict] = []
        self.positions: List[Dict] = []
        self.equity_curve: List[Dict] = []
        
        # 统计
        self.total_trades = 0
        self.winning_trades = 0
        self.losing_trades = 0
        
    def run(self, klines: List[Dict], window_size: int = 200) -> Dict[str, Any]:
        """
        运行回测
        
        Args:
            klines: K线数据列表
            window_size: 滑动窗口大小（策略需要的最小K线数量）
            
        Returns:
            回测结果字典
        """
        logger.info("="*60)
        logger.info("开始回测")
        logger.info(f"初始资金: {self.initial_capital} USDT")
        logger.info(f"K线数量: {len(klines)}")
        logger.info(f"时间范围: {klines[0]['timestamp']} ~ {klines[-1]['timestamp']}")
        logger.info("="*60)
        
        # 滑动窗口遍历K线
        last_date = None
        for i in range(window_size, len(klines)):
            current_klines = klines[i-window_size:i+1]
            current_time = current_klines[-1]['timestamp']
            current_price = current_klines[-1]['close']
            
            # 检查是否是新的一天，如果是则重置每日统计
            current_date = current_time.date()
            if last_date is not None and current_date != last_date:
                if hasattr(self.strategy, 'reset_daily_stats'):
                    self.strategy.reset_daily_stats()
            last_date = current_date
            
            # 运行策略分析
            signal = self.strategy.analyze(current_klines)
            
            # 记录权益曲线
            self.equity_curve.append({
                'timestamp': current_time,
                'equity': self.current_capital,
                'price': current_price
            })
            
            # 处理交易信号
            if signal['signal'] in ['buy', 'sell']:
                self._execute_signal(signal, current_time, current_price)
            
            # 每100根K线打印一次进度
            if i % 100 == 0:
                progress = (i / len(klines)) * 100
                logger.info(f"回测进度: {progress:.1f}% | 当前资金: {self.current_capital:.2f} USDT")
        
        # 如果有未平仓持仓，强制平仓
        if self.strategy.current_position:
            self._force_close_position(klines[-1]['timestamp'], klines[-1]['close'])
        
        logger.info("="*60)
        logger.info("回测完成")
        logger.info("="*60)
        
        return self._generate_report()
    
    def _execute_signal(self, signal: Dict, timestamp: datetime, current_price: float):
        """执行交易信号"""
        signal_type = signal.get('type', 'entry')
        
        if signal_type in ['entry', None] and signal['signal'] in ['buy', 'sell']:
            # 开仓
            self._open_position(signal, timestamp)
            
        elif signal_type in ['stop_loss', 'take_profit', 'timeout', 'accelerated_exit', 'partial_close']:
            # 平仓
            self._close_position(signal, timestamp, current_price)
    
    def _open_position(self, signal: Dict, timestamp: datetime):
        """开仓"""
        side = 'long' if signal['signal'] == 'buy' else 'short'
        entry_price = signal['price']
        amount = signal['amount']
        
        # 计算开仓成本（考虑杠杆）
        leverage = signal.get('leverage', 1.0)
        position_value = entry_price * amount
        margin_required = position_value / leverage
        
        if margin_required > self.current_capital:
            logger.warning(f"资金不足，无法开仓。需要: {margin_required:.2f}, 可用: {self.current_capital:.2f}")
            return
        
        # 计算开仓手续费（按Taker费率，市价单立即成交）
        # 手续费 = 合约价值 × 费率
        open_fee = position_value * self.taker_fee_rate
        self.current_capital -= open_fee
        self.total_fees += open_fee
        
        # 创建持仓记录
        position = {
            'side': side,
            'entry_price': entry_price,
            'amount': amount,
            'entry_time': timestamp,
            'margin': margin_required,
            'leverage': leverage,
            'open_fee': open_fee  # 记录开仓手续费
        }
        
        self.positions.append(position)
        self.strategy.update_position(signal)
        
        logger.info(f"📈 开仓 {side.upper()}: 价格={entry_price:.2f}, 数量={amount:.4f}, 保证金={margin_required:.2f}")
    
    def _close_position(self, signal: Dict, timestamp: datetime, current_price: float):
        """平仓"""
        if not self.positions:
            return
        
        position = self.positions[-1]
        exit_price = signal.get('price', current_price)
        exit_type = signal.get('type', 'manual')
        
        # 计算盈亏
        if position['side'] == 'long':
            pnl_ratio = (exit_price - position['entry_price']) / position['entry_price']
        else:
            pnl_ratio = (position['entry_price'] - exit_price) / position['entry_price']
        
        pnl_amount = pnl_ratio * position['entry_price'] * position['amount']
        
        # 计算平仓手续费（按Taker费率）
        close_value = exit_price * position['amount']
        close_fee = close_value * self.taker_fee_rate
        
        # 更新资金：盈亏 - 平仓手续费
        self.current_capital += pnl_amount - close_fee
        self.total_fees += close_fee
        
        # 实际净盈亏（扣除开仓和平仓手续费）
        net_pnl = pnl_amount - position.get('open_fee', 0) - close_fee
        
        # 通知策略更新资金（用于复利计算）
        if hasattr(self.strategy, 'update_capital'):
            self.strategy.update_capital(self.current_capital)
        
        # 记录交易
        trade = {
            'entry_time': position['entry_time'],
            'exit_time': timestamp,
            'side': position['side'],
            'entry_price': position['entry_price'],
            'exit_price': exit_price,
            'amount': position['amount'],
            'pnl_ratio': pnl_ratio,
            'pnl_amount': pnl_amount,
            'open_fee': position.get('open_fee', 0),
            'close_fee': close_fee,
            'net_pnl': net_pnl,
            'exit_type': exit_type,
            'holding_time': (timestamp - position['entry_time']).total_seconds() / 60,
        }
        
        self.trades.append(trade)
        self.total_trades += 1
        
        if pnl_amount > 0:
            self.winning_trades += 1
        else:
            self.losing_trades += 1
        
        # 更新策略状态
        self.strategy.update_position(signal)
        self.strategy.record_trade(signal)
        
        logger.info(f"📉 平仓 {position['side'].upper()}: "
                   f"入场={position['entry_price']:.2f}, 出场={exit_price:.2f}, "
                   f"盈亏={pnl_amount:+.2f} ({pnl_ratio:+.2%}), "
                   f"类型={exit_type}")
    
    def _force_close_position(self, timestamp: datetime, current_price: float):
        """强制平仓"""
        logger.warning("回测结束，强制平仓未平仓持仓")
        
        signal = {
            'signal': 'sell' if self.strategy.current_position['side'] == 'long' else 'buy',
            'price': current_price,
            'type': 'force_close',
            'amount': self.strategy.current_position['amount']
        }
        
        self._close_position(signal, timestamp, current_price)
    
    def _generate_report(self) -> Dict[str, Any]:
        """生成回测报告"""
        if not self.trades:
            return {
                'summary': {
                    'initial_capital': self.initial_capital,
                    'final_capital': self.current_capital,
                    'total_pnl': 0,
                    'total_return': 0,
                    'total_trades': 0,
                    'winning_trades': 0,
                    'losing_trades': 0,
                    'win_rate': 0,
                    'avg_win': 0,
                    'avg_loss': 0,
                    'profit_factor': 0,
                    'max_drawdown': 0,
                    'avg_holding_time': 0,
                    'message': '没有产生任何交易'
                },
                'trades': [],
                'equity_curve': self.equity_curve,
            }
        
        # 计算统计指标
        total_pnl = self.current_capital - self.initial_capital
        total_return = (total_pnl / self.initial_capital) * 100
        
        win_rate = (self.winning_trades / self.total_trades * 100) if self.total_trades > 0 else 0
        
        # 计算平均盈亏
        winning_pnls = [t['pnl_amount'] for t in self.trades if t['pnl_amount'] > 0]
        losing_pnls = [t['pnl_amount'] for t in self.trades if t['pnl_amount'] < 0]
        
        avg_win = sum(winning_pnls) / len(winning_pnls) if winning_pnls else 0
        avg_loss = sum(losing_pnls) / len(losing_pnls) if losing_pnls else 0
        
        # 盈亏比
        profit_factor = abs(avg_win / avg_loss) if avg_loss != 0 else 0
        
        # 最大回撤
        max_drawdown = self._calculate_max_drawdown()
        
        # 平均持仓时间
        avg_holding_time = sum(t['holding_time'] for t in self.trades) / len(self.trades)
        
        return {
            'summary': {
                'initial_capital': self.initial_capital,
                'final_capital': self.current_capital,
                'total_pnl': total_pnl,
                'total_return': total_return,
                'total_fees': self.total_fees,
                'fee_ratio': (self.total_fees / self.initial_capital * 100) if self.initial_capital > 0 else 0,
                'total_trades': self.total_trades,
                'winning_trades': self.winning_trades,
                'losing_trades': self.losing_trades,
                'win_rate': win_rate,
                'avg_win': avg_win,
                'avg_loss': avg_loss,
                'profit_factor': profit_factor,
                'max_drawdown': max_drawdown,
                'avg_holding_time': avg_holding_time,
            },
            'trades': self.trades,
            'equity_curve': self.equity_curve,
        }
    
    def _calculate_max_drawdown(self) -> float:
        """计算最大回撤"""
        if not self.equity_curve:
            return 0.0
        
        peak = self.initial_capital
        max_dd = 0.0
        
        for point in self.equity_curve:
            equity = point['equity']
            if equity > peak:
                peak = equity
            
            drawdown = (peak - equity) / peak
            if drawdown > max_dd:
                max_dd = drawdown
        
        return max_dd * 100
