"""
Order - 订单管理类

管理交易订单
"""

from enum import Enum
from typing import Optional
from datetime import datetime


class OrderType(Enum):
    """订单类型"""
    MARKET = "MARKET"  # 市价单
    LIMIT = "LIMIT"    # 限价单
    STOP = "STOP"      # 止损单
    STOP_LIMIT = "STOP_LIMIT"  # 止损限价单


class OrderStatus(Enum):
    """订单状态"""
    PENDING = "PENDING"      # 待处理
    SUBMITTED = "SUBMITTED"  # 已提交
    FILLED = "FILLED"        # 已成交
    PARTIAL = "PARTIAL"      # 部分成交
    CANCELLED = "CANCELLED"  # 已取消
    REJECTED = "REJECTED"    # 已拒绝


class Order:
    """
    订单类
    
    表示一个交易订单
    """
    
    def __init__(
        self,
        symbol: str,
        order_type: OrderType,
        side: str,  # "BUY" or "SELL"
        quantity: float,
        price: float,
        filled_price: Optional[float] = None,
        commission: float = 0.0,
        status: OrderStatus = OrderStatus.PENDING,
        timestamp: Optional[datetime] = None
    ):
        """
        初始化订单
        
        Args:
            symbol: 交易标的
            order_type: 订单类型
            side: 买卖方向（BUY/SELL）
            quantity: 数量
            price: 价格
            filled_price: 成交价格
            commission: 手续费
            status: 订单状态
            timestamp: 时间戳
        """
        self.symbol = symbol
        self.order_type = order_type
        self.side = side
        self.quantity = quantity
        self.price = price
        self.filled_price = filled_price or price
        self.commission = commission
        self.status = status
        self.timestamp = timestamp or datetime.now()
        
    def is_filled(self) -> bool:
        """订单是否已成交"""
        return self.status == OrderStatus.FILLED
        
    def is_pending(self) -> bool:
        """订单是否待处理"""
        return self.status == OrderStatus.PENDING
        
    def cancel(self) -> None:
        """取消订单"""
        if self.status in [OrderStatus.PENDING, OrderStatus.SUBMITTED]:
            self.status = OrderStatus.CANCELLED
            
    def fill(self, filled_price: float, commission: float = 0.0) -> None:
        """
        成交订单
        
        Args:
            filled_price: 成交价格
            commission: 手续费
        """
        self.filled_price = filled_price
        self.commission = commission
        self.status = OrderStatus.FILLED
        
    def get_total_cost(self) -> float:
        """获取订单总成本（包含手续费）"""
        if self.side == "BUY":
            return self.quantity * self.filled_price + self.commission
        else:  # SELL
            return self.quantity * self.filled_price - self.commission
            
    def __repr__(self) -> str:
        return (
            f"Order({self.side} {self.quantity} {self.symbol} @ {self.filled_price:.2f}, "
            f"Status: {self.status.value}, Commission: {self.commission:.2f})"
        )
