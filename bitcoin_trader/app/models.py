"""
数据模型定义
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, Index
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class Kline(Base):
    """K线数据模型"""
    __tablename__ = "klines"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    exchange = Column(String(50), nullable=False, comment="交易所")
    symbol = Column(String(50), nullable=False, comment="交易对")
    interval = Column(String(10), nullable=False, comment="时间周期")
    open_time = Column(DateTime, nullable=False, comment="开盘时间")
    open = Column(Float, nullable=False, comment="开盘价")
    high = Column(Float, nullable=False, comment="最高价")
    low = Column(Float, nullable=False, comment="最低价")
    close = Column(Float, nullable=False, comment="收盘价")
    volume = Column(Float, nullable=False, comment="成交量")
    close_time = Column(DateTime, nullable=False, comment="收盘时间")
    quote_volume = Column(Float, comment="成交额")
    trades = Column(Integer, comment="成交笔数")
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")
    
    __table_args__ = (
        Index('idx_symbol_interval_time', 'exchange', 'symbol', 'interval', 'open_time'),
    )


class Order(Base):
    """订单模型"""
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    exchange = Column(String(50), nullable=False, comment="交易所")
    order_id = Column(String(100), nullable=False, comment="交易所订单ID")
    symbol = Column(String(50), nullable=False, comment="交易对")
    side = Column(String(10), nullable=False, comment="买卖方向: buy/sell")
    type = Column(String(20), nullable=False, comment="订单类型: market/limit")
    price = Column(Float, comment="委托价格")
    amount = Column(Float, nullable=False, comment="委托数量")
    filled = Column(Float, default=0, comment="成交数量")
    status = Column(String(20), nullable=False, comment="订单状态")
    strategy_id = Column(Integer, comment="策略ID")
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")
    
    __table_args__ = (
        Index('idx_exchange_order', 'exchange', 'order_id'),
        Index('idx_strategy', 'strategy_id'),
    )


class Position(Base):
    """持仓模型"""
    __tablename__ = "positions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    exchange = Column(String(50), nullable=False, comment="交易所")
    symbol = Column(String(50), nullable=False, comment="交易对")
    side = Column(String(10), nullable=False, comment="持仓方向: long/short")
    amount = Column(Float, nullable=False, comment="持仓数量")
    entry_price = Column(Float, nullable=False, comment="开仓均价")
    current_price = Column(Float, comment="当前价格")
    unrealized_pnl = Column(Float, comment="未实现盈亏")
    strategy_id = Column(Integer, comment="策略ID")
    opened_at = Column(DateTime, default=datetime.now, comment="开仓时间")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")
    closed_at = Column(DateTime, comment="平仓时间")
    
    __table_args__ = (
        Index('idx_exchange_symbol', 'exchange', 'symbol'),
    )


class Strategy(Base):
    """策略模型"""
    __tablename__ = "strategies"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, comment="策略名称")
    code = Column(String(50), unique=True, nullable=False, comment="策略代码")
    description = Column(Text, comment="策略描述")
    parameters = Column(Text, comment="策略参数(JSON)")
    enabled = Column(Boolean, default=False, comment="是否启用")
    exchange = Column(String(50), comment="交易所")
    symbol = Column(String(50), comment="交易对")
    interval = Column(String(10), comment="时间周期")
    max_position = Column(Float, comment="最大持仓")
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")


class BacktestResult(Base):
    """回测结果模型"""
    __tablename__ = "backtest_results"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    strategy_id = Column(Integer, nullable=False, comment="策略ID")
    symbol = Column(String(50), nullable=False, comment="交易对")
    interval = Column(String(10), nullable=False, comment="时间周期")
    start_time = Column(DateTime, nullable=False, comment="回测开始时间")
    end_time = Column(DateTime, nullable=False, comment="回测结束时间")
    initial_capital = Column(Float, nullable=False, comment="初始资金")
    final_capital = Column(Float, nullable=False, comment="最终资金")
    total_return = Column(Float, comment="总收益率")
    sharpe_ratio = Column(Float, comment="夏普比率")
    max_drawdown = Column(Float, comment="最大回撤")
    win_rate = Column(Float, comment="胜率")
    total_trades = Column(Integer, comment="总交易次数")
    result_data = Column(Text, comment="详细结果(JSON)")
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")
    
    __table_args__ = (
        Index('idx_strategy_time', 'strategy_id', 'start_time'),
    )

