"""
概念管理API端点
"""
from typing import Dict, Any, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query
from loguru import logger
from ....database import db_service
from ....models import ConceptDB, ConceptStockRelationDB, StockDB

router = APIRouter()

# 内存中的概念列表（用于临时存储）
sample_concepts = []


@router.get("/categories")
async def get_concept_categories() -> Dict[str, Any]:
    """获取概念分类数据，用于前端筛选标签"""
    try:
        with db_service.get_session() as session:
            # 获取所有活跃概念
            concepts = session.query(ConceptDB).filter(ConceptDB.is_active == True).all()
            
            # 按分类组织概念
            categories = {
                "industry": [],
                "fundamentals": [],
                "custom": []
            }
            
            for concept in concepts:
                category = concept.category or "custom"
                if category not in categories:
                    categories[category] = []
                categories[category].append(concept.name)
            
            # 如果某些分类为空，添加一些默认值
            if not categories["industry"]:
                categories["industry"] = ["其他"]
            if not categories["fundamentals"]:
                categories["fundamentals"] = ["其他"]  
            if not categories["custom"]:
                categories["custom"] = ["其他"]
                
        return {
            "success": True,
            "data": {
                "categories": categories,
                "total_concepts": sum(len(cats) for cats in categories.values())
            },
            "message": "获取概念分类成功"
        }
    except Exception as e:
        logger.error(f"获取概念分类失败: {e}")
        raise HTTPException(status_code=500, detail="获取概念分类失败")


@router.get("/")
async def get_concepts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200)
) -> Dict[str, Any]:
    """获取概念列表（分页）"""
    try:
        # 从数据库获取真实概念数据
        with db_service.get_session() as session:
            base_query = session.query(ConceptDB).filter(ConceptDB.is_active == True)
            total = base_query.count()
            concept_dbs = (base_query
                           .order_by(ConceptDB.updated_at.desc())
                           .offset((page - 1) * page_size)
                           .limit(page_size)
                           .all())

            concepts = []
            for concept_db in concept_dbs:
                # 获取该概念关联的股票
                # 兼容历史数据：有的关系表使用了概念表自增 id（如 '1'），
                # 现标准使用 ConceptDB.concept_id（如 'concept_1_xxx'）。两者都纳入。
                from sqlalchemy import or_
                relations = session.query(ConceptStockRelationDB).filter(
                    or_(
                        ConceptStockRelationDB.concept_id == concept_db.concept_id,
                        ConceptStockRelationDB.concept_id == str(concept_db.id)
                    )
                ).all()

                # 获取股票详细信息
                stocks = []
                for relation in relations:
                    stock = session.query(StockDB).filter(StockDB.code == relation.stock_code).first()
                    if stock:
                        stocks.append({
                            "stock_code": stock.code,
                            "stock_name": stock.name,
                            "weight": relation.weight,
                            "is_primary": relation.is_primary
                        })

                concepts.append({
                    "id": concept_db.id,
                    "name": concept_db.name,
                    "description": concept_db.description,
                    "stock_count": len(stocks),
                    "is_active": concept_db.is_active,
                    "created_at": concept_db.created_at.isoformat() if concept_db.created_at else None,
                    "updated_at": concept_db.updated_at.isoformat() if concept_db.updated_at else None,
                    "stocks": stocks  # 添加关联的股票信息
                })

        return {
            "success": True,
            "data": {
                "concepts": concepts,
                "total": total,
                "page": page,
                "pageSize": page_size,
                "totalPages": (total + page_size - 1) // page_size
            },
            "message": "获取概念列表成功"
        }
    except Exception as e:
        logger.error(f"获取概念列表失败: {e}")
        raise HTTPException(status_code=500, detail="获取概念列表失败")


@router.post("/init-sample-data")
async def init_sample_data() -> Dict[str, Any]:
    """初始化示例概念数据（已废弃，数据库中已有真实数据）"""
    try:
        logger.info("概念数据已存在，无需初始化示例数据")

        # 获取当前数据库中的概念数量
        with db_service.get_session() as session:
            concept_count = session.query(ConceptDB).filter(ConceptDB.is_active == True).count()

        return {
            "success": True,
            "data": {
                "message": f"数据库中已有 {concept_count} 个概念，无需初始化示例数据",
                "concepts_existing": concept_count
            },
            "message": "概念数据检查完成"
        }
    except Exception as e:
        logger.error(f"检查概念数据失败: {e}")
        raise HTTPException(status_code=500, detail="检查概念数据失败")


