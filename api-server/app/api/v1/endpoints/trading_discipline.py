"""
交易纪律管理API端点
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query
from loguru import logger

from ....models import (
    TradingPlanCreate, TradingPlanUpdate, TradingPlanResponse,
    TradeRecordCreate, TradeRecordResponse,
    EmotionRecordCreate, EmotionRecordResponse,
    TradingStatsResponse, ApiResponse
)
from ....database import db_service

router = APIRouter()

# ==================== 交易计划管理 ====================

@router.post("/plans", response_model=ApiResponse)
async def create_trading_plan(plan: TradingPlanCreate):
    """创建交易计划"""
    try:
        logger.info(f"Creating trading plan for {plan.stock_code}")
        
        # 验证必填字段
        if not plan.buy_reason or len(plan.buy_reason.strip()) < 10:
            raise HTTPException(status_code=400, detail="买入理由必须至少10个字符")
        
        if plan.position_size <= 0 or plan.position_size > 100:
            raise HTTPException(status_code=400, detail="仓位大小必须在0-100%之间")
        
        if plan.stop_loss_price <= 0:
            raise HTTPException(status_code=400, detail="止损价格必须大于0")
        
        # 转换为字典格式
        plan_data = plan.dict()
        
        # 创建交易计划
        plan_id = db_service.create_trading_plan(plan_data)
        
        if plan_id:
            # 获取创建的计划详情
            created_plan = db_service.get_trading_plan(plan_data['plan_id'] if 'plan_id' in plan_data else str(plan_id))
            if created_plan:
                return ApiResponse(
                    success=True,
                    data={
                        "plan_id": created_plan.plan_id,
                        "plan_score": created_plan.plan_score,
                        "risk_reward_ratio": created_plan.risk_reward_ratio,
                        "is_locked": created_plan.is_locked
                    },
                    message="交易计划创建成功",
                    timestamp=datetime.utcnow().isoformat()
                )
            else:
                raise HTTPException(status_code=500, detail="创建计划后无法获取详情")
        else:
            raise HTTPException(status_code=500, detail="创建交易计划失败")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating trading plan: {e}")
        raise HTTPException(status_code=500, detail=f"创建交易计划失败: {str(e)}")


@router.get("/plans", response_model=ApiResponse)
async def get_trading_plans(
    status: Optional[str] = Query(None, description="计划状态：draft, active, completed, cancelled"),
    limit: int = Query(50, ge=1, le=200, description="返回数量限制")
):
    """获取交易计划列表"""
    try:
        logger.info(f"Getting trading plans with status={status}, limit={limit}")
        
        plans = db_service.get_all_trading_plans(status)
        
        # 转换为响应格式
        plan_responses = []
        for plan in plans[:limit]:
            plan_response = TradingPlanResponse(
                id=plan.id,
                plan_id=plan.plan_id,
                stock_code=plan.stock_code,
                stock_name=plan.stock_name,
                plan_type=plan.plan_type,
                trade_direction=plan.trade_direction,
                trade_type=plan.trade_type,
                buy_reason=plan.buy_reason,
                target_price=plan.target_price,
                position_size=plan.position_size,
                max_position_ratio=plan.max_position_ratio,
                stop_loss_price=plan.stop_loss_price,
                stop_loss_ratio=plan.stop_loss_ratio,
                take_profit_price=plan.take_profit_price,
                take_profit_ratio=plan.take_profit_ratio,
                batch_profit_plan=plan.batch_profit_plan,
                expected_hold_period=plan.expected_hold_period,
                planned_entry_date=plan.planned_entry_date,
                planned_exit_date=plan.planned_exit_date,
                plan_score=plan.plan_score,
                risk_reward_ratio=plan.risk_reward_ratio,
                confidence_level=plan.confidence_level,
                status=plan.status,
                is_locked=plan.is_locked,
                lock_reason=plan.lock_reason,
                related_strategy_id=plan.related_strategy_id,
                related_playbook_id=plan.related_playbook_id,
                created_at=plan.created_at,
                updated_at=plan.updated_at,
                completed_at=plan.completed_at
            )
            plan_responses.append(plan_response)
        
        return ApiResponse(
            success=True,
            data=plan_responses,
            message=f"获取到{len(plan_responses)}个交易计划",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error getting trading plans: {e}")
        raise HTTPException(status_code=500, detail=f"获取交易计划失败: {str(e)}")


@router.get("/plans/{plan_id}", response_model=ApiResponse)
async def get_trading_plan_detail(plan_id: str):
    """获取交易计划详情"""
    try:
        logger.info(f"Getting trading plan detail for {plan_id}")
        
        plan = db_service.get_trading_plan(plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="交易计划不存在")
        
        plan_response = TradingPlanResponse(
            id=plan.id,
            plan_id=plan.plan_id,
            stock_code=plan.stock_code,
            stock_name=plan.stock_name,
            plan_type=plan.plan_type,
            trade_direction=plan.trade_direction,
            trade_type=plan.trade_type,
            buy_reason=plan.buy_reason,
            target_price=plan.target_price,
            position_size=plan.position_size,
            max_position_ratio=plan.max_position_ratio,
            stop_loss_price=plan.stop_loss_price,
            stop_loss_ratio=plan.stop_loss_ratio,
            take_profit_price=plan.take_profit_price,
            take_profit_ratio=plan.take_profit_ratio,
            batch_profit_plan=plan.batch_profit_plan,
            expected_hold_period=plan.expected_hold_period,
            planned_entry_date=plan.planned_entry_date,
            planned_exit_date=plan.planned_exit_date,
            plan_score=plan.plan_score,
            risk_reward_ratio=plan.risk_reward_ratio,
            confidence_level=plan.confidence_level,
            status=plan.status,
            is_locked=plan.is_locked,
            lock_reason=plan.lock_reason,
            related_strategy_id=plan.related_strategy_id,
            related_playbook_id=plan.related_playbook_id,
            created_at=plan.created_at,
            updated_at=plan.updated_at,
            completed_at=plan.completed_at
        )
        
        return ApiResponse(
            success=True,
            data=plan_response,
            message="获取交易计划详情成功",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting trading plan detail: {e}")
        raise HTTPException(status_code=500, detail=f"获取交易计划详情失败: {str(e)}")


@router.put("/plans/{plan_id}", response_model=ApiResponse)
async def update_trading_plan(plan_id: str, update_data: TradingPlanUpdate):
    """更新交易计划"""
    try:
        logger.info(f"Updating trading plan {plan_id}")
        
        # 检查计划是否存在
        existing_plan = db_service.get_trading_plan(plan_id)
        if not existing_plan:
            raise HTTPException(status_code=404, detail="交易计划不存在")
        
        # 如果计划已锁定，不允许修改
        if existing_plan.is_locked:
            raise HTTPException(status_code=400, detail="交易计划已锁定，无法修改")
        
        # 转换为字典格式（只包含非空字段）
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        
        # 更新计划
        success = db_service.update_trading_plan(plan_id, update_dict)
        
        if success:
            return ApiResponse(
                success=True,
                data={"plan_id": plan_id},
                message="交易计划更新成功",
                timestamp=datetime.utcnow().isoformat()
            )
        else:
            raise HTTPException(status_code=500, detail="更新交易计划失败")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating trading plan: {e}")
        raise HTTPException(status_code=500, detail=f"更新交易计划失败: {str(e)}")


@router.post("/plans/{plan_id}/lock", response_model=ApiResponse)
async def lock_trading_plan(
    plan_id: str,
    lock_reason: str = "防止情绪化修改"
):
    """锁定交易计划"""
    try:
        logger.info(f"Locking trading plan {plan_id}")
        
        success = db_service.lock_trading_plan(plan_id, lock_reason)
        
        if success:
            return ApiResponse(
                success=True,
                data={"plan_id": plan_id, "is_locked": True, "lock_reason": lock_reason},
                message="交易计划锁定成功",
                timestamp=datetime.utcnow().isoformat()
            )
        else:
            raise HTTPException(status_code=404, detail="交易计划不存在")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error locking trading plan: {e}")
        raise HTTPException(status_code=500, detail=f"锁定交易计划失败: {str(e)}")


@router.post("/plans/{plan_id}/unlock", response_model=ApiResponse)
async def unlock_trading_plan(plan_id: str):
    """解锁交易计划"""
    try:
        logger.info(f"Unlocking trading plan {plan_id}")
        
        success = db_service.unlock_trading_plan(plan_id)
        
        if success:
            return ApiResponse(
                success=True,
                data={"plan_id": plan_id, "is_locked": False},
                message="交易计划解锁成功",
                timestamp=datetime.utcnow().isoformat()
            )
        else:
            raise HTTPException(status_code=404, detail="交易计划不存在")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unlocking trading plan: {e}")
        raise HTTPException(status_code=500, detail=f"解锁交易计划失败: {str(e)}")


# ==================== 交易记录管理 ====================

@router.post("/trades", response_model=ApiResponse)
async def create_trade_record(trade: TradeRecordCreate):
    """创建交易记录"""
    try:
        logger.info(f"Creating trade record for plan {trade.plan_id}")
        
        # 验证关联的计划是否存在
        plan = db_service.get_trading_plan(trade.plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="关联的交易计划不存在")
        
        # 转换为字典格式
        trade_data = trade.dict()
        
        # 创建交易记录
        trade_id = db_service.create_trade_record(trade_data)
        
        if trade_id:
            return ApiResponse(
                success=True,
                data={
                    "trade_id": trade_id,
                    "execution_score": trade_data.get('execution_score', 0),
                    "is_emotional_trade": trade_data.get('is_emotional_trade', False)
                },
                message="交易记录创建成功",
                timestamp=datetime.utcnow().isoformat()
            )
        else:
            raise HTTPException(status_code=500, detail="创建交易记录失败")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating trade record: {e}")
        raise HTTPException(status_code=500, detail=f"创建交易记录失败: {str(e)}")


@router.get("/trades", response_model=ApiResponse)
async def get_trade_records(
    plan_id: Optional[str] = Query(None, description="关联的交易计划ID"),
    limit: int = Query(50, ge=1, le=200, description="返回数量限制")
):
    """获取交易记录列表"""
    try:
        logger.info(f"Getting trade records for plan={plan_id}, limit={limit}")
        
        trades = db_service.get_trade_records(plan_id, limit)
        
        # 转换为响应格式
        trade_responses = []
        for trade in trades:
            trade_response = TradeRecordResponse(
                id=trade.id,
                trade_id=trade.trade_id,
                plan_id=trade.plan_id,
                stock_code=trade.stock_code,
                stock_name=trade.stock_name,
                trade_direction=trade.trade_direction,
                trade_type=trade.trade_type,
                actual_price=trade.actual_price,
                actual_quantity=trade.actual_quantity,
                actual_amount=trade.actual_amount,
                commission=trade.commission,
                executed_at=trade.executed_at,
                execution_score=trade.execution_score,
                plan_deviation_ratio=trade.plan_deviation_ratio,
                is_emotional_trade=trade.is_emotional_trade,
                emotional_factors=trade.emotional_factors,
                execution_notes=trade.execution_notes,
                deviation_reason=trade.deviation_reason,
                created_at=trade.created_at,
                updated_at=trade.updated_at
            )
            trade_responses.append(trade_response)
        
        return ApiResponse(
            success=True,
            data=trade_responses,
            message=f"获取到{len(trade_responses)}个交易记录",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error getting trade records: {e}")
        raise HTTPException(status_code=500, detail=f"获取交易记录失败: {str(e)}")


# ==================== 情绪记录管理 ====================

@router.post("/emotions", response_model=ApiResponse)
async def create_emotion_record(emotion: EmotionRecordCreate):
    """创建情绪记录"""
    try:
        logger.info(f"Creating emotion record: {emotion.emotion_type}")
        
        # 验证情绪强度
        if emotion.emotion_intensity < 1 or emotion.emotion_intensity > 10:
            raise HTTPException(status_code=400, detail="情绪强度必须在1-10之间")
        
        # 转换为字典格式
        emotion_data = emotion.dict()
        
        # 创建情绪记录
        record_id = db_service.create_emotion_record(emotion_data)
        
        if record_id:
            return ApiResponse(
                success=True,
                data={
                    "record_id": record_id,
                    "emotion_type": emotion.emotion_type,
                    "emotion_intensity": emotion.emotion_intensity,
                    "intervention_taken": emotion.intervention_taken
                },
                message="情绪记录创建成功",
                timestamp=datetime.utcnow().isoformat()
            )
        else:
            raise HTTPException(status_code=500, detail="创建情绪记录失败")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating emotion record: {e}")
        raise HTTPException(status_code=500, detail=f"创建情绪记录失败: {str(e)}")


@router.get("/emotions", response_model=ApiResponse)
async def get_emotion_records(
    trade_id: Optional[str] = Query(None, description="关联的交易记录ID"),
    limit: int = Query(100, ge=1, le=500, description="返回数量限制")
):
    """获取情绪记录列表"""
    try:
        logger.info(f"Getting emotion records for trade={trade_id}, limit={limit}")
        
        emotions = db_service.get_emotion_records(trade_id, limit)
        
        # 转换为响应格式
        emotion_responses = []
        for emotion in emotions:
            emotion_response = EmotionRecordResponse(
                id=emotion.id,
                record_id=emotion.record_id,
                trade_id=emotion.trade_id,
                plan_id=emotion.plan_id,
                emotion_type=emotion.emotion_type,
                emotion_intensity=emotion.emotion_intensity,
                emotion_description=emotion.emotion_description,
                trigger_factors=emotion.trigger_factors,
                trigger_source=emotion.trigger_source,
                recorded_at=emotion.recorded_at,
                trade_phase=emotion.trade_phase,
                intervention_taken=emotion.intervention_taken,
                intervention_type=emotion.intervention_type,
                intervention_effectiveness=emotion.intervention_effectiveness,
                rationality_score=emotion.rationality_score,
                confidence_score=emotion.confidence_score,
                stress_level=emotion.stress_level,
                created_at=emotion.created_at
            )
            emotion_responses.append(emotion_response)
        
        return ApiResponse(
            success=True,
            data=emotion_responses,
            message=f"获取到{len(emotion_responses)}个情绪记录",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error getting emotion records: {e}")
        raise HTTPException(status_code=500, detail=f"获取情绪记录失败: {str(e)}")


# ==================== 交易统计 ====================

@router.get("/statistics", response_model=ApiResponse)
async def get_trading_statistics():
    """获取交易统计信息"""
    try:
        logger.info("Getting trading statistics")
        
        stats = db_service.get_trading_statistics()
        
        stats_response = TradingStatsResponse(
            total_trades=stats.get('total_trades', 0),
            successful_trades=stats.get('successful_trades', 0),
            success_rate=stats.get('success_rate', 0.0),
            total_profit_loss=stats.get('total_profit_loss', 0.0),
            average_profit_loss=stats.get('average_profit_loss', 0.0),
            max_profit=stats.get('max_profit', 0.0),
            max_loss=stats.get('max_loss', 0.0),
            emotional_trades_count=stats.get('emotional_trades_count', 0),
            emotional_trades_ratio=stats.get('emotional_trades_ratio', 0.0),
            plan_compliance_rate=stats.get('plan_compliance_rate', 0.0),
            average_execution_score=stats.get('average_execution_score', 0.0),
            current_discipline_score=stats.get('current_discipline_score', 0.0),
            best_performing_stock=stats.get('best_performing_stock'),
            worst_performing_stock=stats.get('worst_performing_stock'),
            monthly_stats=stats.get('monthly_stats')
        )
        
        return ApiResponse(
            success=True,
            data=stats_response,
            message="获取交易统计成功",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error getting trading statistics: {e}")
        raise HTTPException(status_code=500, detail=f"获取交易统计失败: {str(e)}")


# ==================== 情绪化交易检测 ====================

@router.post("/detect-emotional-trade", response_model=ApiResponse)
async def detect_emotional_trade(
    trade_data: dict,
    emotion_factors: dict = {}
):
    """检测情绪化交易"""
    try:
        logger.info("Detecting emotional trade")
        
        # 情绪化交易检测逻辑
        emotional_indicators = []
        
        # 检测追高行为
        if trade_data.get('price_change', 0) > 5:  # 价格上涨超过5%
            emotional_indicators.append({
                "type": "fomo",
                "description": "价格快速上涨时买入，存在FOMO情绪",
                "severity": "high" if trade_data.get('price_change', 0) > 10 else "medium"
            })
        
        # 检测恐慌性卖出
        if trade_data.get('price_change', 0) < -5:  # 价格下跌超过5%
            emotional_indicators.append({
                "type": "panic",
                "description": "价格快速下跌时卖出，存在恐慌情绪",
                "severity": "high" if trade_data.get('price_change', 0) < -10 else "medium"
            })
        
        # 检测无计划交易
        if not trade_data.get('plan_id'):
            emotional_indicators.append({
                "type": "impulsive",
                "description": "没有交易计划的随机交易",
                "severity": "high"
            })
        
        # 检测过度交易
        # 这里需要查询用户今日交易次数
        # today_trades = get_today_trades_count()
        # if today_trades > 3:
        #     emotional_indicators.append({
        #         "type": "overtrading",
        #         "description": f"今日已交易{today_trades}次，存在过度交易倾向",
        #         "severity": "medium"
        #     })
        
        # 计算情绪化交易概率
        emotional_probability = len(emotional_indicators) * 25  # 每个指标25%
        emotional_probability = min(emotional_probability, 100)
        
        # 生成干预建议
        intervention_suggestions = []
        if emotional_probability > 50:
            intervention_suggestions.append("建议进行30分钟冷静期")
            intervention_suggestions.append("回顾交易计划和策略")
            intervention_suggestions.append("评估当前心理状态")
        
        if emotional_probability > 75:
            intervention_suggestions.append("暂停交易，进行心理调节")
            intervention_suggestions.append("咨询交易社区或专业建议")
        
        return ApiResponse(
            success=True,
            data={
                "is_emotional": emotional_probability > 30,
                "emotional_probability": emotional_probability,
                "emotional_indicators": emotional_indicators,
                "intervention_suggestions": intervention_suggestions,
                "risk_level": "high" if emotional_probability > 75 else "medium" if emotional_probability > 30 else "low"
            },
            message="情绪化交易检测完成",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error detecting emotional trade: {e}")
        raise HTTPException(status_code=500, detail=f"情绪化交易检测失败: {str(e)}")