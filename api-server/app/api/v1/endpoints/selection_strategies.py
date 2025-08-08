"""
选股策略相关API端点
"""
from typing import Dict, Any, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from loguru import logger
from ....database import db_service
from ....models import SelectionStrategyDB

router = APIRouter()


@router.get("/")
async def get_selection_strategies() -> Dict[str, Any]:
    """获取所有选股策略列表"""
    try:
        logger.info("获取选股策略列表")
        
        with db_service.get_session() as session:
            strategy_dbs = session.query(SelectionStrategyDB).filter(SelectionStrategyDB.is_active == True).all()
            
            strategies = []
            for strategy_db in strategy_dbs:
                strategy = {
                    "id": strategy_db.id,
                    "strategy_id": strategy_db.strategy_id,
                    "name": strategy_db.name,
                    "description": strategy_db.description,
                    "category": strategy_db.category,
                    "conditions": eval(strategy_db.conditions) if strategy_db.conditions else {},
                    "parameters": eval(strategy_db.parameters) if strategy_db.parameters else {},
                    "is_active": strategy_db.is_active,
                    "is_system_default": strategy_db.is_system_default,
                    "usage_count": strategy_db.usage_count,
                    "success_rate": strategy_db.success_rate,
                    "created_at": strategy_db.created_at.isoformat(),
                    "updated_at": strategy_db.updated_at.isoformat()
                }
                strategies.append(strategy)
            
            logger.info(f"获取到 {len(strategies)} 个选股策略")
            
            return {
                "success": True,
                "data": {
                    "strategies": strategies,
                    "total": len(strategies)
                },
                "message": "获取选股策略列表成功"
            }
            
    except Exception as e:
        logger.error(f"获取选股策略列表失败: {e}")
        raise HTTPException(status_code=500, detail="获取选股策略列表失败")


