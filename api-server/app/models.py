"""
数据模型定义
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()


# ==================== SQLAlchemy 数据库模型 ====================

class StockDB(Base):
    """股票信息表"""
    __tablename__ = "stocks"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    market = Column(String(10), nullable=False)  # US, HK, CN
    group_id = Column(String(50))
    group_name = Column(String(100))
    lot_size = Column(Integer, default=100)
    sec_type = Column(String(20), default="STOCK")
    added_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)


class QuoteDB(Base):
    """行情数据表"""
    __tablename__ = "quotes"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), index=True, nullable=False)
    cur_price = Column(Float, nullable=False)
    prev_close_price = Column(Float)
    open_price = Column(Float)
    high_price = Column(Float)
    low_price = Column(Float)
    volume = Column(Integer)
    turnover = Column(Float)
    change_val = Column(Float)
    change_rate = Column(Float)
    amplitude = Column(Float)
    update_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class KLineDB(Base):
    """K线数据表"""
    __tablename__ = "klines"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), index=True, nullable=False)
    period = Column(String(10), nullable=False)  # K_1M, K_5M, K_DAY, etc.
    time_key = Column(String(20), nullable=False)
    open_price = Column(Float, nullable=False)
    close_price = Column(Float, nullable=False)
    high_price = Column(Float, nullable=False)
    low_price = Column(Float, nullable=False)
    volume = Column(Integer)
    turnover = Column(Float)
    pe = Column(Float)
    change_rate = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== Pydantic 响应模型 ====================

class StockInfo(BaseModel):
    """股票基础信息"""
    code: str
    name: str
    market: str  # US, HK, CN
    lot_size: int = 100
    sec_type: str = "STOCK"


class WatchlistGroup(BaseModel):
    """自选股分组"""
    group_id: str
    group_name: str
    stocks: List[StockInfo]


class QuoteData(BaseModel):
    """行情数据"""
    code: str
    name: str
    cur_price: float
    prev_close_price: Optional[float] = None
    open_price: Optional[float] = None
    high_price: Optional[float] = None
    low_price: Optional[float] = None
    volume: Optional[int] = None
    turnover: Optional[float] = None
    change_val: Optional[float] = None
    change_rate: Optional[float] = None
    amplitude: Optional[float] = None
    update_time: Optional[str] = None


class KLineData(BaseModel):
    """K线数据"""
    code: str
    time_key: str
    open_price: float
    close_price: float
    high_price: float
    low_price: float
    volume: Optional[int] = None
    turnover: Optional[float] = None
    pe: Optional[float] = None
    change_rate: Optional[float] = None


class TechnicalIndicator(BaseModel):
    """技术指标"""
    code: str
    time_key: str
    ma5: Optional[float] = None
    ma10: Optional[float] = None
    ma20: Optional[float] = None
    ma60: Optional[float] = None
    ema8: Optional[float] = None
    ema21: Optional[float] = None
    macd_dif: Optional[float] = None
    macd_dea: Optional[float] = None
    macd_macd: Optional[float] = None
    rsi: Optional[float] = None
    kdj_k: Optional[float] = None
    kdj_d: Optional[float] = None
    kdj_j: Optional[float] = None


class ApiResponse(BaseModel):
    """API响应格式"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None
    timestamp: str


class PaginatedResponse(BaseModel):
    """分页响应格式"""
    success: bool
    data: List[Any]
    pagination: Dict[str, int]
    error: Optional[str] = None
    message: Optional[str] = None
    timestamp: str


# ==================== 富途API相关模型 ====================

class FutuConfig(BaseModel):
    """富途API配置"""
    host: str
    port: int
    username: str
    password: str


class FutuError(BaseModel):
    """富途API错误"""
    ret_type: int
    ret_msg: str
    err_code: Optional[int] = None
