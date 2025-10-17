"""
API v1路由聚合
"""
from fastapi import APIRouter

from .endpoints import stocks, market_data, data_sync, experts, playbooks, categories

api_router = APIRouter()

# 注册各个模块的路由
# 注意: strategies 和 trading_discipline 已迁移到 quant_trading 模块
api_router.include_router(stocks.router, prefix="/stocks", tags=["stocks"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(experts.router, prefix="/experts", tags=["experts"])
api_router.include_router(playbooks.router, prefix="/playbooks", tags=["playbooks"])
api_router.include_router(market_data.router, prefix="/market-data", tags=["market-data"])
api_router.include_router(data_sync.router, tags=["data-sync"])