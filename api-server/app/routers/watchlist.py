"""
自选股相关API路由
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from loguru import logger

from ..models import ApiResponse, WatchlistGroup, StockInfo
from ..database import db_service
from ..futu_client import futu_client

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


@router.get("/", response_model=ApiResponse)
async def get_watchlist():
    """获取自选股列表"""
    try:
        # 从富途API获取自选股数据
        watchlist_groups = await futu_client.get_watchlist()
        
        # 保存到数据库
        for group in watchlist_groups:
            stocks_data = [
                (stock, group.group_id, group.group_name) 
                for stock in group.stocks
            ]
            db_service.upsert_stocks_batch(stocks_data)
        
        return ApiResponse(
            success=True,
            data=watchlist_groups,
            message="Watchlist retrieved successfully",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to get watchlist: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve watchlist: {str(e)}"
        )


@router.get("/groups", response_model=ApiResponse)
async def get_watchlist_groups():
    """获取自选股分组"""
    try:
        # 从数据库获取所有股票并按分组聚合
        stocks = db_service.get_all_stocks()
        
        # 按分组聚合
        groups_dict = {}
        for stock in stocks:
            group_id = stock.group_id or "default"
            group_name = stock.group_name or "默认分组"
            
            if group_id not in groups_dict:
                groups_dict[group_id] = WatchlistGroup(
                    group_id=group_id,
                    group_name=group_name,
                    stocks=[]
                )
            
            stock_info = StockInfo(
                code=stock.code,
                name=stock.name,
                market=stock.market,
                lot_size=stock.lot_size,
                sec_type=stock.sec_type
            )
            groups_dict[group_id].stocks.append(stock_info)
        
        groups = list(groups_dict.values())
        
        return ApiResponse(
            success=True,
            data=groups,
            message="Watchlist groups retrieved successfully",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to get watchlist groups: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve watchlist groups: {str(e)}"
        )


@router.get("/groups/{group_id}", response_model=ApiResponse)
async def get_group_stocks(group_id: str):
    """获取指定分组的股票"""
    try:
        stocks = db_service.get_stocks_by_group(group_id)
        
        if not stocks:
            raise HTTPException(
                status_code=404,
                detail=f"Group {group_id} not found or empty"
            )
        
        stock_infos = [
            StockInfo(
                code=stock.code,
                name=stock.name,
                market=stock.market,
                lot_size=stock.lot_size,
                sec_type=stock.sec_type
            )
            for stock in stocks
        ]
        
        group_data = {
            "group_id": group_id,
            "group_name": stocks[0].group_name or "未知分组",
            "stocks": stock_infos
        }
        
        return ApiResponse(
            success=True,
            data=group_data,
            message="Group stocks retrieved successfully",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get group stocks: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve group stocks: {str(e)}"
        )


@router.post("/refresh", response_model=ApiResponse)
async def refresh_watchlist():
    """刷新自选股数据"""
    try:
        # 检查富途API连接状态
        if not futu_client.is_connected:
            raise HTTPException(
                status_code=503,
                detail="Futu API is not connected"
            )
        
        # 从富途API重新获取自选股数据
        watchlist_groups = await futu_client.get_watchlist()
        
        # 更新数据库
        for group in watchlist_groups:
            stocks_data = [
                (stock, group.group_id, group.group_name) 
                for stock in group.stocks
            ]
            db_service.upsert_stocks_batch(stocks_data)
        
        return ApiResponse(
            success=True,
            data=watchlist_groups,
            message="Watchlist refreshed successfully",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to refresh watchlist: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refresh watchlist: {str(e)}"
        )


@router.get("/stats", response_model=ApiResponse)
async def get_watchlist_stats():
    """获取自选股统计信息"""
    try:
        stocks = db_service.get_all_stocks()
        
        # 统计信息
        stats = {
            "total_stocks": len(stocks),
            "by_market": {
                "US": len([s for s in stocks if s.market == "US"]),
                "HK": len([s for s in stocks if s.market == "HK"]),
                "CN": len([s for s in stocks if s.market == "CN"]),
            },
            "by_group": {},
            "last_updated": None
        }
        
        # 按分组统计
        for stock in stocks:
            group_name = stock.group_name or "默认分组"
            stats["by_group"][group_name] = stats["by_group"].get(group_name, 0) + 1
        
        # 最后更新时间
        if stocks:
            stats["last_updated"] = max(stock.updated_at for stock in stocks).isoformat()
        
        return ApiResponse(
            success=True,
            data=stats,
            message="Watchlist stats retrieved successfully",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to get watchlist stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve watchlist stats: {str(e)}"
        )
