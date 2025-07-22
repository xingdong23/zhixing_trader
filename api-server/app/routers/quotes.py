"""
行情数据相关API路由
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from ..models import ApiResponse, QuoteData
from ..database import db_service
from ..futu_client import futu_client

router = APIRouter(prefix="/api/quotes", tags=["quotes"])


@router.get("/", response_model=ApiResponse)
async def get_quotes(codes: Optional[str] = Query(None, description="股票代码，多个用逗号分隔")):
    """获取行情数据"""
    try:
        stock_codes = []
        
        if codes:
            # 从查询参数获取股票代码
            stock_codes = [code.strip() for code in codes.split(",")]
        else:
            # 如果没有指定代码，获取所有自选股的代码
            stocks = db_service.get_all_stocks()
            stock_codes = [stock.code for stock in stocks]
        
        if not stock_codes:
            return ApiResponse(
                success=True,
                data=[],
                message="No stocks to get quotes for",
                timestamp=datetime.utcnow().isoformat()
            )
        
        # 从富途API获取实时行情
        quotes = await futu_client.get_quotes(stock_codes)
        
        # 保存到数据库
        for quote in quotes:
            db_service.save_quote(quote)
        
        return ApiResponse(
            success=True,
            data=quotes,
            message="Quotes retrieved successfully",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to get quotes: {e}")
        
        # 如果富途API失败，尝试从数据库获取最新数据
        try:
            stock_codes_fallback = []
            if codes:
                stock_codes_fallback = [code.strip() for code in codes.split(",")]
            
            db_quotes = db_service.get_latest_quotes(stock_codes_fallback)
            
            # 转换为QuoteData格式
            quotes_data = []
            for db_quote in db_quotes:
                quote = QuoteData(
                    code=db_quote.code,
                    name="",  # 数据库中没有存储名称
                    cur_price=db_quote.cur_price,
                    change_val=db_quote.change_val,
                    change_rate=db_quote.change_rate,
                    volume=db_quote.volume,
                    update_time=db_quote.update_time.isoformat() if db_quote.update_time else None
                )
                quotes_data.append(quote)
            
            return ApiResponse(
                success=True,
                data=quotes_data,
                message="Quotes retrieved from cache (API unavailable)",
                timestamp=datetime.utcnow().isoformat()
            )
            
        except Exception as db_error:
            logger.error(f"Failed to get quotes from database: {db_error}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to retrieve quotes: {str(e)}"
            )


@router.get("/{code}", response_model=ApiResponse)
async def get_quote_detail(code: str):
    """获取单个股票的详细行情"""
    try:
        # 从富途API获取行情数据
        quotes = await futu_client.get_quotes([code])
        
        if not quotes:
            raise HTTPException(
                status_code=404,
                detail=f"No quote data found for {code}"
            )
        
        quote = quotes[0]
        
        # 保存到数据库
        db_service.save_quote(quote)
        
        return ApiResponse(
            success=True,
            data=quote,
            message="Quote retrieved successfully",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get quote for {code}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve quote for {code}: {str(e)}"
        )


@router.post("/subscribe", response_model=ApiResponse)
async def subscribe_quotes(codes: List[str]):
    """订阅实时行情推送"""
    try:
        if not codes:
            raise HTTPException(
                status_code=400,
                detail="codes must be a non-empty list of stock codes"
            )
        
        # 订阅实时行情
        success = await futu_client.subscribe_quotes(codes)
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to subscribe to real-time quotes"
            )
        
        return ApiResponse(
            success=True,
            data={"subscribed_codes": codes},
            message="Successfully subscribed to real-time quotes",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to subscribe quotes: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to subscribe to real-time quotes: {str(e)}"
        )


@router.post("/unsubscribe", response_model=ApiResponse)
async def unsubscribe_quotes(codes: List[str]):
    """取消订阅实时行情推送"""
    try:
        if not codes:
            raise HTTPException(
                status_code=400,
                detail="codes must be a non-empty list of stock codes"
            )
        
        # 取消订阅实时行情
        success = await futu_client.unsubscribe_quotes(codes)
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to unsubscribe from real-time quotes"
            )
        
        return ApiResponse(
            success=True,
            data={"unsubscribed_codes": codes},
            message="Successfully unsubscribed from real-time quotes",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to unsubscribe quotes: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to unsubscribe from real-time quotes: {str(e)}"
        )


@router.get("/stats", response_model=ApiResponse)
async def get_quote_stats():
    """获取行情统计信息"""
    try:
        stats = db_service.get_stats()
        
        quote_stats = {
            "total_quote_records": stats["quotes"],
            "total_stocks": stats["stocks"],
            "last_update": datetime.utcnow().isoformat(),
        }
        
        return ApiResponse(
            success=True,
            data=quote_stats,
            message="Quote stats retrieved successfully",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to get quote stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve quote stats: {str(e)}"
        )
