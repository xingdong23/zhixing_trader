"""
股票API端点
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional
from loguru import logger

from ....core.container import container
from ....repositories.stock_repository import StockRepository
from ....repositories.kline_repository import KLineRepository
from ....database import db_service
from ....models import ConceptDB, ConceptStockRelationDB, StockDB, QuoteDB

router = APIRouter()


def get_stock_repository() -> StockRepository:
    """获取股票仓库依赖"""
    return container.get_stock_repository()


def get_kline_repository() -> KLineRepository:
    """获取K线数据仓库依赖"""
    return container.get_kline_repository()


@router.get("/")
async def get_all_stocks(
    stock_repository: StockRepository = Depends(get_stock_repository),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    concept_id: Optional[str] = Query(None, description="按概念过滤，支持概念表主键或concept_id")
) -> Dict[str, Any]:
    """获取股票列表（支持分页与概念筛选）"""
    try:
        with db_service.get_session() as session:
            query = session.query(StockDB).filter(StockDB.is_active == True)

            # 概念筛选（兼容 id 与 concept_id）
            if concept_id:
                # 规范为 concept_id
                target_cid = None
                # 尝试按 concept_id
                c = session.query(ConceptDB).filter(ConceptDB.concept_id == str(concept_id)).first()
                if c:
                    target_cid = c.concept_id
                else:
                    # 尝试按主键
                    try:
                        cid_int = int(str(concept_id))
                        c2 = session.query(ConceptDB).filter(ConceptDB.id == cid_int).first()
                        if c2:
                            target_cid = c2.concept_id
                    except Exception:
                        pass

                if target_cid:
                    rel_symbols = [rel.stock_code for rel in session.query(ConceptStockRelationDB).filter(
                        ConceptStockRelationDB.concept_id == target_cid
                    ).all()]
                    if rel_symbols:
                        query = query.filter(StockDB.code.in_(rel_symbols))
                    else:
                        return {"success": True, "data": {"stocks": [], "total": 0, "page": page, "pageSize": page_size, "totalPages": 0}}

            total = query.count()
            items = (query
                     .order_by(StockDB.updated_at.desc())
                     .offset((page - 1) * page_size)
                     .limit(page_size)
                     .all())

            stock_list: List[Dict[str, Any]] = []
            for stock in items:
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

                try:
                    relations = session.query(ConceptStockRelationDB).filter(
                        ConceptStockRelationDB.stock_code == stock.code
                    ).all()
                    stock_data["concept_ids"] = [rel.concept_id for rel in relations]
                except Exception:
                    stock_data["concept_ids"] = []

                stock_data["market_cap"] = stock.market_cap
                stock_data["watch_level"] = stock.watch_level
                stock_data["notes"] = stock.notes
                stock_list.append(stock_data)

            return {
                "success": True,
                "data": {
                    "stocks": stock_list,
                    "total": total,
                    "page": page,
                    "pageSize": page_size,
                    "totalPages": (total + page_size - 1) // page_size
                },
                "message": "获取股票列表成功"
            }
    except Exception as e:
        logger.error(f"获取股票列表失败: {e}")
        raise HTTPException(status_code=500, detail="获取股票列表失败")


@router.get("/overview")
async def get_stocks_overview(
    stock_repository: StockRepository = Depends(get_stock_repository),
    kline_repository: KLineRepository = Depends(get_kline_repository),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=20),
    concept_id: Optional[str] = Query(None, description="按概念过滤，支持概念表主键或concept_id"),
    concept_name: Optional[str] = Query(None, description="按概念名称过滤"),
    sort_field: Optional[str] = Query("updated_at", description="排序字段: name, price, change_percent, market, updated_at"),
    sort_order: Optional[str] = Query("desc", description="排序顺序: asc, desc"),
    price_min: Optional[float] = Query(None, description="价格最小值"),
    price_max: Optional[float] = Query(None, description="价格最大值"),
    change_percent_min: Optional[float] = Query(None, description="涨跌幅最小值(%)"),
    change_percent_max: Optional[float] = Query(None, description="涨跌幅最大值(%)")
) -> Dict[str, Any]:
    """获取股票概览分页列表（从本地K线数据获取价格）

    - 固定每页最多返回20条，满足前端"单接口渲染一页"的诉求
    - 返回字段包含：symbol、name、market、group_name、updated_at、concepts
    - 价格数据从本地K线数据表获取最新价格和涨跌幅，不依赖外部API
    """
    from math import ceil

    try:
        with db_service.get_session() as session:
            query = session.query(StockDB).filter(StockDB.is_active == True)

            # 概念筛选（支持 concept_id 和 concept_name）
            if concept_id or concept_name:
                target_cid = None
                
                # 按 concept_id 筛选
                if concept_id:
                    c = session.query(ConceptDB).filter(ConceptDB.concept_id == str(concept_id)).first()
                    if c:
                        target_cid = c.concept_id
                    else:
                        try:
                            cid_int = int(str(concept_id))
                            c2 = session.query(ConceptDB).filter(ConceptDB.id == cid_int).first()
                            if c2:
                                target_cid = c2.concept_id
                        except Exception:
                            pass
                
                # 按 concept_name 筛选
                elif concept_name:
                    c = session.query(ConceptDB).filter(ConceptDB.name == concept_name).first()
                    if c:
                        target_cid = c.concept_id

                if target_cid:
                    rel_symbols = [rel.stock_code for rel in session.query(ConceptStockRelationDB).filter(
                        ConceptStockRelationDB.concept_id == target_cid
                    ).all()]
                    if rel_symbols:
                        query = query.filter(StockDB.code.in_(rel_symbols))
                    else:
                        return {"success": True, "data": {"stocks": [], "total": 0, "page": page, "pageSize": page_size, "totalPages": 0}}

            total = query.count()
            
            # 处理排序
            sort_field_map = {
                'name': StockDB.name,
                'market': StockDB.market,
                'updated_at': StockDB.updated_at
            }
            
            # 默认排序字段
            order_column = sort_field_map.get(sort_field, StockDB.updated_at)
            
            # 应用排序
            if sort_order.lower() == 'asc':
                query = query.order_by(order_column.asc())
            else:
                query = query.order_by(order_column.desc())
            
            items = (query
                     .offset((page - 1) * page_size)
                     .limit(page_size)
                     .all())

            # 对于价格和涨跌幅排序或筛选，需要特殊处理
            has_price_filter = (price_min is not None or price_max is not None or 
                               change_percent_min is not None or change_percent_max is not None)
            
            if sort_field in ['price', 'change_percent'] or has_price_filter:
                # 获取所有股票的最新K线价格数据，然后在Python中处理
                all_stock_codes = [s.code for s in session.query(StockDB).filter(StockDB.is_active == True).all()]
                
                # 从K线数据获取最新价格信息
                kline_prices = await kline_repository.get_latest_price_data(all_stock_codes)
                
                # 重新获取所有符合条件的股票
                query_for_sorting = session.query(StockDB).filter(StockDB.is_active == True)
                
                # 应用概念筛选
                if concept_id or concept_name:
                    target_cid = None
                    
                    if concept_id:
                        c = session.query(ConceptDB).filter(ConceptDB.concept_id == str(concept_id)).first()
                        if c:
                            target_cid = c.concept_id
                        else:
                            try:
                                cid_int = int(str(concept_id))
                                c2 = session.query(ConceptDB).filter(ConceptDB.id == cid_int).first()
                                if c2:
                                    target_cid = c2.concept_id
                            except Exception:
                                pass
                    
                    elif concept_name:
                        c = session.query(ConceptDB).filter(ConceptDB.name == concept_name).first()
                        if c:
                            target_cid = c.concept_id

                    if target_cid:
                        rel_symbols = [rel.stock_code for rel in session.query(ConceptStockRelationDB).filter(
                            ConceptStockRelationDB.concept_id == target_cid
                        ).all()]
                        if rel_symbols:
                            query_for_sorting = query_for_sorting.filter(StockDB.code.in_(rel_symbols))
                        else:
                            return {"success": True, "data": {"stocks": [], "total": 0, "page": page, "pageSize": page_size, "totalPages": 0}}
                
                all_stocks = query_for_sorting.all()
                
                # 在Python中进行价格筛选
                def passes_price_filter(stock):
                    kline_data = kline_prices.get(stock.code)
                    if not kline_data:
                        # 如果没有K线数据，价格筛选时排除
                        if has_price_filter:
                            return False
                        return True
                    
                    # 价格筛选
                    if price_min is not None or price_max is not None:
                        price = kline_data.get('price')
                        if price is None:
                            return False
                        if price_min is not None and price < price_min:
                            return False
                        if price_max is not None and price > price_max:
                            return False
                    
                    # 涨跌幅筛选
                    if change_percent_min is not None or change_percent_max is not None:
                        change_percent = kline_data.get('change_percent')
                        if change_percent is None:
                            return False
                        if change_percent_min is not None and change_percent < change_percent_min:
                            return False
                        if change_percent_max is not None and change_percent > change_percent_max:
                            return False
                    
                    return True
                
                # 应用价格筛选
                filtered_stocks = [stock for stock in all_stocks if passes_price_filter(stock)]
                
                # 在Python中进行排序
                def get_sort_key(stock):
                    kline_data = kline_prices.get(stock.code)
                    if not kline_data:
                        return float('-inf') if sort_order.lower() == 'desc' else float('inf')
                    
                    if sort_field == 'price':
                        price = kline_data.get('price')
                        return price if price is not None else (float('-inf') if sort_order.lower() == 'desc' else float('inf'))
                    elif sort_field == 'change_percent':
                        change_percent = kline_data.get('change_percent')
                        return change_percent if change_percent is not None else (float('-inf') if sort_order.lower() == 'desc' else float('inf'))
                    
                    return 0
                
                sorted_stocks = sorted(filtered_stocks, key=get_sort_key, reverse=(sort_order.lower() == 'desc'))
                
                # 应用分页
                start_idx = (page - 1) * page_size
                end_idx = start_idx + page_size
                items = sorted_stocks[start_idx:end_idx]
                total = len(sorted_stocks)
                
                latest_kline_prices = kline_prices
            else:
                # 批量获取股票的最新K线价格数据
                stock_codes = [s.code for s in items]
                latest_kline_prices = {}
                
                if stock_codes:
                    # 从K线数据获取最新价格信息
                    latest_kline_prices = await kline_repository.get_latest_price_data(stock_codes)

            # 组装返回数据
            stocks = []
            for stock in items:
                # 获取股票的概念信息
                concepts = []
                try:
                    # 获取股票关联的概念
                    relations = session.query(ConceptStockRelationDB).filter(
                        ConceptStockRelationDB.stock_code == stock.code
                    ).all()
                    
                    concept_ids = [rel.concept_id for rel in relations]
                    if concept_ids:
                        concept_objs = session.query(ConceptDB).filter(
                            ConceptDB.concept_id.in_(concept_ids),
                            ConceptDB.is_active == True
                        ).all()
                        concepts = [c.name for c in concept_objs]
                except Exception as e:
                    logger.warning(f"Failed to get concepts for stock {stock.code}: {e}")
                
                # 获取价格和涨跌幅数据
                kline_data = latest_kline_prices.get(stock.code)
                price = None
                change_percent = None
                last_update = None
                
                if kline_data:
                    price = kline_data.get('price')
                    change_percent = kline_data.get('change_percent')
                    last_update = kline_data.get('last_update')
                
                stocks.append({
                    "id": stock.id,
                    "symbol": stock.code,
                    "name": stock.name,
                    "market": stock.market,
                    "group_id": stock.group_id,
                    "group_name": stock.group_name,
                    "concepts": concepts,
                    "updated_at": stock.updated_at.isoformat() if stock.updated_at else None,
                    "price": price,
                    "change_percent": change_percent,
                    "last_price_update": last_update
                })

        return {
            "success": True,
            "data": {
                "stocks": stocks,
                "total": total,
                "page": page,
                "pageSize": page_size,
                "totalPages": ceil(total / page_size) if page_size else 0
            },
            "message": "获取股票概览成功"
        }

    except Exception as e:
        logger.error(f"获取股票概览失败: {e}")
        raise HTTPException(status_code=500, detail="获取股票概览失败")


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


@router.post("/import")
async def import_stocks(payload: Dict[str, Any]) -> Dict[str, Any]:
    """批量导入股票并根据行业映射到预置概念。"""
    try:
        stocks: List[Dict[str, Any]] = payload.get("stocks", [])
        if not isinstance(stocks, list) or not stocks:
            raise HTTPException(status_code=400, detail="缺少stocks数组")

        # 预置概念集合
        base_concepts = [
            "机器人", "核能", "航天无人机", "量子", "ai 算力", "电池", "能源", "生物科技", "软件",
            "金融科技", "加密资产", "稀土", "消费", "ai 流程", "安全", "房地产", "矿产", "其他"
        ]

        concept_map: Dict[str, str] = {}
        with db_service.get_session() as session:
            # 确保概念存在
            for name in base_concepts:
                existing = session.query(ConceptDB).filter(ConceptDB.name == name, ConceptDB.is_active == True).first()
                if not existing:
                    from datetime import datetime
                    cid = f"concept_{name}_{int(datetime.now().timestamp())}"
                    c = ConceptDB(concept_id=cid, name=name, description="", category="custom", stock_count=0, is_active=True)
                    session.add(c)
                    session.commit()
                    session.refresh(c)
                    concept_map[name] = c.concept_id
                else:
                    concept_map[name] = existing.concept_id

        def map_industry_to_concept(industry: str) -> str:
            text = (industry or "").lower()
            rules = [
                ("机器人", ["机器人", "robot"]),
                ("核能", ["核", "nuclear"]),
                ("航天无人机", ["航天", "无人机", "aero", "drone", "space"]),
                ("量子", ["量子", "quantum"]),
                ("ai 算力", ["ai", "算力", "gpu", "accelerator", "chip", "nvidia"]),
                ("电池", ["电池", "battery", "锂", "li-ion"]),
                ("能源", ["能源", "energy", "oil", "gas", "光伏", "太阳能", "风电", "renewable"]),
                ("生物科技", ["生物", "医药", "制药", "biotech", "pharma"]),
                ("软件", ["软件", "software", "saas", "cloud"]),
                ("金融科技", ["金融", "fintech", "支付", "银行科技"]),
                ("加密资产", ["加密", "crypto", "区块链", "bitcoin", "btc"]),
                ("稀土", ["稀土", "rare earth"]),
                ("消费", ["消费", "retail", "电商", "食品", "apparel"]),
                ("ai 流程", ["流程", "rpa", "自动化", "automation", "workflow", "bpm"]),
                ("安全", ["安全", "security", "网络安全", "cyber"]),
                ("房地产", ["房地产", "地产", "reit", "property", "real estate"]),
                ("矿产", ["矿", "采矿", "金属", "steel", "copper", "aluminum", "mining"]),
            ]
            for concept_name, keywords in rules:
                for kw in keywords:
                    if kw in text:
                        return concept_name
            return "其他"

        added = 0
        updated = 0
        relations_added = 0

        with db_service.get_session() as session:
            for item in stocks:
                code = (item.get("code") or item.get("symbol") or "").strip().upper()
                name = item.get("name") or ""
                market = item.get("market") or "US"
                industry_name = item.get("group_name") or item.get("industry") or ""
                if not code or not name:
                    continue

                existing = session.query(StockDB).filter(StockDB.code == code).first()
                if existing:
                    existing.name = name
                    existing.market = market
                    existing.is_active = True
                    updated += 1
                else:
                    session.add(StockDB(code=code, name=name, market=market, is_active=True))
                    added += 1
                session.commit()

                concept_name = map_industry_to_concept(industry_name)
                cid = concept_map.get(concept_name)
                if cid:
                    exists_rel = session.query(ConceptStockRelationDB).filter(
                        ConceptStockRelationDB.concept_id == cid,
                        ConceptStockRelationDB.stock_code == code
                    ).first()
                    if not exists_rel:
                        session.add(ConceptStockRelationDB(concept_id=cid, stock_code=code, weight=1.0, is_primary=False))
                        relations_added += 1
                        c = session.query(ConceptDB).filter(ConceptDB.concept_id == cid).first()
                        if c:
                            c.stock_count = (c.stock_count or 0) + 1
                session.commit()

        return {
            "success": True,
            "data": {
                "added_count": added,
                "updated_count": updated,
                "relations_added": relations_added,
            },
            "message": "批量导入完成"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"批量导入股票失败: {e}")
        raise HTTPException(status_code=500, detail="批量导入股票失败")
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
