"""
专家相关API端点
"""
from typing import Dict, Any, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from loguru import logger
from ....database import db_service
from ....models import ExpertDB, ExpertOpinionDB

router = APIRouter()


@router.get("/")
async def get_experts() -> Dict[str, Any]:
    """获取所有专家列表"""
    try:
        logger.info("获取专家列表")
        
        with db_service.get_session() as session:
            expert_dbs = session.query(ExpertDB).filter(ExpertDB.is_active == True).all()
            
            experts = []
            for expert_db in expert_dbs:
                expert = {
                    "id": expert_db.id,
                    "expert_id": expert_db.expert_id,
                    "name": expert_db.name,
                    "title": expert_db.title,
                    "credibility": expert_db.credibility,
                    "specialties": eval(expert_db.specialties) if expert_db.specialties else [],
                    "description": expert_db.description,
                    "is_verified": expert_db.is_verified,
                    "is_active": expert_db.is_active,
                    "created_at": expert_db.created_at.isoformat(),
                    "updated_at": expert_db.updated_at.isoformat()
                }
                experts.append(expert)
            
            logger.info(f"获取到 {len(experts)} 个专家")
            
            return {
                "success": True,
                "data": {
                    "experts": experts,
                    "total": len(experts)
                },
                "message": "获取专家列表成功"
            }
            
    except Exception as e:
        logger.error(f"获取专家列表失败: {e}")
        raise HTTPException(status_code=500, detail="获取专家列表失败")


