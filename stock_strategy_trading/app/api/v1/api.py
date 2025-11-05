"""
API v1 路由
"""
from fastapi import APIRouter

from .endpoints import strategies, trading

api_router = APIRouter()

# 注册子路由
api_router.include_router(strategies.router, prefix="/strategies", tags=["strategies"])
api_router.include_router(trading.router, prefix="/trading", tags=["trading"])

