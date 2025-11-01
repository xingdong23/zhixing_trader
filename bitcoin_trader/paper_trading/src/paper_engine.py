"""
模拟交易引擎
"""
import uuid
from datetime import datetime
from typing import Dict, Optional
from config import Config
from database import get_db
import logging

logger = logging.getLogger(__name__)


class PaperTradingEngine:
    """模拟交易引擎"""
    
    def __init__(self):
        self.db = get_db()
        self.symbol = Config.SYMBOL
        self.leverage = Config.LEVERAGE
        self.position_size = Config.POSITION_SIZE
        self.taker_fee = Config.TAKER_FEE
        
        # 初始化账户
        self._init_account()
        
        logger.info("✅ 模拟交易引擎初始化成功")
    
    def _init_account(self):
        """初始化账户"""
        balance = self.db.get_latest_balance()
        
        if not balance:
            # 首次运行，创建初始余额
            self.db.save_balance({
                'balance': Config.INITIAL_BALANCE,
                'available_balance': Config.INITIAL_BALANCE,
                'margin_used': 0,
                'unrealized_pnl': 0,
                'total_equity': Config.INITIAL_BALANCE,
                'total_pnl': 0,
                'total_pnl_percent': 0,
                'timestamp': datetime.now()
            })
            logger.info(f"✅ 初始化账户余额: {Config.INITIAL_BALANCE} USDT")
        else:
            logger.info(f"✅ 加载账户余额: {balance['total_equity']} USDT")
    
    def get_account_balance(self) -> Dict:
        """获取账户余额"""
        balance = self.db.get_latest_balance()
        if not balance:
            return {
                'balance': Config.INITIAL_BALANCE,
                'available_balance': Config.INITIAL_BALANCE,
                'total_equity': Config.INITIAL_BALANCE
            }
        return balance
    
    def execute_signal(self, signal: Dict, current_price: float) -> bool:
        """
        执行交易信号
        
        Args:
            signal: 交易信号
            current_price: 当前价格
        
        Returns:
            是否执行成功
        """
        try:
            signal_type = signal.get('signal')
            
            if signal_type == 'buy':
                return self._open_long(signal, current_price)
            elif signal_type == 'sell':
                return self._open_short(signal, current_price)
            elif signal_type == 'close':
                return self._close_position(signal, current_price)
            else:
                logger.warning(f"⚠️ 未知信号类型: {signal_type}")
                return False
            
        except Exception as e:
            logger.error(f"❌ 执行信号失败: {e}")
            return False
    
    def _open_long(self, signal: Dict, current_price: float) -> bool:
        """开多单"""
        # 检查是否已有持仓
        existing_position = self.db.get_position(self.symbol)
        if existing_position:
            logger.warning(f"⚠️ 已有持仓，无法开新仓")
            return False
        
        # 检查余额
        balance = self.get_account_balance()
        available = balance['available_balance']
        
        # 计算开仓金额
        position_value = available * self.position_size * self.leverage
        amount = position_value / current_price
        
        # 计算手续费
        fee = position_value * self.taker_fee
        
        # 计算保证金
        margin = position_value / self.leverage
        
        if margin + fee > available:
            logger.error(f"❌ 余额不足: 需要 {margin + fee:.2f}, 可用 {available:.2f}")
            return False
        
        # 创建订单
        order_id = f"LONG_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}"
        
        order = {
            'order_id': order_id,
            'symbol': self.symbol,
            'side': 'LONG',
            'type': 'ENTRY',
            'entry_price': current_price,
            'amount': amount,
            'stop_loss': signal.get('stop_loss'),
            'take_profit': signal.get('take_profit'),
            'status': 'OPEN',
            'entry_time': datetime.now()
        }
        
        self.db.save_order(order)
        
        # 创建持仓
        position = {
            'symbol': self.symbol,
            'order_id': order_id,
            'side': 'LONG',
            'entry_price': current_price,
            'amount': amount,
            'stop_loss': signal.get('stop_loss'),
            'take_profit': signal.get('take_profit'),
            'current_price': current_price,
            'unrealized_pnl': 0,
            'unrealized_pnl_percent': 0,
            'highest_price': current_price,
            'entry_time': datetime.now()
        }
        
        self.db.save_position(position)
        
        # 更新余额
        new_balance = available - margin - fee
        self.db.save_balance({
            'balance': balance['balance'],
            'available_balance': new_balance,
            'margin_used': margin,
            'unrealized_pnl': 0,
            'total_equity': balance['balance'],
            'total_pnl': balance.get('total_pnl', 0) - fee,
            'total_pnl_percent': (balance.get('total_pnl', 0) - fee) / Config.INITIAL_BALANCE * 100,
            'timestamp': datetime.now()
        })
        
        logger.info(f"✅ 开多单成功: {amount:.4f} @ {current_price:.2f}, 手续费 {fee:.2f}")
        return True
    
    def _open_short(self, signal: Dict, current_price: float) -> bool:
        """开空单（当前策略不使用）"""
        logger.info("⚠️ 当前策略只做多，忽略做空信号")
        return False
    
    def _close_position(self, signal: Dict, current_price: float) -> bool:
        """平仓"""
        position = self.db.get_position(self.symbol)
        if not position:
            logger.warning("⚠️ 没有持仓，无法平仓")
            return False
        
        # 获取订单
        order = self.db.get_open_order(self.symbol)
        if not order:
            logger.error("❌ 找不到对应的订单")
            return False
        
        # 计算盈亏
        entry_price = position['entry_price']
        amount = position['amount']
        side = position['side']
        
        if side == 'LONG':
            pnl_amount = (current_price - entry_price) * amount
            pnl_percent = (current_price - entry_price) / entry_price * 100
        else:
            pnl_amount = (entry_price - current_price) * amount
            pnl_percent = (entry_price - current_price) / entry_price * 100
        
        # 计算手续费
        position_value = current_price * amount
        fee = position_value * self.taker_fee
        
        # 净盈亏
        net_pnl = pnl_amount - fee
        
        # 更新订单
        exit_reason = signal.get('reason', 'MANUAL_CLOSE')
        self.db.update_order_close(
            order['order_id'],
            current_price,
            net_pnl,
            pnl_percent,
            fee,
            exit_reason
        )
        
        # 删除持仓
        self.db.delete_position(self.symbol)
        
        # 更新余额
        balance = self.get_account_balance()
        margin = position_value / self.leverage
        
        new_balance = balance['balance'] + net_pnl
        new_available = balance['available_balance'] + margin + net_pnl
        
        self.db.save_balance({
            'balance': new_balance,
            'available_balance': new_available,
            'margin_used': 0,
            'unrealized_pnl': 0,
            'total_equity': new_balance,
            'total_pnl': new_balance - Config.INITIAL_BALANCE,
            'total_pnl_percent': (new_balance - Config.INITIAL_BALANCE) / Config.INITIAL_BALANCE * 100,
            'timestamp': datetime.now()
        })
        
        logger.info(f"✅ 平仓成功: {exit_reason}, 盈亏 {net_pnl:+.2f} ({pnl_percent:+.2f}%)")
        return True
    
    def check_position(self, current_price: float) -> Optional[Dict]:
        """
        检查持仓状态（止损止盈）
        
        Args:
            current_price: 当前价格
        
        Returns:
            如果需要平仓，返回平仓信号
        """
        position = self.db.get_position(self.symbol)
        if not position:
            return None
        
        entry_price = position['entry_price']
        side = position['side']
        stop_loss = position.get('stop_loss')
        take_profit = position.get('take_profit')
        highest_price = position.get('highest_price', entry_price)
        
        # 更新最高价/最低价
        if side == 'LONG':
            if current_price > highest_price:
                highest_price = current_price
                position['highest_price'] = highest_price
                self.db.save_position(position)
            
            # 计算盈亏
            pnl_percent = (current_price - entry_price) / entry_price
            
            # 检查止损
            if stop_loss and current_price <= stop_loss:
                logger.info(f"⚠️ 触发止损: {current_price:.2f} <= {stop_loss:.2f}")
                return {
                    'signal': 'close',
                    'reason': 'stop_loss',
                    'price': current_price
                }
            
            # 检查止盈
            if take_profit and current_price >= take_profit:
                logger.info(f"✅ 触发止盈: {current_price:.2f} >= {take_profit:.2f}")
                return {
                    'signal': 'close',
                    'reason': 'take_profit',
                    'price': current_price
                }
        
        else:  # SHORT
            if current_price < highest_price:
                highest_price = current_price
                position['highest_price'] = highest_price
                self.db.save_position(position)
            
            pnl_percent = (entry_price - current_price) / entry_price
            
            # 检查止损
            if stop_loss and current_price >= stop_loss:
                logger.info(f"⚠️ 触发止损: {current_price:.2f} >= {stop_loss:.2f}")
                return {
                    'signal': 'close',
                    'reason': 'stop_loss',
                    'price': current_price
                }
            
            # 检查止盈
            if take_profit and current_price <= take_profit:
                logger.info(f"✅ 触发止盈: {current_price:.2f} <= {take_profit:.2f}")
                return {
                    'signal': 'close',
                    'reason': 'take_profit',
                    'price': current_price
                }
        
        # 更新持仓状态
        pnl_amount = (current_price - entry_price) * position['amount'] if side == 'LONG' \
                     else (entry_price - current_price) * position['amount']
        
        position['current_price'] = current_price
        position['unrealized_pnl'] = pnl_amount
        position['unrealized_pnl_percent'] = pnl_percent * 100
        
        self.db.save_position(position)
        
        # 更新余额的未实现盈亏
        balance = self.get_account_balance()
        self.db.save_balance({
            'balance': balance['balance'],
            'available_balance': balance['available_balance'],
            'margin_used': balance.get('margin_used', 0),
            'unrealized_pnl': pnl_amount,
            'total_equity': balance['balance'] + pnl_amount,
            'total_pnl': balance.get('total_pnl', 0),
            'total_pnl_percent': balance.get('total_pnl_percent', 0),
            'timestamp': datetime.now()
        })
        
        return None


# 单例模式
_engine_instance = None

def get_engine() -> PaperTradingEngine:
    """获取模拟交易引擎实例"""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = PaperTradingEngine()
    return _engine_instance
