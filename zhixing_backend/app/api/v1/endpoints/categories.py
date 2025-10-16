"""
分类树API端点
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional
from loguru import logger
from datetime import datetime
import json

from ....database import db_service
from ....models import (
    CategoryDB, CategoryStockRelationDB, StockDB, QuoteDB,
    CategoryCreate, CategoryUpdate, CategoryResponse, CategoryTreeNode,
    CategoryStockRelationCreate, CategoryHeatmapData
)
from ....repositories.kline_repository import KLineRepository
from ....core.container import container

router = APIRouter()


def get_kline_repository() -> KLineRepository:
    """获取K线数据仓库依赖"""
    return container.get_kline_repository()


def generate_category_id(name: str) -> str:
    """生成分类ID"""
    timestamp = int(datetime.now().timestamp() * 1000)
    # 使用拼音或简单处理
    from urllib.parse import quote
    safe_name = quote(name.replace(" ", "_"))
    return f"cat_{safe_name}_{timestamp}"


def update_category_path_and_level(session, category: CategoryDB):
    """更新分类的路径和层级"""
    if not category.parent_id:
        category.path = f"/{category.category_id}"
        category.level = 0
    else:
        parent = session.query(CategoryDB).filter(CategoryDB.category_id == category.parent_id).first()
        if parent:
            category.path = f"{parent.path}/{category.category_id}"
            category.level = parent.level + 1
        else:
            category.path = f"/{category.category_id}"
            category.level = 0


def update_stock_counts(session, category_id: str):
    """更新分类及其祖先的股票数量"""
    def count_stocks_recursive(cat_id: str) -> int:
        """递归计算分类及其所有子分类的股票总数"""
        # 直接关联的股票数
        direct_count = session.query(CategoryStockRelationDB).filter(
            CategoryStockRelationDB.category_id == cat_id
        ).count()
        
        # 子分类的股票数
        children = session.query(CategoryDB).filter(CategoryDB.parent_id == cat_id).all()
        child_count = sum(count_stocks_recursive(child.category_id) for child in children)
        
        # 更新当前分类
        category = session.query(CategoryDB).filter(CategoryDB.category_id == cat_id).first()
        if category:
            category.stock_count = direct_count
            category.total_stock_count = direct_count + child_count
        
        return direct_count + child_count
    
    # 从当前分类开始向上更新
    category = session.query(CategoryDB).filter(CategoryDB.category_id == category_id).first()
    if category:
        count_stocks_recursive(category_id)
        
        # 更新祖先分类
        current = category
        while current.parent_id:
            parent = session.query(CategoryDB).filter(CategoryDB.category_id == current.parent_id).first()
            if parent:
                count_stocks_recursive(parent.category_id)
                current = parent
            else:
                break
    
    session.commit()


@router.post("/")
async def create_category(category_data: CategoryCreate) -> Dict[str, Any]:
    """创建新分类"""
    try:
        with db_service.get_session() as session:
            # 检查父分类是否存在
            if category_data.parent_id:
                parent = session.query(CategoryDB).filter(
                    CategoryDB.category_id == category_data.parent_id
                ).first()
                if not parent:
                    raise HTTPException(status_code=404, detail="父分类不存在")
            
            # 生成分类ID
            category_id = generate_category_id(category_data.name)
            
            # 创建分类
            new_category = CategoryDB(
                category_id=category_id,
                name=category_data.name,
                parent_id=category_data.parent_id,
                icon=category_data.icon,
                color=category_data.color,
                description=category_data.description,
                sort_order=category_data.sort_order,
                stock_count=0,
                total_stock_count=0,
                is_active=True,
                is_custom=True
            )
            
            session.add(new_category)
            session.commit()
            session.refresh(new_category)
            
            # 更新路径和层级
            update_category_path_and_level(session, new_category)
            session.commit()
            session.refresh(new_category)
            
            return {
                "success": True,
                "data": {
                    "id": new_category.id,
                    "category_id": new_category.category_id,
                    "name": new_category.name,
                    "parent_id": new_category.parent_id,
                    "path": new_category.path,
                    "level": new_category.level
                },
                "message": "分类创建成功"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建分类失败: {e}")
        raise HTTPException(status_code=500, detail=f"创建分类失败: {str(e)}")


@router.get("/")
async def get_categories(
    parent_id: Optional[str] = Query(None, description="父分类ID，NULL获取根节点"),
    flat: bool = Query(False, description="是否返回扁平列表而非树形结构")
) -> Dict[str, Any]:
    """获取分类列表或树形结构"""
    try:
        with db_service.get_session() as session:
            if flat:
                # 返回扁平列表
                categories = session.query(CategoryDB).filter(
                    CategoryDB.is_active == True
                ).order_by(CategoryDB.level, CategoryDB.sort_order).all()
                
                result = []
                for cat in categories:
                    result.append({
                        "id": cat.id,
                        "category_id": cat.category_id,
                        "name": cat.name,
                        "parent_id": cat.parent_id,
                        "path": cat.path,
                        "level": cat.level,
                        "sort_order": cat.sort_order,
                        "icon": cat.icon,
                        "color": cat.color,
                        "description": cat.description,
                        "stock_count": cat.stock_count,
                        "total_stock_count": cat.total_stock_count,
                        "is_active": cat.is_active,
                        "is_custom": cat.is_custom
                    })
                
                return {
                    "success": True,
                    "data": result,
                    "message": "获取分类列表成功"
                }
            else:
                # 返回树形结构
                def build_tree(parent_id: Optional[str]) -> List[Dict]:
                    query = session.query(CategoryDB).filter(CategoryDB.is_active == True)
                    if parent_id is None:
                        query = query.filter(CategoryDB.parent_id.is_(None))
                    else:
                        query = query.filter(CategoryDB.parent_id == parent_id)
                    
                    categories = query.order_by(CategoryDB.sort_order).all()
                    
                    result = []
                    for cat in categories:
                        node = {
                            "id": cat.id,
                            "category_id": cat.category_id,
                            "name": cat.name,
                            "parent_id": cat.parent_id,
                            "path": cat.path,
                            "level": cat.level,
                            "sort_order": cat.sort_order,
                            "icon": cat.icon,
                            "color": cat.color,
                            "description": cat.description,
                            "stock_count": cat.stock_count,
                            "total_stock_count": cat.total_stock_count,
                            "is_active": cat.is_active,
                            "is_custom": cat.is_custom,
                            "children": build_tree(cat.category_id)
                        }
                        result.append(node)
                    
                    return result
                
                tree = build_tree(parent_id)
                
                return {
                    "success": True,
                    "data": tree,
                    "message": "获取分类树成功"
                }
                
    except Exception as e:
        logger.error(f"获取分类失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取分类失败: {str(e)}")


@router.get("/{category_id}")
async def get_category(category_id: str) -> Dict[str, Any]:
    """获取分类详情"""
    try:
        with db_service.get_session() as session:
            category = session.query(CategoryDB).filter(
                CategoryDB.category_id == category_id
            ).first()
            
            if not category:
                raise HTTPException(status_code=404, detail="分类不存在")
            
            return {
                "success": True,
                "data": {
                    "id": category.id,
                    "category_id": category.category_id,
                    "name": category.name,
                    "parent_id": category.parent_id,
                    "path": category.path,
                    "level": category.level,
                    "sort_order": category.sort_order,
                    "icon": category.icon,
                    "color": category.color,
                    "description": category.description,
                    "stock_count": category.stock_count,
                    "total_stock_count": category.total_stock_count,
                    "is_active": category.is_active,
                    "is_custom": category.is_custom,
                    "created_at": category.created_at.isoformat() if category.created_at else None,
                    "updated_at": category.updated_at.isoformat() if category.updated_at else None
                },
                "message": "获取分类详情成功"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取分类详情失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取分类详情失败: {str(e)}")


@router.put("/{category_id}")
async def update_category(category_id: str, category_data: CategoryUpdate) -> Dict[str, Any]:
    """更新分类"""
    try:
        with db_service.get_session() as session:
            category = session.query(CategoryDB).filter(
                CategoryDB.category_id == category_id
            ).first()
            
            if not category:
                raise HTTPException(status_code=404, detail="分类不存在")
            
            # 更新字段
            if category_data.name is not None:
                category.name = category_data.name
            if category_data.parent_id is not None:
                # 检查是否会形成循环
                if category_data.parent_id == category_id:
                    raise HTTPException(status_code=400, detail="不能将分类设置为自己的子分类")
                
                # 检查新父分类是否存在
                parent = session.query(CategoryDB).filter(
                    CategoryDB.category_id == category_data.parent_id
                ).first()
                if not parent:
                    raise HTTPException(status_code=404, detail="父分类不存在")
                
                category.parent_id = category_data.parent_id
                
            if category_data.icon is not None:
                category.icon = category_data.icon
            if category_data.color is not None:
                category.color = category_data.color
            if category_data.description is not None:
                category.description = category_data.description
            if category_data.sort_order is not None:
                category.sort_order = category_data.sort_order
            if category_data.is_active is not None:
                category.is_active = category_data.is_active
            
            category.updated_at = datetime.utcnow()
            
            # 如果父分类改变，更新路径和层级
            if category_data.parent_id is not None:
                update_category_path_and_level(session, category)
                
                # 递归更新所有子分类的路径和层级
                def update_children(parent_cat: CategoryDB):
                    children = session.query(CategoryDB).filter(
                        CategoryDB.parent_id == parent_cat.category_id
                    ).all()
                    for child in children:
                        update_category_path_and_level(session, child)
                        update_children(child)
                
                update_children(category)
            
            session.commit()
            session.refresh(category)
            
            return {
                "success": True,
                "data": {
                    "id": category.id,
                    "category_id": category.category_id,
                    "name": category.name,
                    "parent_id": category.parent_id,
                    "path": category.path,
                    "level": category.level
                },
                "message": "分类更新成功"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新分类失败: {e}")
        raise HTTPException(status_code=500, detail=f"更新分类失败: {str(e)}")


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    force: bool = Query(False, description="是否强制删除（包括子分类）")
) -> Dict[str, Any]:
    """删除分类"""
    try:
        with db_service.get_session() as session:
            category = session.query(CategoryDB).filter(
                CategoryDB.category_id == category_id
            ).first()
            
            if not category:
                raise HTTPException(status_code=404, detail="分类不存在")
            
            # 检查是否有子分类
            children = session.query(CategoryDB).filter(
                CategoryDB.parent_id == category_id
            ).count()
            
            if children > 0 and not force:
                raise HTTPException(
                    status_code=400,
                    detail="该分类下有子分类，请先删除子分类或使用force=true强制删除"
                )
            
            if force:
                # 递归删除所有子分类
                def delete_children(parent_id: str):
                    children = session.query(CategoryDB).filter(
                        CategoryDB.parent_id == parent_id
                    ).all()
                    for child in children:
                        delete_children(child.category_id)
                        # 删除关联的股票
                        session.query(CategoryStockRelationDB).filter(
                            CategoryStockRelationDB.category_id == child.category_id
                        ).delete()
                        session.delete(child)
                
                delete_children(category_id)
            
            # 删除该分类的股票关联
            session.query(CategoryStockRelationDB).filter(
                CategoryStockRelationDB.category_id == category_id
            ).delete()
            
            # 删除分类
            session.delete(category)
            session.commit()
            
            # 更新父分类的股票数量
            if category.parent_id:
                update_stock_counts(session, category.parent_id)
            
            return {
                "success": True,
                "message": "分类删除成功"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除分类失败: {e}")
        raise HTTPException(status_code=500, detail=f"删除分类失败: {str(e)}")


@router.post("/{category_id}/stocks")
async def add_stock_to_category(
    category_id: str,
    relation_data: CategoryStockRelationCreate
) -> Dict[str, Any]:
    """将股票添加到分类"""
    try:
        with db_service.get_session() as session:
            # 检查分类是否存在
            category = session.query(CategoryDB).filter(
                CategoryDB.category_id == category_id
            ).first()
            if not category:
                raise HTTPException(status_code=404, detail="分类不存在")
            
            # 检查股票是否存在
            stock = session.query(StockDB).filter(
                StockDB.code == relation_data.stock_code
            ).first()
            if not stock:
                raise HTTPException(status_code=404, detail="股票不存在")
            
            # 检查关联是否已存在
            existing = session.query(CategoryStockRelationDB).filter(
                CategoryStockRelationDB.category_id == category_id,
                CategoryStockRelationDB.stock_code == relation_data.stock_code
            ).first()
            
            if existing:
                raise HTTPException(status_code=400, detail="股票已在该分类中")
            
            # 创建关联
            new_relation = CategoryStockRelationDB(
                category_id=category_id,
                stock_code=relation_data.stock_code,
                weight=relation_data.weight,
                is_primary=relation_data.is_primary,
                notes=relation_data.notes
            )
            
            session.add(new_relation)
            session.commit()
            
            # 更新分类的股票数量
            update_stock_counts(session, category_id)
            
            return {
                "success": True,
                "message": "股票添加到分类成功"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"添加股票到分类失败: {e}")
        raise HTTPException(status_code=500, detail=f"添加股票到分类失败: {str(e)}")


@router.delete("/{category_id}/stocks/{stock_code}")
async def remove_stock_from_category(category_id: str, stock_code: str) -> Dict[str, Any]:
    """从分类中移除股票"""
    try:
        with db_service.get_session() as session:
            relation = session.query(CategoryStockRelationDB).filter(
                CategoryStockRelationDB.category_id == category_id,
                CategoryStockRelationDB.stock_code == stock_code
            ).first()
            
            if not relation:
                raise HTTPException(status_code=404, detail="股票不在该分类中")
            
            session.delete(relation)
            session.commit()
            
            # 更新分类的股票数量
            update_stock_counts(session, category_id)
            
            return {
                "success": True,
                "message": "股票从分类中移除成功"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"从分类中移除股票失败: {e}")
        raise HTTPException(status_code=500, detail=f"从分类中移除股票失败: {str(e)}")


@router.get("/{category_id}/stocks")
async def get_category_stocks(
    category_id: str,
    include_children: bool = Query(False, description="是否包含子分类的股票"),
    kline_repository: KLineRepository = Depends(get_kline_repository)
) -> Dict[str, Any]:
    """获取分类下的股票列表（包含价格数据）"""
    try:
        with db_service.get_session() as session:
            category = session.query(CategoryDB).filter(
                CategoryDB.category_id == category_id
            ).first()
            
            if not category:
                raise HTTPException(status_code=404, detail="分类不存在")
            
            stock_codes = set()
            
            # 获取直接关联的股票
            relations = session.query(CategoryStockRelationDB).filter(
                CategoryStockRelationDB.category_id == category_id
            ).all()
            stock_codes.update(rel.stock_code for rel in relations)
            
            # 如果包含子分类
            if include_children:
                def get_children_stocks(parent_id: str):
                    children = session.query(CategoryDB).filter(
                        CategoryDB.parent_id == parent_id
                    ).all()
                    for child in children:
                        child_relations = session.query(CategoryStockRelationDB).filter(
                            CategoryStockRelationDB.category_id == child.category_id
                        ).all()
                        stock_codes.update(rel.stock_code for rel in child_relations)
                        get_children_stocks(child.category_id)
                
                get_children_stocks(category_id)
            
            # 获取股票详情
            stocks = []
            if stock_codes:
                stock_list = session.query(StockDB).filter(
                    StockDB.code.in_(list(stock_codes)),
                    StockDB.is_active == True
                ).all()
                
                # 获取价格数据
                stock_codes_list = [s.code for s in stock_list]
                latest_kline_prices = {}
                if stock_codes_list:
                    latest_kline_prices = await kline_repository.get_latest_price_data(stock_codes_list)
                
                for stock in stock_list:
                    # 获取价格和涨跌幅数据
                    kline_data = latest_kline_prices.get(stock.code)
                    price = None
                    change_percent = None
                    
                    if kline_data:
                        price = kline_data.get('price')
                        change_percent = kline_data.get('change_percent')
                    
                    stocks.append({
                        "id": stock.id,
                        "symbol": stock.code,
                        "code": stock.code,
                        "name": stock.name,
                        "market": stock.market,
                        "group_name": stock.group_name,
                        "price": price,
                        "change_percent": change_percent
                    })
            
            return {
                "success": True,
                "data": {
                    "category_id": category_id,
                    "category_name": category.name,
                    "stocks": stocks,
                    "total": len(stocks)
                },
                "message": "获取分类股票列表成功"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取分类股票列表失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取分类股票列表失败: {str(e)}")


@router.get("/heatmap/data")
async def get_heatmap_data(
    kline_repository: KLineRepository = Depends(get_kline_repository)
) -> Dict[str, Any]:
    """获取分类热力图数据"""
    try:
        with db_service.get_session() as session:
            # 获取所有活跃分类
            categories = session.query(CategoryDB).filter(
                CategoryDB.is_active == True
            ).all()
            
            heatmap_data = []
            
            for category in categories:
                # 获取该分类下的所有股票
                relations = session.query(CategoryStockRelationDB).filter(
                    CategoryStockRelationDB.category_id == category.category_id
                ).all()
                
                if not relations:
                    continue
                
                stock_codes = [rel.stock_code for rel in relations]
                weights = {rel.stock_code: rel.weight for rel in relations}
                
                # 获取股票的最新价格数据
                price_data = await kline_repository.get_latest_price_data(stock_codes)
                
                # 计算统计数据
                total_weight = 0
                weighted_change = 0
                rising = 0
                falling = 0
                unchanged = 0
                changes = []
                
                for stock_code in stock_codes:
                    if stock_code in price_data:
                        data = price_data[stock_code]
                        change_percent = data.get('change_percent', 0)
                        if change_percent is not None:
                            changes.append(change_percent)
                            weight = weights.get(stock_code, 1.0)
                            total_weight += weight
                            weighted_change += change_percent * weight
                            
                            if change_percent > 0:
                                rising += 1
                            elif change_percent < 0:
                                falling += 1
                            else:
                                unchanged += 1
                
                if not changes:
                    continue
                
                avg_change = sum(changes) / len(changes)
                weighted_avg_change = weighted_change / total_weight if total_weight > 0 else 0
                max_change = max(changes)
                min_change = min(changes)
                
                # 计算热度等级 (1-10)
                heat_level = min(10, max(1, int((abs(weighted_avg_change) / 5) * 10) + 1))
                
                # 确定颜色
                if weighted_avg_change > 0:
                    # 红色系（上涨）
                    intensity = min(255, int((weighted_avg_change / 10) * 255))
                    color = f"rgb({intensity}, 0, 0)"
                elif weighted_avg_change < 0:
                    # 绿色系（下跌）
                    intensity = min(255, int((abs(weighted_avg_change) / 10) * 255))
                    color = f"rgb(0, {intensity}, 0)"
                else:
                    color = "rgb(128, 128, 128)"
                
                heatmap_data.append({
                    "category_id": category.category_id,
                    "name": category.name,
                    "path": category.path,
                    "level": category.level,
                    "parent_id": category.parent_id,
                    "stock_count": len(stock_codes),
                    "avg_change_percent": round(avg_change, 2),
                    "weighted_change_percent": round(weighted_avg_change, 2),
                    "total_market_value": 0,  # TODO: 计算市值
                    "rising_count": rising,
                    "falling_count": falling,
                    "unchanged_count": unchanged,
                    "max_change_percent": round(max_change, 2),
                    "min_change_percent": round(min_change, 2),
                    "heat_level": heat_level,
                    "color": color
                })
            
            # 按加权涨跌幅排序
            heatmap_data.sort(key=lambda x: x["weighted_change_percent"], reverse=True)
            
            return {
                "success": True,
                "data": heatmap_data,
                "message": "获取热力图数据成功"
            }
            
    except Exception as e:
        logger.error(f"获取热力图数据失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取热力图数据失败: {str(e)}")


@router.post("/batch-import")
async def batch_import_categories(data: Dict[str, Any]) -> Dict[str, Any]:
    """批量导入分类结构"""
    try:
        categories = data.get("categories", [])
        
        if not categories:
            raise HTTPException(status_code=400, detail="分类数据为空")
        
        with db_service.get_session() as session:
            created_count = 0
            
            def create_category_recursive(cat_data: Dict, parent_id: Optional[str] = None):
                nonlocal created_count
                
                # 检查分类是否已存在
                existing = session.query(CategoryDB).filter(
                    CategoryDB.name == cat_data["name"],
                    CategoryDB.parent_id == parent_id
                ).first()
                
                if existing:
                    category_id = existing.category_id
                else:
                    category_id = generate_category_id(cat_data["name"])
                    
                    new_category = CategoryDB(
                        category_id=category_id,
                        name=cat_data["name"],
                        parent_id=parent_id,
                        icon=cat_data.get("icon"),
                        color=cat_data.get("color"),
                        description=cat_data.get("description", ""),
                        sort_order=cat_data.get("sort_order", 0),
                        stock_count=0,
                        total_stock_count=0,
                        is_active=True,
                        is_custom=True
                    )
                    
                    session.add(new_category)
                    session.commit()
                    session.refresh(new_category)
                    
                    update_category_path_and_level(session, new_category)
                    session.commit()
                    
                    created_count += 1
                
                # 递归创建子分类
                for child in cat_data.get("children", []):
                    create_category_recursive(child, category_id)
            
            for cat in categories:
                create_category_recursive(cat)
            
            return {
                "success": True,
                "data": {
                    "created_count": created_count
                },
                "message": f"成功导入 {created_count} 个分类"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"批量导入分类失败: {e}")
        raise HTTPException(status_code=500, detail=f"批量导入分类失败: {str(e)}")

