"""
交易执行引擎 - 基于 ccxt 的自动化交易核心
"""
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum
import logging

import ccxt.async_support as ccxt_async

logger = logging.getLogger(__name__)


class OrderType(Enum):
    """订单类型"""
    MARKET = "market"
    LIMIT = "limit"
    STOP_LOSS = "stop_loss"
    TAKE_PROFIT = "take_profit"
    TRAILING_STOP = "trailing_stop"


class OrderSide(Enum):
    """订单方向"""
    BUY = "buy"
    SELL = "sell"


class OrderStatus(Enum):
    """订单状态"""
    PENDING = "pending"
    OPEN = "open"
    FILLED = "filled"
    PARTIALLY_FILLED = "partially_filled"
    CANCELED = "canceled"
    REJECTED = "rejected"
    EXPIRED = "expired"


class Position:
    """持仓信息"""
    
    def __init__(self, symbol: str, side: str, size: float, entry_price: float,
                 stop_loss: Optional[float] = None, take_profit: Optional[float] = None):
        self.symbol = symbol
        self.side = side  # 'long' or 'short'
        self.size = size
        self.entry_price = entry_price
        self.stop_loss = stop_loss
        self.take_profit = take_profit
        self.entry_time = datetime.now()
        self.unrealized_pnl = 0.0
        self.realized_pnl = 0.0
        
    def update_pnl(self, current_price: float):
        """更新未实现盈亏"""
        if self.side == 'long':
            self.unrealized_pnl = (current_price - self.entry_price) * self.size
        else:
            self.unrealized_pnl = (self.entry_price - current_price) * self.size
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'symbol': self.symbol,
            'side': self.side,
            'size': self.size,
            'entry_price': self.entry_price,
            'stop_loss': self.stop_loss,
            'take_profit': self.take_profit,
            'entry_time': self.entry_time.isoformat(),
            'unrealized_pnl': self.unrealized_pnl,
            'realized_pnl': self.realized_pnl
        }