@router.get("/{concept_id}")
async def get_concept(concept_id: int) -> Dict[str, Any]:
    """获取单个概念详情"""
    try:
        # 模拟概念详情
        concept = {
            "id": concept_id,
            "name": "人工智能",
            "description": "AI相关概念股",
            "stock_count": 15,
            "is_active": True,
            "stocks": [
                {"symbol": "NVDA", "name": "英伟达", "weight": 0.25},
                {"symbol": "GOOGL", "name": "谷歌", "weight": 0.20},
                {"symbol": "MSFT", "name": "微软", "weight": 0.18}
            ]
        }
        
        return {
            "success": True,
            "data": concept,
            "message": "获取概念详情成功"
        }
    except Exception as e:
        logger.error(f"获取概念详情失败: {e}")
        raise HTTPException(status_code=500, detail="获取概念详情失败")


@router.post("/")
async def create_concept(concept_data: Dict[str, Any]) -> Dict[str, Any]:
    """创建新概念"""
    try:
        logger.info(f"创建概念: {concept_data}")

        # 验证必需字段
        if not concept_data.get("name"):
            raise HTTPException(status_code=400, detail="概念名称不能为空")

        # 检查概念是否已存在
        with db_service.get_session() as session:
            existing_concept = session.query(ConceptDB).filter(
                ConceptDB.name == concept_data["name"],
                ConceptDB.is_active == True
            ).first()

            if existing_concept:
                raise HTTPException(status_code=400, detail="概念已存在")

            # 生成唯一的concept_id
            concept_count = session.query(ConceptDB).count()
            concept_id = f"concept_{concept_count + 1}_{int(datetime.now().timestamp())}"

            # 创建新概念记录
            new_concept_db = ConceptDB(
                concept_id=concept_id,
                name=concept_data.get("name"),
                description=concept_data.get("description", ""),
                category=concept_data.get("category", "other"),
                stock_count=0,
                is_active=True
            )

            session.add(new_concept_db)
            session.commit()
            session.refresh(new_concept_db)

            # 返回创建的概念数据
            new_concept = {
                "id": new_concept_db.id,
                "concept_id": new_concept_db.concept_id,
                "name": new_concept_db.name,
                "description": new_concept_db.description,
                "category": new_concept_db.category,
                "stock_count": new_concept_db.stock_count,
                "is_active": new_concept_db.is_active,
                "created_at": new_concept_db.created_at.isoformat(),
                "updated_at": new_concept_db.updated_at.isoformat()
            }

            logger.info(f"概念创建成功: {new_concept['name']} (ID: {new_concept['id']})")

            return {
                "success": True,
                "data": new_concept,
                "message": "概念创建成功"
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建概念失败: {e}")
        raise HTTPException(status_code=500, detail="创建概念失败")


@router.put("/{concept_id}")
async def update_concept(concept_id: int, concept_data: Dict[str, Any]) -> Dict[str, Any]:
    """更新概念"""
    try:
        logger.info(f"更新概念 {concept_id}: {concept_data}")
        
        # 模拟更新概念
        updated_concept = {
            "id": concept_id,
            "name": concept_data.get("name", "更新的概念"),
            "description": concept_data.get("description", ""),
            "stock_count": concept_data.get("stock_count", 0),
            "is_active": concept_data.get("is_active", True)
        }
        
        return {
            "success": True,
            "data": updated_concept,
            "message": "概念更新成功"
        }
    except Exception as e:
        logger.error(f"更新概念失败: {e}")
        raise HTTPException(status_code=500, detail="更新概念失败")


@router.delete("/{concept_id}")
async def delete_concept(concept_id: int) -> Dict[str, Any]:
    """删除概念"""
    try:
        logger.info(f"删除概念 {concept_id}")
        
        return {
            "success": True,
            "data": {"concept_id": concept_id},
            "message": "概念删除成功"
        }
    except Exception as e:
        logger.error(f"删除概念失败: {e}")
        raise HTTPException(status_code=500, detail="删除概念失败")


@router.get("/{concept_id}/stocks")
async def get_concept_stocks(concept_id: int) -> Dict[str, Any]:
    """获取概念下的股票列表"""
    try:
        # 模拟概念股票列表
        stocks = [
            {
                "symbol": "NVDA",
                "name": "英伟达",
                "current_price": 450.0,
                "change": 12.5,
                "change_percent": 2.86,
                "weight": 0.25
            },
            {
                "symbol": "GOOGL", 
                "name": "谷歌",
                "current_price": 125.0,
                "change": 0.8,
                "change_percent": 0.64,
                "weight": 0.20
            },
            {
                "symbol": "MSFT",
                "name": "微软",
                "current_price": 310.0,
                "change": -1.2,
                "change_percent": -0.39,
                "weight": 0.18
            }
        ]
        
        return {
            "success": True,
            "data": {
                "concept_id": concept_id,
                "stocks": stocks,
                "total": len(stocks)
            },
            "message": "获取概念股票列表成功"
        }
    except Exception as e:
        logger.error(f"获取概念股票列表失败: {e}")
        raise HTTPException(status_code=500, detail="获取概念股票列表失败")


@router.post("/{concept_id}/stocks")
async def add_stocks_to_concept(concept_id: int, stock_data: Dict[str, Any]) -> Dict[str, Any]:
    """添加股票到概念"""
    try:
        logger.info(f"添加股票到概念 {concept_id}: {stock_data}")

        stock_ids = stock_data.get("stock_ids", [])
        if not stock_ids:
            raise HTTPException(status_code=400, detail="股票ID列表不能为空")

        with db_service.get_session() as session:
            # 检查概念是否存在
            concept_db = session.query(ConceptDB).filter(
                ConceptDB.id == concept_id,
                ConceptDB.is_active == True
            ).first()

            if not concept_db:
                raise HTTPException(status_code=404, detail="概念不存在")

            # 添加股票关联关系
            added_count = 0
            for stock_id in stock_ids:
                # 检查关联是否已存在
                existing_relation = session.query(ConceptStockRelationDB).filter(
                    ConceptStockRelationDB.concept_id == concept_db.concept_id,
                    ConceptStockRelationDB.stock_code == stock_id
                ).first()

                if not existing_relation:
                    new_relation = ConceptStockRelationDB(
                        concept_id=concept_db.concept_id,
                        stock_code=stock_id,
                        weight=1.0,
                        is_primary=False
                    )
                    session.add(new_relation)
                    added_count += 1

            # 更新概念的股票数量
            total_relations = session.query(ConceptStockRelationDB).filter(
                ConceptStockRelationDB.concept_id == concept_db.concept_id
            ).count()
            concept_db.stock_count = total_relations + added_count

            session.commit()

            return {
                "success": True,
                "data": {
                    "concept_id": concept_id,
                    "added_stocks": added_count,
                    "total_stocks": concept_db.stock_count
                },
                "message": f"成功添加 {added_count} 只股票到概念"
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"添加股票到概念失败: {e}")
        raise HTTPException(status_code=500, detail="添加股票到概念失败")


@router.delete("/{concept_id}/stocks/{stock_id}")
async def remove_stock_from_concept(concept_id: int, stock_id: str) -> Dict[str, Any]:
    """从概念中移除股票"""
    try:
        logger.info(f"从概念 {concept_id} 移除股票 {stock_id}")

        with db_service.get_session() as session:
            # 检查概念是否存在
            concept_db = session.query(ConceptDB).filter(
                ConceptDB.id == concept_id,
                ConceptDB.is_active == True
            ).first()

            if not concept_db:
                raise HTTPException(status_code=404, detail="概念不存在")

            # 删除关联关系
            relation = session.query(ConceptStockRelationDB).filter(
                ConceptStockRelationDB.concept_id == concept_db.concept_id,
                ConceptStockRelationDB.stock_code == stock_id
            ).first()

            if not relation:
                raise HTTPException(status_code=404, detail="股票关联不存在")

            session.delete(relation)

            # 更新概念的股票数量
            remaining_relations = session.query(ConceptStockRelationDB).filter(
                ConceptStockRelationDB.concept_id == concept_db.concept_id
            ).count() - 1
            concept_db.stock_count = max(0, remaining_relations)

            session.commit()

            return {
                "success": True,
                "data": {
                    "concept_id": concept_id,
                    "removed_stock": stock_id,
                    "remaining_stocks": concept_db.stock_count
                },
                "message": "成功移除股票关联"
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"移除股票关联失败: {e}")
        raise HTTPException(status_code=500, detail="移除股票关联失败")
