"""
交易剧本相关API端点
"""
from typing import Dict, Any, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from loguru import logger
from ....database import db_service
from ....models import TradingPlaybookDB

router = APIRouter()


@router.get("/")
async def get_playbooks() -> Dict[str, Any]:
    """获取所有交易剧本列表"""
    try:
        logger.info("获取交易剧本列表")
        
        with db_service.get_session() as session:
            playbook_dbs = session.query(TradingPlaybookDB).filter(TradingPlaybookDB.is_active == True).all()
            
            playbooks = []
            for playbook_db in playbook_dbs:
                playbook = {
                    "id": playbook_db.id,
                    "playbook_id": playbook_db.playbook_id,
                    "name": playbook_db.name,
                    "description": playbook_db.description,
                    "template": eval(playbook_db.template) if playbook_db.template else {},
                    "tags": eval(playbook_db.tags) if playbook_db.tags else [],
                    "is_system_default": playbook_db.is_system_default,
                    "is_active": playbook_db.is_active,
                    "usage_count": playbook_db.usage_count,
                    "performance": eval(playbook_db.performance) if playbook_db.performance else {},
                    "created_at": playbook_db.created_at.isoformat(),
                    "updated_at": playbook_db.updated_at.isoformat()
                }
                playbooks.append(playbook)
            
            logger.info(f"获取到 {len(playbooks)} 个交易剧本")
            
            return {
                "success": True,
                "data": {
                    "playbooks": playbooks,
                    "total": len(playbooks)
                },
                "message": "获取交易剧本列表成功"
            }
            
    except Exception as e:
        logger.error(f"获取交易剧本列表失败: {e}")
        raise HTTPException(status_code=500, detail="获取交易剧本列表失败")