class TradingEngine:
    """
    交易执行引擎
    
    功能：
    1. 执行市价单、限价单
    2. 管理止损止盈订单
    3. 跟踪持仓状态
    4. 风险控制
    """
    
    def __init__(self, exchange: ccxt_async.Exchange, config: Dict[str, Any] = None):
        """
        初始化交易引擎
        
        Args:
            exchange: ccxt 交易所实例
            config: 配置参数
        """
        self.exchange = exchange
        self.config = config or {}
        
        # 持仓管理
        self.positions: Dict[str, Position] = {}
        
        # 订单管理
        self.active_orders: Dict[str, Dict] = {}
        self.order_history: List[Dict] = []
        
        # 风险控制参数
        self.max_position_size = self.config.get('max_position_size', 1.0)
        self.max_daily_loss = self.config.get('max_daily_loss', 0.03)
        self.daily_pnl = 0.0
        
        # 统计信息
        self.total_trades = 0
        self.winning_trades = 0
        self.losing_trades = 0
        
        logger.info("交易引擎初始化完成")
    
    async def execute_market_order(self, symbol: str, side: OrderSide, 
                                   amount: float, params: Dict = None) -> Dict[str, Any]:
        """
        执行市价单
        
        Args:
            symbol: 交易对，如 'BTC/USDT'
            side: 买入或卖出
            amount: 数量
            params: 额外参数
        
        Returns:
            订单信息
        """
        try:
            logger.info(f"执行市价单: {side.value} {amount} {symbol}")
            
            # 风险检查
            if not await self._check_risk_limits(symbol, amount):
                raise Exception("风险检查未通过")
            
            # 执行订单
            order = await self.exchange.create_market_order(
                symbol=symbol,
                side=side.value,
                amount=amount,
                params=params or {}
            )
            
            # 记录订单
            self._record_order(order)
            
            # 更新持仓
            await self._update_position(symbol, side, amount, order.get('price', 0))
            
            logger.info(f"市价单执行成功: {order['id']}")
            return order
            
        except Exception as e:
            logger.error(f"市价单执行失败: {e}")
            raise
    
    async def execute_limit_order(self, symbol: str, side: OrderSide, 
                                  amount: float, price: float, 
                                  params: Dict = None) -> Dict[str, Any]:
        """
        执行限价单
        
        Args:
            symbol: 交易对
            side: 买入或卖出
            amount: 数量
            price: 限价
            params: 额外参数
        
        Returns:
            订单信息
        """
        try:
            logger.info(f"执行限价单: {side.value} {amount} {symbol} @ {price}")
            
            # 风险检查
            if not await self._check_risk_limits(symbol, amount):
                raise Exception("风险检查未通过")
            
            # 执行订单
            order = await self.exchange.create_limit_order(
                symbol=symbol,
                side=side.value,
                amount=amount,
                price=price,
                params=params or {}
            )
            
            # 记录订单
            self._record_order(order)
            self.active_orders[order['id']] = order
            
            logger.info(f"限价单创建成功: {order['id']}")
            return order
            
        except Exception as e:
            logger.error(f"限价单执行失败: {e}")
            raise
    
    async def set_stop_loss(self, symbol: str, side: OrderSide, 
                           amount: float, stop_price: float) -> Dict[str, Any]:
        """
        设置止损单
        
        Args:
            symbol: 交易对
            side: 买入或卖出（与持仓相反）
            amount: 数量
            stop_price: 止损价格
        
        Returns:
            订单信息
        """
        try:
            logger.info(f"设置止损单: {symbol} @ {stop_price}")
            
            # 不同交易所的止损单实现方式不同
            params = {
                'stopPrice': stop_price,
                'type': 'stop_loss'
            }
            
            order = await self.exchange.create_order(
                symbol=symbol,
                type='stop_loss',
                side=side.value,
                amount=amount,
                price=stop_price,
                params=params
            )
            
            self._record_order(order)
            self.active_orders[order['id']] = order
            
            logger.info(f"止损单创建成功: {order['id']}")
            return order
            
        except Exception as e:
            logger.error(f"止损单创建失败: {e}")
            raise
    
    async def set_take_profit(self, symbol: str, side: OrderSide, 
                             amount: float, target_price: float) -> Dict[str, Any]:
        """
        设置止盈单
        
        Args:
            symbol: 交易对
            side: 买入或卖出（与持仓相反）
            amount: 数量
            target_price: 止盈价格
        
        Returns:
            订单信息
        """
        try:
            logger.info(f"设置止盈单: {symbol} @ {target_price}")
            
            params = {
                'stopPrice': target_price,
                'type': 'take_profit'
            }
            
            order = await self.exchange.create_order(
                symbol=symbol,
                type='take_profit',
                side=side.value,
                amount=amount,
                price=target_price,
                params=params
            )
            
            self._record_order(order)
            self.active_orders[order['id']] = order
            
            logger.info(f"止盈单创建成功: {order['id']}")
            return order
            
        except Exception as e:
            logger.error(f"止盈单创建失败: {e}")
            raise
    
    async def cancel_order(self, order_id: str, symbol: str) -> bool:
        """
        取消订单
        
        Args:
            order_id: 订单ID
            symbol: 交易对
        
        Returns:
            是否成功
        """
        try:
            logger.info(f"取消订单: {order_id}")
            
            await self.exchange.cancel_order(order_id, symbol)
            
            if order_id in self.active_orders:
                del self.active_orders[order_id]
            
            logger.info(f"订单取消成功: {order_id}")
            return True
            
        except Exception as e:
            logger.error(f"订单取消失败: {e}")
            return False
    
    async def close_position(self, symbol: str, reason: str = "手动平仓") -> Dict[str, Any]:
        """
        平仓
        
        Args:
            symbol: 交易对
            reason: 平仓原因
        
        Returns:
            平仓结果
        """
        if symbol not in self.positions:
            raise Exception(f"没有持仓: {symbol}")
        
        position = self.positions[symbol]
        
        # 确定平仓方向
        side = OrderSide.SELL if position.side == 'long' else OrderSide.BUY
        
        # 执行市价平仓
        order = await self.execute_market_order(symbol, side, position.size)
        
        # 计算实现盈亏
        fill_price = order.get('price', 0)
        if position.side == 'long':
            pnl = (fill_price - position.entry_price) * position.size
        else:
            pnl = (position.entry_price - fill_price) * position.size
        
        position.realized_pnl = pnl
        self.daily_pnl += pnl
        
        # 更新统计
        self.total_trades += 1
        if pnl > 0:
            self.winning_trades += 1
        else:
            self.losing_trades += 1
        
        # 移除持仓
        del self.positions[symbol]
        
        logger.info(f"平仓完成: {symbol}, 盈亏: {pnl:.2f}, 原因: {reason}")
        
        return {
            'symbol': symbol,
            'side': position.side,
            'size': position.size,
            'entry_price': position.entry_price,
            'exit_price': fill_price,
            'pnl': pnl,
            'reason': reason
        }
    
    async def update_positions(self):
        """更新所有持仓的未实现盈亏"""
        for symbol, position in self.positions.items():
            try:
                ticker = await self.exchange.fetch_ticker(symbol)
                current_price = ticker['last']
                position.update_pnl(current_price)
                
                # 检查止损止盈
                await self._check_stop_loss_take_profit(symbol, position, current_price)
                
            except Exception as e:
                logger.error(f"更新持仓失败 {symbol}: {e}")
    
    async def _check_stop_loss_take_profit(self, symbol: str, position: Position, 
                                          current_price: float):
        """检查是否触发止损止盈"""
        should_close = False
        reason = ""
        
        if position.side == 'long':
            # 多单检查
            if position.stop_loss and current_price <= position.stop_loss:
                should_close = True
                reason = f"触发止损 @ {current_price}"
            elif position.take_profit and current_price >= position.take_profit:
                should_close = True
                reason = f"触发止盈 @ {current_price}"
        else:
            # 空单检查
            if position.stop_loss and current_price >= position.stop_loss:
                should_close = True
                reason = f"触发止损 @ {current_price}"
            elif position.take_profit and current_price <= position.take_profit:
                should_close = True
                reason = f"触发止盈 @ {current_price}"
        
        if should_close:
            await self.close_position(symbol, reason)
    
    async def _check_risk_limits(self, symbol: str, amount: float) -> bool:
        """检查风险限制"""
        # 检查单笔仓位限制
        if amount > self.max_position_size:
            logger.warning(f"超过最大仓位限制: {amount} > {self.max_position_size}")
            return False
        
        # 检查日内亏损限制
        if self.daily_pnl < -self.max_daily_loss:
            logger.warning(f"超过日内最大亏损: {self.daily_pnl} < {-self.max_daily_loss}")
            return False
        
        return True
    
    async def _update_position(self, symbol: str, side: OrderSide, 
                              amount: float, price: float):
        """更新持仓信息"""
        position_side = 'long' if side == OrderSide.BUY else 'short'
        
        if symbol in self.positions:
            # 更新现有持仓
            position = self.positions[symbol]
            if position.side == position_side:
                # 加仓
                total_cost = position.entry_price * position.size + price * amount
                position.size += amount
                position.entry_price = total_cost / position.size
            else:
                # 减仓或平仓
                if amount >= position.size:
                    # 完全平仓
                    del self.positions[symbol]
                else:
                    position.size -= amount
        else:
            # 新建持仓
            self.positions[symbol] = Position(
                symbol=symbol,
                side=position_side,
                size=amount,
                entry_price=price
            )
    
    def _record_order(self, order: Dict):
        """记录订单历史"""
        self.order_history.append({
            'order': order,
            'timestamp': datetime.now().isoformat()
        })
    
    def get_positions(self) -> List[Dict[str, Any]]:
        """获取所有持仓"""
        return [pos.to_dict() for pos in self.positions.values()]
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取交易统计"""
        win_rate = (self.winning_trades / self.total_trades * 100 
                   if self.total_trades > 0 else 0)
        
        return {
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'losing_trades': self.losing_trades,
            'win_rate': win_rate,
            'daily_pnl': self.daily_pnl,
            'active_positions': len(self.positions),
            'active_orders': len(self.active_orders)
        }
    
    async def close(self):
        """关闭交易引擎"""
        logger.info("关闭交易引擎...")
        
        # 取消所有活跃订单
        for order_id, order in list(self.active_orders.items()):
            try:
                await self.cancel_order(order_id, order['symbol'])
            except Exception as e:
                logger.error(f"取消订单失败 {order_id}: {e}")
        
        logger.info("交易引擎已关闭")
