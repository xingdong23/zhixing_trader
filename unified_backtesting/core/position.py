"""
Position - 持仓管理类

管理单个标的的持仓信息
"""

from typing import Optional


class Position:
    """
    持仓类
    
    表示单个交易标的的持仓信息
    """
    
    def __init__(
        self,
        symbol: str,
        quantity: float = 0.0,
        avg_price: float = 0.0,
        commission: float = 0.0
    ):
        """
        初始化持仓
        
        Args:
            symbol: 交易标的
            quantity: 持仓数量
            avg_price: 平均成本价
            commission: 累计手续费
        """
        self.symbol = symbol
        self.quantity = quantity
        self.avg_price = avg_price
        self.total_commission = commission
        self.current_price = avg_price  # 当前市价
        
    def add(self, quantity: float, price: float, commission: float = 0.0) -> None:
        """
        增加持仓
        
        Args:
            quantity: 增加数量
            price: 买入价格
            commission: 手续费
        """
        # 计算新的平均成本
        total_cost = self.quantity * self.avg_price + quantity * price
        self.quantity += quantity
        self.avg_price = total_cost / self.quantity if self.quantity > 0 else 0
        self.total_commission += commission
        
    def reduce(self, quantity: float, price: float, commission: float = 0.0) -> float:
        """
        减少持仓
        
        Args:
            quantity: 减少数量
            price: 卖出价格
            commission: 手续费
            
        Returns:
            float: 实现盈亏
        """
        if quantity > self.quantity:
            quantity = self.quantity
            
        # 计算实现盈亏
        realized_pnl = (price - self.avg_price) * quantity - commission
        
        # 更新持仓
        self.quantity -= quantity
        self.total_commission += commission
        
        # 如果持仓清空，重置平均价格
        if self.quantity == 0:
            self.avg_price = 0
            
        return realized_pnl
        
    def update_price(self, current_price: float) -> None:
        """
        更新当前市价
        
        Args:
            current_price: 当前市价
        """
        self.current_price = current_price
        
    def get_market_value(self) -> float:
        """获取持仓市值"""
        return self.quantity * self.current_price
        
    def get_cost(self) -> float:
        """获取持仓成本"""
        return self.quantity * self.avg_price
        
    def get_unrealized_pnl(self) -> float:
        """获取未实现盈亏"""
        return (self.current_price - self.avg_price) * self.quantity
        
    def get_unrealized_pnl_pct(self) -> float:
        """获取未实现盈亏百分比"""
        if self.avg_price == 0:
            return 0.0
        return (self.current_price - self.avg_price) / self.avg_price
        
    def is_long(self) -> bool:
        """是否持有多头"""
        return self.quantity > 0
        
    def is_short(self) -> bool:
        """是否持有空头"""
        return self.quantity < 0
        
    def is_empty(self) -> bool:
        """是否空仓"""
        return self.quantity == 0
        
    def __repr__(self) -> str:
        return (
            f"Position({self.symbol}: {self.quantity} @ {self.avg_price:.2f}, "
            f"Market: {self.current_price:.2f}, "
            f"PnL: {self.get_unrealized_pnl():.2f} ({self.get_unrealized_pnl_pct():.2%}))"
        )
