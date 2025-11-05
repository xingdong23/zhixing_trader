"""
Portfolio - 投资组合管理类

管理资金、持仓和订单
"""

from typing import Dict, Optional, List
import pandas as pd
from .order import Order, OrderType, OrderStatus
from .position import Position


class Portfolio:
    """
    投资组合管理
    
    负责管理现金、持仓、订单等
    """
    
    def __init__(
        self,
        initial_capital: float,
        commission: float = 0.001,
        slippage: float = 0.0005,
        leverage: float = 1.0
    ):
        """
        初始化投资组合
        
        Args:
            initial_capital: 初始资金
            commission: 手续费率
            slippage: 滑点率
            leverage: 杠杆倍数
        """
        self.initial_capital = initial_capital
        self.cash = initial_capital
        self.commission = commission
        self.slippage = slippage
        self.leverage = leverage
        
        # 持仓管理
        self.positions: Dict[str, Position] = {}
        
        # 订单历史
        self.orders: List[Order] = []
        
    def buy(
        self,
        symbol: str,
        quantity: float,
        price: float,
        order_type: OrderType = OrderType.MARKET
    ) -> Optional[Order]:
        """
        买入
        
        Args:
            symbol: 交易标的
            quantity: 数量
            price: 价格
            order_type: 订单类型
            
        Returns:
            Order: 订单对象，如果资金不足返回 None
        """
        # 计算成本（考虑滑点）
        fill_price = price * (1 + self.slippage)
        cost = quantity * fill_price
        commission_fee = cost * self.commission
        total_cost = cost + commission_fee
        
        # 检查资金是否足够
        if total_cost > self.cash * self.leverage:
            return None
            
        # 创建订单
        order = Order(
            symbol=symbol,
            order_type=order_type,
            side="BUY",
            quantity=quantity,
            price=price,
            filled_price=fill_price,
            commission=commission_fee,
            status=OrderStatus.FILLED
        )
        
        # 更新现金
        self.cash -= total_cost
        
        # 更新持仓
        if symbol in self.positions:
            self.positions[symbol].add(quantity, fill_price, commission_fee)
        else:
            self.positions[symbol] = Position(symbol, quantity, fill_price, commission_fee)
            
        # 记录订单
        self.orders.append(order)
        
        return order
        
    def sell(
        self,
        symbol: str,
        quantity: float,
        price: float,
        order_type: OrderType = OrderType.MARKET
    ) -> Optional[Order]:
        """
        卖出
        
        Args:
            symbol: 交易标的
            quantity: 数量
            price: 价格
            order_type: 订单类型
            
        Returns:
            Order: 订单对象，如果持仓不足返回 None
        """
        # 检查持仓
        if symbol not in self.positions:
            return None
            
        position = self.positions[symbol]
        if position.quantity < quantity:
            return None
            
        # 计算收益（考虑滑点）
        fill_price = price * (1 - self.slippage)
        proceeds = quantity * fill_price
        commission_fee = proceeds * self.commission
        net_proceeds = proceeds - commission_fee
        
        # 创建订单
        order = Order(
            symbol=symbol,
            order_type=order_type,
            side="SELL",
            quantity=quantity,
            price=price,
            filled_price=fill_price,
            commission=commission_fee,
            status=OrderStatus.FILLED
        )
        
        # 更新现金
        self.cash += net_proceeds
        
        # 更新持仓
        position.reduce(quantity, fill_price, commission_fee)
        if position.quantity == 0:
            del self.positions[symbol]
            
        # 记录订单
        self.orders.append(order)
        
        return order
        
    def update(self, bar: pd.Series) -> None:
        """
        更新持仓价值
        
        Args:
            bar: 当前K线数据
        """
        # 这里可以根据当前价格更新持仓的市值
        # 具体实现取决于数据格式
        pass
        
    def get_position(self, symbol: str) -> Optional[Position]:
        """获取指定标的的持仓"""
        return self.positions.get(symbol)
        
    def get_positions(self) -> Dict[str, Position]:
        """获取所有持仓"""
        return self.positions
        
    def get_positions_value(self) -> float:
        """获取持仓总价值"""
        return sum(pos.get_market_value() for pos in self.positions.values())
        
    def get_total_value(self) -> float:
        """获取总资产价值（现金 + 持仓）"""
        return self.cash + self.get_positions_value()
        
    def get_equity(self) -> float:
        """获取权益（总资产价值）"""
        return self.get_total_value()
        
    def __repr__(self) -> str:
        return (
            f"Portfolio(\n"
            f"  Cash: {self.cash:.2f}\n"
            f"  Positions Value: {self.get_positions_value():.2f}\n"
            f"  Total Value: {self.get_total_value():.2f}\n"
            f"  Positions: {len(self.positions)}\n"
            f")"
        )
