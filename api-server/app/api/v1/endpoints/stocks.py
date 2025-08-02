"""
股票API端点
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from loguru import logger

from ....core.container import container
from ....repositories.stock_repository import StockRepository

router = APIRouter()


def get_stock_repository() -> StockRepository:
    """获取股票仓库依赖"""
    return container.get_stock_repository()


@router.get("/")
async def get_all_stocks(
    stock_repository: StockRepository = Depends(get_stock_repository)
) -> Dict[str, Any]:
    """获取所有股票"""
    try:
        import json
        stocks = await stock_repository.get_all_stocks()

        stock_list = []
        for stock in stocks:
            stock_data = {
                "id": stock.id,
                "symbol": stock.code,
                "name": stock.name,
                "market": stock.market,
                "group_id": stock.group_id,
                "group_name": stock.group_name,
                "lot_size": stock.lot_size,
                "sec_type": stock.sec_type,
                "is_active": stock.is_active,
                "added_at": stock.added_at.isoformat() if stock.added_at else None,
                "updated_at": stock.updated_at.isoformat() if stock.updated_at else None
            }

            # 概念信息从关联表获取，不再使用 fundamental_tags 字段

            stock_data["market_cap"] = stock.market_cap
            stock_data["watch_level"] = stock.watch_level
            stock_data["notes"] = stock.notes

            stock_list.append(stock_data)

        return {
            "success": True,
            "data": {
                "stocks": stock_list,
                "total": len(stock_list)
            },
            "message": "获取股票列表成功"
        }
        
    except Exception as e:
        logger.error(f"获取股票列表失败: {e}")
        raise HTTPException(status_code=500, detail="获取股票列表失败")


@router.post("/")
async def add_stock(
    stock_data: Dict[str, Any],
    stock_repository: StockRepository = Depends(get_stock_repository)
) -> Dict[str, Any]:
    """添加股票"""
    try:
        # 验证必需字段
        required_fields = ["code", "name"]
        for field in required_fields:
            if field not in stock_data:
                raise HTTPException(status_code=400, detail=f"缺少必需字段: {field}")
        
        # 检查股票是否已存在
        existing_stock = await stock_repository.get_stock_by_symbol(stock_data["code"])
        if existing_stock:
            raise HTTPException(status_code=400, detail="股票已存在")
        
        # 验证股票代码
        market_data_service = container.get_market_data_service()
        is_valid = await market_data_service.validate_stock_symbol(stock_data["code"])
        if not is_valid:
            raise HTTPException(status_code=400, detail="无效的股票代码")
        
        # 获取股票基本信息
        stock_info = await market_data_service.get_stock_info(stock_data["code"])
        if stock_info:
            stock_data.update(stock_info)
        
        # 保存股票
        stock_id = await stock_repository.save_stock(stock_data)
        if stock_id:
            return {
                "success": True,
                "data": {"stock_id": stock_id},
                "message": "股票添加成功"
            }
        else:
            raise HTTPException(status_code=500, detail="股票添加失败")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"添加股票失败: {e}")
        raise HTTPException(status_code=500, detail="添加股票失败")


@router.delete("/{symbol}")
async def delete_stock(
    symbol: str,
    stock_repository: StockRepository = Depends(get_stock_repository)
) -> Dict[str, Any]:
    """删除股票"""
    try:
        success = await stock_repository.delete_stock(symbol)
        if success:
            return {
                "success": True,
                "message": "股票删除成功"
            }
        else:
            raise HTTPException(status_code=404, detail="股票不存在")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除股票失败: {e}")
        raise HTTPException(status_code=500, detail="删除股票失败")


@router.get("/search")
async def search_stocks(
    keyword: str,
    stock_repository: StockRepository = Depends(get_stock_repository)
) -> Dict[str, Any]:
    """搜索股票"""
    try:
        stocks = await stock_repository.search_stocks(keyword)
        
        stock_list = []
        for stock in stocks:
            stock_list.append({
                "id": stock.id,
                "symbol": stock.code,
                "name": stock.name,
                "industry": stock.industry,
                "market_cap": stock.market_cap
            })
        
        return {
            "success": True,
            "data": {
                "stocks": stock_list,
                "total": len(stock_list)
            },
            "message": f"搜索到 {len(stock_list)} 只股票"
        }
        
    except Exception as e:
        logger.error(f"搜索股票失败: {e}")
        raise HTTPException(status_code=500, detail="搜索股票失败")


@router.put("/{symbol}")
async def update_stock(
    symbol: str,
    stock_data: Dict[str, Any],
    stock_repository: StockRepository = Depends(get_stock_repository)
) -> Dict[str, Any]:
    """更新股票信息"""
    try:
        # 检查股票是否存在
        existing_stock = await stock_repository.get_stock_by_symbol(symbol)
        if not existing_stock:
            raise HTTPException(status_code=404, detail="股票不存在")

        # 更新股票信息
        success = await stock_repository.update_stock(symbol, stock_data)
        if success:
            # 获取更新后的股票信息
            updated_stock = await stock_repository.get_stock_by_symbol(symbol)

            return {
                "success": True,
                "data": {
                    "id": updated_stock.id,
                    "symbol": updated_stock.code,
                    "name": updated_stock.name,
                    "market_cap": updated_stock.market_cap,
                    "watch_level": updated_stock.watch_level,
                    "notes": updated_stock.notes,
                    "updated_at": updated_stock.updated_at.isoformat() if updated_stock.updated_at else None
                },
                "message": "股票信息更新成功"
            }
        else:
            raise HTTPException(status_code=500, detail="股票信息更新失败")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新股票信息失败: {e}")
        raise HTTPException(status_code=500, detail="更新股票信息失败")


@router.get("/{symbol}")
async def get_stock_detail(
    symbol: str,
    stock_repository: StockRepository = Depends(get_stock_repository)
) -> Dict[str, Any]:
    """获取股票详情"""
    try:
        stock = await stock_repository.get_stock_by_symbol(symbol)
        if not stock:
            raise HTTPException(status_code=404, detail="股票不存在")

        # 获取最新市场数据
        market_data_service = container.get_market_data_service()
        stock_info = await market_data_service.get_stock_info(symbol)

        stock_detail = {
            "id": stock.id,
            "symbol": stock.code,
            "name": stock.name,
            "industry": stock.industry,
            "market_cap": stock.market_cap,
            "created_at": stock.created_at.isoformat() if stock.created_at else None
        }

        if stock_info:
            stock_detail.update({
                "current_price": stock_info.get("current_price", 0),
                "currency": stock_info.get("currency", "USD"),
                "exchange": stock_info.get("exchange", "")
            })

        return {
            "success": True,
            "data": stock_detail,
            "message": "获取股票详情成功"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取股票详情失败: {e}")
        raise HTTPException(status_code=500, detail="获取股票详情失败")
