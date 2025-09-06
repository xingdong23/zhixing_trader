"""
API v1路由聚合
"""
from fastapi import APIRouter

from .endpoints import strategies, stocks, market_data, data_sync, database_admin, concepts, experts, playbooks, trading_discipline

api_router = APIRouter()

# 注册各个模块的路由
api_router.include_router(strategies.router, prefix="/strategies", tags=["strategies"])
api_router.include_router(stocks.router, prefix="/stocks", tags=["stocks"])
api_router.include_router(concepts.router, prefix="/concepts", tags=["concepts"])
api_router.include_router(experts.router, prefix="/experts", tags=["experts"])
api_router.include_router(playbooks.router, prefix="/playbooks", tags=["playbooks"])
api_router.include_router(trading_discipline.router, prefix="/trading-discipline", tags=["trading-discipline"])
api_router.include_router(market_data.router, prefix="/market-data", tags=["market-data"])
api_router.include_router(data_sync.router, prefix="/data", tags=["data-sync"])
api_router.include_router(database_admin.router, prefix="/data/database", tags=["database-admin"])
