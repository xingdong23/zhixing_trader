"""
策略服务
负责策略的管理和执行
"""
from typing import List, Dict, Optional, Any
from datetime import datetime
from loguru import logger

from ..core.interfaces import (
    IStrategyEngine, IStockRepository, IKLineRepository, 
    IMarketDataProvider, SelectionResult
)
from ..core.strategy.engine import StrategyEngine, StrategyFactory
from ..database import db_service


class StrategyService:
    """策略服务实现"""
    
    def __init__(
        self,
        stock_repository: IStockRepository,
        kline_repository: IKLineRepository,
        market_data_provider: IMarketDataProvider
    ):
        self.stock_repository = stock_repository
        self.kline_repository = kline_repository
        self.market_data_provider = market_data_provider
        
        # 初始化策略引擎
        self.strategy_engine = StrategyEngine(
            stock_repository,
            kline_repository,
            market_data_provider
        )
        
        # 从数据库加载启用的策略
        self._load_enabled_strategies_from_db()

        # 任务状态管理（内存，页面刷新可恢复；服务重启后清空）
        # task_id -> status
        self._task_status: Dict[str, Dict[str, Any]] = {}
        # strategy_id -> last task_id
        self._last_task_by_strategy: Dict[int, str] = {}
    
    def _load_enabled_strategies_from_db(self):
        """从数据库加载启用的策略并注册到引擎"""
        try:
            enabled = db_service.get_enabled_strategies()
            for s in enabled:
                import json
                config = json.loads(s.configuration) if s.configuration else {}
                strategy = StrategyFactory.create_strategy(s.impl_type, config)
                if strategy is not None:
                    # 设置策略ID，便于结果落库时引用
                    if hasattr(strategy, 'strategy_id'):
                        strategy.strategy_id = s.id
                    self.strategy_engine.register_strategy(s.id, strategy)
                    logger.info(f"策略已加载: id={s.id}, type={s.impl_type}, name={s.name}")
                else:
                    logger.warning(f"未能创建策略: id={s.id}, type={s.impl_type}")
        except Exception as e:
            logger.error(f"加载启用策略失败: {e}")
    
    async def execute_strategy(self, strategy_id: int) -> List[SelectionResult]:
        """执行策略"""
        try:
            return await self.strategy_engine.execute_strategy(strategy_id)
        except Exception as e:
            logger.error(f"执行策略 {strategy_id} 失败: {e}")
            return []
    
    async def execute_all_strategies(self) -> Dict[str, List[SelectionResult]]:
        """执行所有策略"""
        try:
            return await self.strategy_engine.execute_all_strategies()
        except Exception as e:
            logger.error(f"执行所有策略失败: {e}")
            return {}

    # ==================== 异步执行与进度 ====================

    def _init_task(self, strategy_id: int) -> str:
        import uuid
        task_id = str(uuid.uuid4())
        self._task_status[task_id] = {
            "task_id": task_id,
            "strategy_id": strategy_id,
            "state": "pending",
            "started_at": datetime.now().isoformat(),
            "finished_at": None,
            "processed": 0,
            "total": 0,
            "percent": 0.0,
            "current_symbol": None,
            "errors": [],
            "result_count": 0,
        }
        self._last_task_by_strategy[strategy_id] = task_id
        return task_id

    def _update_task(self, task_id: str, **fields: Any) -> None:
        if task_id in self._task_status:
            self._task_status[task_id].update(fields)

    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        return self._task_status.get(task_id, {"task_id": task_id, "state": "not_found"})

    def get_last_task_status(self, strategy_id: int) -> Dict[str, Any]:
        tid = self._last_task_by_strategy.get(strategy_id)
        if not tid:
            return {"state": "none"}
        return self.get_task_status(tid)

    async def execute_strategy_async(self, strategy_id: int) -> str:
        """启动异步执行并返回 task_id"""
        task_id = self._init_task(strategy_id)

        async def progress_callback(current: int, total: int, symbol: Optional[str], phase: str):
            percent = float(current) / float(total) * 100 if total else 0.0
            self._update_task(task_id, state="running", processed=current, total=total,
                              percent=round(percent, 1), current_symbol=symbol, phase=phase)

        async def runner():
            try:
                results = await self.strategy_engine.execute_strategy_with_progress(strategy_id, progress_callback)
                self._update_task(task_id, state="completed", finished_at=datetime.now().isoformat(),
                                  result_count=len(results), current_symbol=None)
            except Exception as e:
                logger.error(f"异步执行策略失败: {e}")
                self._update_task(task_id, state="failed", finished_at=datetime.now().isoformat(),
                                  errors=self._task_status[task_id].get("errors", []) + [str(e)])

        import asyncio
        asyncio.create_task(runner())
        return task_id
    
    def get_available_strategies(self) -> List[int]:
        """获取可用策略ID列表"""
        return self.strategy_engine.get_registered_strategies()
    
    def create_custom_strategy(self, strategy_type: str, config: Dict[str, Any]) -> bool:
        """创建自定义策略（临时注册，不落库）"""
        try:
            strategy = StrategyFactory.create_strategy(strategy_type, config)
            if strategy:
                temp_id = max(self.strategy_engine.get_registered_strategies() + [0]) + 1
                self.strategy_engine.register_strategy(temp_id, strategy)
                logger.info(f"创建自定义策略: {strategy.name}, 临时ID={temp_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"创建自定义策略失败: {e}")
            return False