@router.post("/")
async def create_selection_strategy(strategy_data: Dict[str, Any]) -> Dict[str, Any]:
    """创建新选股策略"""
    try:
        logger.info(f"创建选股策略: {strategy_data}")
        
        # 验证必需字段
        required_fields = ["name", "category", "conditions"]
        for field in required_fields:
            if not strategy_data.get(field):
                raise HTTPException(status_code=400, detail=f"{field} 不能为空")
        
        with db_service.get_session() as session:
            # 检查策略是否已存在
            existing_strategy = session.query(SelectionStrategyDB).filter(
                SelectionStrategyDB.name == strategy_data["name"],
                SelectionStrategyDB.is_active == True
            ).first()
            
            if existing_strategy:
                raise HTTPException(status_code=400, detail="选股策略已存在")
            
            # 生成唯一的strategy_id
            strategy_count = session.query(SelectionStrategyDB).count()
            strategy_id = f"strategy_{strategy_count + 1}_{int(datetime.now().timestamp())}"
            
            # 创建新策略记录
            new_strategy_db = SelectionStrategyDB(
                strategy_id=strategy_id,
                name=strategy_data.get("name"),
                description=strategy_data.get("description", ""),
                category=strategy_data.get("category"),
                conditions=str(strategy_data.get("conditions")),
                parameters=str(strategy_data.get("parameters", {})),
                is_active=True,
                is_system_default=strategy_data.get("is_system_default", False),
                usage_count=0,
                success_rate=0.0
            )
            
            session.add(new_strategy_db)
            session.commit()
            session.refresh(new_strategy_db)
            
            # 返回创建的策略数据
            new_strategy = {
                "id": new_strategy_db.id,
                "strategy_id": new_strategy_db.strategy_id,
                "name": new_strategy_db.name,
                "description": new_strategy_db.description,
                "category": new_strategy_db.category,
                "conditions": eval(new_strategy_db.conditions) if new_strategy_db.conditions else {},
                "parameters": eval(new_strategy_db.parameters) if new_strategy_db.parameters else {},
                "is_active": new_strategy_db.is_active,
                "is_system_default": new_strategy_db.is_system_default,
                "usage_count": new_strategy_db.usage_count,
                "success_rate": new_strategy_db.success_rate,
                "created_at": new_strategy_db.created_at.isoformat(),
                "updated_at": new_strategy_db.updated_at.isoformat()
            }
            
            logger.info(f"选股策略创建成功: {new_strategy['name']} (ID: {new_strategy['id']})")
            
            return {
                "success": True,
                "data": new_strategy,
                "message": "选股策略创建成功"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建选股策略失败: {e}")
        raise HTTPException(status_code=500, detail="创建选股策略失败")


@router.put("/{strategy_id}")
async def update_selection_strategy(strategy_id: str, strategy_data: Dict[str, Any]) -> Dict[str, Any]:
    """更新选股策略"""
    try:
        logger.info(f"更新选股策略 {strategy_id}: {strategy_data}")
        
        with db_service.get_session() as session:
            # 查找策略
            strategy_db = session.query(SelectionStrategyDB).filter(
                SelectionStrategyDB.strategy_id == strategy_id,
                SelectionStrategyDB.is_active == True
            ).first()
            
            if not strategy_db:
                raise HTTPException(status_code=404, detail="选股策略不存在")
            
            # 更新字段
            if "name" in strategy_data:
                strategy_db.name = strategy_data["name"]
            if "description" in strategy_data:
                strategy_db.description = strategy_data["description"]
            if "category" in strategy_data:
                strategy_db.category = strategy_data["category"]
            if "conditions" in strategy_data:
                strategy_db.conditions = str(strategy_data["conditions"])
            if "parameters" in strategy_data:
                strategy_db.parameters = str(strategy_data["parameters"])
            if "is_active" in strategy_data:
                strategy_db.is_active = strategy_data["is_active"]
            if "success_rate" in strategy_data:
                strategy_db.success_rate = strategy_data["success_rate"]
            
            strategy_db.updated_at = datetime.utcnow()
            
            session.commit()
            session.refresh(strategy_db)
            
            # 返回更新后的策略数据
            updated_strategy = {
                "id": strategy_db.id,
                "strategy_id": strategy_db.strategy_id,
                "name": strategy_db.name,
                "description": strategy_db.description,
                "category": strategy_db.category,
                "conditions": eval(strategy_db.conditions) if strategy_db.conditions else {},
                "parameters": eval(strategy_db.parameters) if strategy_db.parameters else {},
                "is_active": strategy_db.is_active,
                "is_system_default": strategy_db.is_system_default,
                "usage_count": strategy_db.usage_count,
                "success_rate": strategy_db.success_rate,
                "created_at": strategy_db.created_at.isoformat(),
                "updated_at": strategy_db.updated_at.isoformat()
            }
            
            logger.info(f"选股策略更新成功: {updated_strategy['name']} (ID: {updated_strategy['id']})")
            
            return {
                "success": True,
                "data": updated_strategy,
                "message": "选股策略更新成功"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新选股策略失败: {e}")
        raise HTTPException(status_code=500, detail="更新选股策略失败")


@router.delete("/{strategy_id}")
async def delete_selection_strategy(strategy_id: str) -> Dict[str, Any]:
    """删除选股策略"""
    try:
        logger.info(f"删除选股策略 {strategy_id}")
        
        with db_service.get_session() as session:
            # 查找策略
            strategy_db = session.query(SelectionStrategyDB).filter(
                SelectionStrategyDB.strategy_id == strategy_id,
                SelectionStrategyDB.is_active == True
            ).first()
            
            if not strategy_db:
                raise HTTPException(status_code=404, detail="选股策略不存在")
            
            # 软删除（设置为不活跃）
            strategy_db.is_active = False
            strategy_db.updated_at = datetime.utcnow()
            
            session.commit()
            
            logger.info(f"选股策略删除成功: {strategy_db.name} (ID: {strategy_db.id})")
            
            return {
                "success": True,
                "data": {
                    "strategy_id": strategy_id,
                    "name": strategy_db.name
                },
                "message": "选股策略删除成功"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除选股策略失败: {e}")
        raise HTTPException(status_code=500, detail="删除选股策略失败")


@router.post("/{strategy_id}/execute")
async def execute_selection_strategy(strategy_id: str) -> Dict[str, Any]:
    """执行选股策略"""
    try:
        logger.info(f"执行选股策略 {strategy_id}")
        
        with db_service.get_session() as session:
            # 查找策略
            strategy_db = session.query(SelectionStrategyDB).filter(
                SelectionStrategyDB.strategy_id == strategy_id,
                SelectionStrategyDB.is_active == True
            ).first()
            
            if not strategy_db:
                raise HTTPException(status_code=404, detail="选股策略不存在")
            
            # 增加使用次数
            strategy_db.usage_count += 1
            strategy_db.updated_at = datetime.utcnow()
            
            session.commit()
            
            # 这里应该实现具体的选股逻辑
            # 暂时返回模拟结果
            mock_results = [
                {
                    "stock_code": "AAPL",
                    "stock_name": "苹果公司",
                    "score": 85.5,
                    "confidence": "high",
                    "reasons": ["技术指标良好", "基本面稳健", "符合策略条件"]
                },
                {
                    "stock_code": "TSLA",
                    "stock_name": "特斯拉",
                    "score": 78.2,
                    "confidence": "medium",
                    "reasons": ["成长性强", "技术创新", "市场前景广阔"]
                }
            ]
            
            logger.info(f"选股策略执行成功: {strategy_db.name} (使用次数: {strategy_db.usage_count})")
            
            return {
                "success": True,
                "data": {
                    "strategy_id": strategy_id,
                    "strategy_name": strategy_db.name,
                    "execution_time": datetime.now().isoformat(),
                    "results": mock_results,
                    "total_results": len(mock_results)
                },
                "message": "选股策略执行成功"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"执行选股策略失败: {e}")
        raise HTTPException(status_code=500, detail="执行选股策略失败")
