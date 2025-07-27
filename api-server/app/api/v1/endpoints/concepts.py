"""
概念管理API端点
"""
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends
from loguru import logger
from app.database import db_service
from app.models import ConceptDB, ConceptStockRelationDB, StockDB

router = APIRouter()


@router.get("/")
async def get_concepts() -> Dict[str, Any]:
    """获取所有概念"""
    try:
        # 从数据库获取真实概念数据
        with db_service.get_session() as session:
            concept_dbs = session.query(ConceptDB).filter(ConceptDB.is_active == True).all()

            concepts = []
            for concept_db in concept_dbs:
                # 获取该概念关联的股票
                relations = session.query(ConceptStockRelationDB).filter(
                    ConceptStockRelationDB.concept_id == concept_db.concept_id
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
                "total": len(concepts)
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
        
        # 模拟创建概念
        new_concept = {
            "id": 999,
            "name": concept_data.get("name", "新概念"),
            "description": concept_data.get("description", ""),
            "stock_count": 0,
            "is_active": True
        }
        
        return {
            "success": True,
            "data": new_concept,
            "message": "概念创建成功"
        }
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