@router.post("/")
async def create_playbook(playbook_data: Dict[str, Any]) -> Dict[str, Any]:
    """创建新交易剧本"""
    try:
        logger.info(f"创建交易剧本: {playbook_data}")
        
        # 验证必需字段
        if not playbook_data.get("name"):
            raise HTTPException(status_code=400, detail="剧本名称不能为空")
        
        if not playbook_data.get("template"):
            raise HTTPException(status_code=400, detail="剧本模板不能为空")
        
        with db_service.get_session() as session:
            # 检查剧本是否已存在
            existing_playbook = session.query(TradingPlaybookDB).filter(
                TradingPlaybookDB.name == playbook_data["name"],
                TradingPlaybookDB.is_active == True
            ).first()
            
            if existing_playbook:
                raise HTTPException(status_code=400, detail="交易剧本已存在")
            
            # 生成唯一的playbook_id
            playbook_count = session.query(TradingPlaybookDB).count()
            playbook_id = f"playbook_{playbook_count + 1}_{int(datetime.now().timestamp())}"
            
            # 创建新剧本记录
            new_playbook_db = TradingPlaybookDB(
                playbook_id=playbook_id,
                name=playbook_data.get("name"),
                description=playbook_data.get("description", ""),
                template=str(playbook_data.get("template")),
                tags=str(playbook_data.get("tags", [])),
                is_system_default=playbook_data.get("is_system_default", False),
                is_active=True,
                usage_count=0,
                performance=str(playbook_data.get("performance", {}))
            )
            
            session.add(new_playbook_db)
            session.commit()
            session.refresh(new_playbook_db)
            
            # 返回创建的剧本数据
            new_playbook = {
                "id": new_playbook_db.id,
                "playbook_id": new_playbook_db.playbook_id,
                "name": new_playbook_db.name,
                "description": new_playbook_db.description,
                "template": eval(new_playbook_db.template) if new_playbook_db.template else {},
                "tags": eval(new_playbook_db.tags) if new_playbook_db.tags else [],
                "is_system_default": new_playbook_db.is_system_default,
                "is_active": new_playbook_db.is_active,
                "usage_count": new_playbook_db.usage_count,
                "performance": eval(new_playbook_db.performance) if new_playbook_db.performance else {},
                "created_at": new_playbook_db.created_at.isoformat(),
                "updated_at": new_playbook_db.updated_at.isoformat()
            }
            
            logger.info(f"交易剧本创建成功: {new_playbook['name']} (ID: {new_playbook['id']})")
            
            return {
                "success": True,
                "data": new_playbook,
                "message": "交易剧本创建成功"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建交易剧本失败: {e}")
        raise HTTPException(status_code=500, detail="创建交易剧本失败")


@router.put("/{playbook_id}")
async def update_playbook(playbook_id: str, playbook_data: Dict[str, Any]) -> Dict[str, Any]:
    """更新交易剧本"""
    try:
        logger.info(f"更新交易剧本 {playbook_id}: {playbook_data}")
        
        with db_service.get_session() as session:
            # 查找剧本
            playbook_db = session.query(TradingPlaybookDB).filter(
                TradingPlaybookDB.playbook_id == playbook_id,
                TradingPlaybookDB.is_active == True
            ).first()
            
            if not playbook_db:
                raise HTTPException(status_code=404, detail="交易剧本不存在")
            
            # 更新字段
            if "name" in playbook_data:
                playbook_db.name = playbook_data["name"]
            if "description" in playbook_data:
                playbook_db.description = playbook_data["description"]
            if "template" in playbook_data:
                playbook_db.template = str(playbook_data["template"])
            if "tags" in playbook_data:
                playbook_db.tags = str(playbook_data["tags"])
            if "is_active" in playbook_data:
                playbook_db.is_active = playbook_data["is_active"]
            if "performance" in playbook_data:
                playbook_db.performance = str(playbook_data["performance"])
            
            playbook_db.updated_at = datetime.utcnow()
            
            session.commit()
            session.refresh(playbook_db)
            
            # 返回更新后的剧本数据
            updated_playbook = {
                "id": playbook_db.id,
                "playbook_id": playbook_db.playbook_id,
                "name": playbook_db.name,
                "description": playbook_db.description,
                "template": eval(playbook_db.template) if playbook_db.template else {},
                "tags": eval(playbook_db.tags) if playbook_db.tags else [],
                "is_system_default": playbook_db.is_system_default,
                "is_active": playbook_db.is_active,
                "usage_count": playbook_db.usage_count,
                "performance": eval(playbook_db.performance) if playbook_db.performance else {},
                "created_at": playbook_db.created_at.isoformat(),
                "updated_at": playbook_db.updated_at.isoformat()
            }
            
            logger.info(f"交易剧本更新成功: {updated_playbook['name']} (ID: {updated_playbook['id']})")
            
            return {
                "success": True,
                "data": updated_playbook,
                "message": "交易剧本更新成功"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新交易剧本失败: {e}")
        raise HTTPException(status_code=500, detail="更新交易剧本失败")


@router.delete("/{playbook_id}")
async def delete_playbook(playbook_id: str) -> Dict[str, Any]:
    """删除交易剧本"""
    try:
        logger.info(f"删除交易剧本 {playbook_id}")
        
        with db_service.get_session() as session:
            # 查找剧本
            playbook_db = session.query(TradingPlaybookDB).filter(
                TradingPlaybookDB.playbook_id == playbook_id,
                TradingPlaybookDB.is_active == True
            ).first()
            
            if not playbook_db:
                raise HTTPException(status_code=404, detail="交易剧本不存在")
            
            # 软删除（设置为不活跃）
            playbook_db.is_active = False
            playbook_db.updated_at = datetime.utcnow()
            
            session.commit()
            
            logger.info(f"交易剧本删除成功: {playbook_db.name} (ID: {playbook_db.id})")
            
            return {
                "success": True,
                "data": {
                    "playbook_id": playbook_id,
                    "name": playbook_db.name
                },
                "message": "交易剧本删除成功"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除交易剧本失败: {e}")
        raise HTTPException(status_code=500, detail="删除交易剧本失败")


@router.post("/{playbook_id}/use")
async def use_playbook(playbook_id: str) -> Dict[str, Any]:
    """使用交易剧本（增加使用次数）"""
    try:
        logger.info(f"使用交易剧本 {playbook_id}")
        
        with db_service.get_session() as session:
            # 查找剧本
            playbook_db = session.query(TradingPlaybookDB).filter(
                TradingPlaybookDB.playbook_id == playbook_id,
                TradingPlaybookDB.is_active == True
            ).first()
            
            if not playbook_db:
                raise HTTPException(status_code=404, detail="交易剧本不存在")
            
            # 增加使用次数
            playbook_db.usage_count += 1
            playbook_db.updated_at = datetime.utcnow()
            
            session.commit()
            
            logger.info(f"交易剧本使用成功: {playbook_db.name} (使用次数: {playbook_db.usage_count})")
            
            return {
                "success": True,
                "data": {
                    "playbook_id": playbook_id,
                    "name": playbook_db.name,
                    "usage_count": playbook_db.usage_count
                },
                "message": "交易剧本使用成功"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"使用交易剧本失败: {e}")
        raise HTTPException(status_code=500, detail="使用交易剧本失败")