@router.post("/")
async def create_expert(expert_data: Dict[str, Any]) -> Dict[str, Any]:
    """创建新专家"""
    try:
        logger.info(f"创建专家: {expert_data}")
        
        # 验证必需字段
        if not expert_data.get("name"):
            raise HTTPException(status_code=400, detail="专家姓名不能为空")
        
        with db_service.get_session() as session:
            # 检查专家是否已存在
            existing_expert = session.query(ExpertDB).filter(
                ExpertDB.name == expert_data["name"],
                ExpertDB.is_active == True
            ).first()
            
            if existing_expert:
                raise HTTPException(status_code=400, detail="专家已存在")
            
            # 生成唯一的expert_id
            expert_count = session.query(ExpertDB).count()
            expert_id = f"expert_{expert_count + 1}_{int(datetime.now().timestamp())}"
            
            # 创建新专家记录
            new_expert_db = ExpertDB(
                expert_id=expert_id,
                name=expert_data.get("name"),
                title=expert_data.get("title", ""),
                credibility=expert_data.get("credibility", 50),
                specialties=str(expert_data.get("specialties", [])),
                description=expert_data.get("description", ""),
                is_verified=expert_data.get("is_verified", False),
                is_active=True
            )
            
            session.add(new_expert_db)
            session.commit()
            session.refresh(new_expert_db)
            
            # 返回创建的专家数据
            new_expert = {
                "id": new_expert_db.id,
                "expert_id": new_expert_db.expert_id,
                "name": new_expert_db.name,
                "title": new_expert_db.title,
                "credibility": new_expert_db.credibility,
                "specialties": eval(new_expert_db.specialties) if new_expert_db.specialties else [],
                "description": new_expert_db.description,
                "is_verified": new_expert_db.is_verified,
                "is_active": new_expert_db.is_active,
                "created_at": new_expert_db.created_at.isoformat(),
                "updated_at": new_expert_db.updated_at.isoformat()
            }
            
            logger.info(f"专家创建成功: {new_expert['name']} (ID: {new_expert['id']})")
            
            return {
                "success": True,
                "data": new_expert,
                "message": "专家创建成功"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建专家失败: {e}")
        raise HTTPException(status_code=500, detail="创建专家失败")


@router.get("/{expert_id}/opinions")
async def get_expert_opinions(expert_id: str) -> Dict[str, Any]:
    """获取专家的所有意见"""
    try:
        logger.info(f"获取专家 {expert_id} 的意见")
        
        with db_service.get_session() as session:
            # 检查专家是否存在
            expert_db = session.query(ExpertDB).filter(
                ExpertDB.expert_id == expert_id,
                ExpertDB.is_active == True
            ).first()
            
            if not expert_db:
                raise HTTPException(status_code=404, detail="专家不存在")
            
            # 获取专家的所有意见
            opinion_dbs = session.query(ExpertOpinionDB).filter(
                ExpertOpinionDB.expert_id == expert_id,
                ExpertOpinionDB.is_active == True
            ).order_by(ExpertOpinionDB.published_at.desc()).all()
            
            opinions = []
            for opinion_db in opinion_dbs:
                opinion = {
                    "id": opinion_db.id,
                    "opinion_id": opinion_db.opinion_id,
                    "stock_code": opinion_db.stock_code,
                    "expert_id": opinion_db.expert_id,
                    "title": opinion_db.title,
                    "content": opinion_db.content,
                    "sentiment": opinion_db.sentiment,
                    "price_guidances": eval(opinion_db.price_guidances) if opinion_db.price_guidances else [],
                    "chart_images": eval(opinion_db.chart_images) if opinion_db.chart_images else [],
                    "published_at": opinion_db.published_at.isoformat(),
                    "source": opinion_db.source,
                    "tags": eval(opinion_db.tags) if opinion_db.tags else [],
                    "is_active": opinion_db.is_active,
                    "priority": opinion_db.priority,
                    "is_bookmarked": opinion_db.is_bookmarked,
                    "created_at": opinion_db.created_at.isoformat(),
                    "updated_at": opinion_db.updated_at.isoformat()
                }
                opinions.append(opinion)
            
            logger.info(f"获取到专家 {expert_id} 的 {len(opinions)} 条意见")
            
            return {
                "success": True,
                "data": {
                    "expert": {
                        "id": expert_db.id,
                        "expert_id": expert_db.expert_id,
                        "name": expert_db.name,
                        "title": expert_db.title
                    },
                    "opinions": opinions,
                    "total": len(opinions)
                },
                "message": "获取专家意见成功"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取专家意见失败: {e}")
        raise HTTPException(status_code=500, detail="获取专家意见失败")


@router.post("/opinions")
async def create_expert_opinion(opinion_data: Dict[str, Any]) -> Dict[str, Any]:
    """创建专家意见"""
    try:
        logger.info(f"创建专家意见: {opinion_data}")
        
        # 验证必需字段
        required_fields = ["stock_code", "expert_id", "title", "content", "sentiment"]
        for field in required_fields:
            if not opinion_data.get(field):
                raise HTTPException(status_code=400, detail=f"{field} 不能为空")
        
        with db_service.get_session() as session:
            # 检查专家是否存在
            expert_db = session.query(ExpertDB).filter(
                ExpertDB.expert_id == opinion_data["expert_id"],
                ExpertDB.is_active == True
            ).first()
            
            if not expert_db:
                raise HTTPException(status_code=404, detail="专家不存在")
            
            # 生成唯一的opinion_id
            opinion_count = session.query(ExpertOpinionDB).count()
            opinion_id = f"opinion_{opinion_count + 1}_{int(datetime.now().timestamp())}"
            
            # 创建新意见记录
            new_opinion_db = ExpertOpinionDB(
                opinion_id=opinion_id,
                stock_code=opinion_data.get("stock_code"),
                expert_id=opinion_data.get("expert_id"),
                title=opinion_data.get("title"),
                content=opinion_data.get("content"),
                sentiment=opinion_data.get("sentiment"),
                price_guidances=str(opinion_data.get("price_guidances", [])),
                chart_images=str(opinion_data.get("chart_images", [])),
                published_at=datetime.fromisoformat(opinion_data.get("published_at", datetime.now().isoformat())),
                source=opinion_data.get("source", ""),
                tags=str(opinion_data.get("tags", [])),
                is_active=True,
                priority=opinion_data.get("priority", "medium"),
                is_bookmarked=opinion_data.get("is_bookmarked", False)
            )
            
            session.add(new_opinion_db)
            session.commit()
            session.refresh(new_opinion_db)
            
            # 返回创建的意见数据
            new_opinion = {
                "id": new_opinion_db.id,
                "opinion_id": new_opinion_db.opinion_id,
                "stock_code": new_opinion_db.stock_code,
                "expert_id": new_opinion_db.expert_id,
                "title": new_opinion_db.title,
                "content": new_opinion_db.content,
                "sentiment": new_opinion_db.sentiment,
                "price_guidances": eval(new_opinion_db.price_guidances) if new_opinion_db.price_guidances else [],
                "chart_images": eval(new_opinion_db.chart_images) if new_opinion_db.chart_images else [],
                "published_at": new_opinion_db.published_at.isoformat(),
                "source": new_opinion_db.source,
                "tags": eval(new_opinion_db.tags) if new_opinion_db.tags else [],
                "is_active": new_opinion_db.is_active,
                "priority": new_opinion_db.priority,
                "is_bookmarked": new_opinion_db.is_bookmarked,
                "created_at": new_opinion_db.created_at.isoformat(),
                "updated_at": new_opinion_db.updated_at.isoformat()
            }
            
            logger.info(f"专家意见创建成功: {new_opinion['title']} (ID: {new_opinion['id']})")
            
            return {
                "success": True,
                "data": new_opinion,
                "message": "专家意见创建成功"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建专家意见失败: {e}")
        raise HTTPException(status_code=500, detail="创建专家意见失败")
