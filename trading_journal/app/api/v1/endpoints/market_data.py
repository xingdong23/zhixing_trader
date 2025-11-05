"""
市场数据API端点
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from loguru import logger

from ....core.container import container
from ....services.market_data_service import MarketDataService

router = APIRouter()


def get_market_data_service() -> MarketDataService:
    """获取市场数据服务依赖"""
    return container.get_market_data_service()


@router.get("/klines/{symbol}")
async def get_kline_data(
    symbol: str,
    timeframe: str = "1d",
    days: int = 252,
    market_data_service: MarketDataService = Depends(get_market_data_service)
) -> Dict[str, Any]:
    """获取K线数据"""
    try:
        kline_data = await market_data_service.get_stock_kline_data(symbol, timeframe, days)
        
        # 转换为前端需要的格式
        formatted_data = []
        for kline in kline_data:
            # 处理datetime字段，可能是字符串或datetime对象
            datetime_str = kline.datetime
            if hasattr(kline.datetime, 'isoformat'):
                datetime_str = kline.datetime.isoformat()
            elif isinstance(kline.datetime, str):
                datetime_str = kline.datetime
            else:
                datetime_str = str(kline.datetime)
                
            formatted_data.append({
                "datetime": datetime_str,
                "open": kline.open,
                "high": kline.high,
                "low": kline.low,
                "close": kline.close,
                "volume": kline.volume
            })
        
        return {
            "success": True,
            "data": {
                "symbol": symbol,
                "timeframe": timeframe,
                "klines": formatted_data,
                "total": len(formatted_data)
            },
            "message": f"获取 {symbol} K线数据成功"
        }
        
    except Exception as e:
        logger.error(f"获取K线数据失败: {e}")
        raise HTTPException(status_code=500, detail="获取K线数据失败")


@router.get("/info/{symbol}")
async def get_stock_info(
    symbol: str,
    market_data_service: MarketDataService = Depends(get_market_data_service)
) -> Dict[str, Any]:
    """获取股票基本信息"""
    try:
        stock_info = await market_data_service.get_stock_info(symbol)
        
        if not stock_info:
            raise HTTPException(status_code=404, detail="股票信息不存在")
        
        return {
            "success": True,
            "data": stock_info,
            "message": f"获取 {symbol} 基本信息成功"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取股票信息失败: {e}")
        raise HTTPException(status_code=500, detail="获取股票信息失败")


@router.post("/validate/{symbol}")
async def validate_symbol(
    symbol: str,
    market_data_service: MarketDataService = Depends(get_market_data_service)
) -> Dict[str, Any]:
    """验证股票代码"""
    try:
        is_valid = await market_data_service.validate_stock_symbol(symbol)
        
        return {
            "success": True,
            "data": {
                "symbol": symbol,
                "is_valid": is_valid
            },
            "message": f"股票代码 {symbol} {'有效' if is_valid else '无效'}"
        }
        
    except Exception as e:
        logger.error(f"验证股票代码失败: {e}")
        raise HTTPException(status_code=500, detail="验证股票代码失败")


@router.post("/update")
async def update_market_data(
    market_data_service: MarketDataService = Depends(get_market_data_service)
) -> Dict[str, Any]:
    """手动更新市场数据"""
    try:
        update_counts = await market_data_service.update_watchlist_data()
        
        total_daily = sum(counts['daily'] for counts in update_counts.values())
        total_hourly = sum(counts['hourly'] for counts in update_counts.values())
        
        return {
            "success": True,
            "data": {
                "update_counts": update_counts,
                "total_daily": total_daily,
                "total_hourly": total_hourly
            },
            "message": f"市场数据更新完成: 日线 {total_daily} 条, 小时线 {total_hourly} 条"
        }
        
    except Exception as e:
        logger.error(f"更新市场数据失败: {e}")
        raise HTTPException(status_code=500, detail="更新市场数据失败")


@router.delete("/cleanup")
async def cleanup_old_data(
    days_to_keep: int = 90,
    market_data_service: MarketDataService = Depends(get_market_data_service)
) -> Dict[str, Any]:
    """清理过期数据"""
    try:
        deleted_count = await market_data_service.cleanup_old_data(days_to_keep)
        
        return {
            "success": True,
            "data": {
                "deleted_count": deleted_count,
                "days_to_keep": days_to_keep
            },
            "message": f"清理了 {deleted_count} 条过期数据"
        }
        
    except Exception as e:
        logger.error(f"清理过期数据失败: {e}")
        raise HTTPException(status_code=500, detail="清理过期数据失败")
