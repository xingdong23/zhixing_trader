"""
状态管理器 - 使用数据库持久化交易状态
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class StateManager:
    """
    交易状态管理器
    使用数据库持久化和恢复交易状态
    """
    
    DEFAULT_STATE = {
        "position": None,           # 'long', 'short', None
        "entry_price": 0.0,
        "entry_time": None,
        "highest_profit_pct": 0.0,
        "last_signal_time": None,
        "trades_today": 0,
    }
    
    def __init__(self, instance_id: str):
        """
        Args:
            instance_id: 实例 ID，用于数据库存储
        """
        self.instance_id = instance_id
        self._state = self.load()
    
    @property
    def state(self) -> Dict[str, Any]:
        """当前状态"""
        return self._state
    
    def load(self) -> Dict[str, Any]:
        """从数据库加载状态"""
        try:
            from db.database import db
            state = db.get_instance_state(self.instance_id)
            logger.info(f"State loaded from database for {self.instance_id}")
            return {**self.DEFAULT_STATE, **state}
        except Exception as e:
            logger.error(f"Failed to load state: {e}")
            return dict(self.DEFAULT_STATE)
    
    def save(self) -> bool:
        """保存状态到数据库"""
        try:
            from db.database import db
            db.save_instance_state(self.instance_id, self._state)
            logger.debug(f"State saved to database for {self.instance_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to save state: {e}")
            return False
    
    def update(self, **kwargs) -> None:
        """更新状态"""
        self._state.update(kwargs)
        self.save()
    
    def reset(self) -> None:
        """重置状态"""
        self._state = dict(self.DEFAULT_STATE)
        self.save()
        logger.info("State reset")
    
    # ==================== 持仓相关 ====================
    
    def has_position(self) -> bool:
        """是否有持仓"""
        return self._state.get('position') is not None
    
    def get_position(self) -> Optional[str]:
        """获取当前持仓方向"""
        return self._state.get('position')
    
    def get_entry_price(self) -> float:
        """获取开仓价格"""
        return self._state.get('entry_price', 0.0)
    
    def open_position(
        self,
        side: str,
        entry_price: float,
        entry_time: datetime = None
    ) -> None:
        """记录开仓"""
        self.update(
            position=side,
            entry_price=entry_price,
            entry_time=entry_time or datetime.now(),
            highest_profit_pct=0.0
        )
        logger.info(f"Position opened: {side} @ {entry_price}")
    
    def close_position(self) -> None:
        """记录平仓"""
        self.update(
            position=None,
            entry_price=0.0,
            entry_time=None,
            highest_profit_pct=0.0
        )
        logger.info("Position closed")
    
    def update_highest_profit(self, pnl_pct: float) -> None:
        """更新最高盈利"""
        current_highest = self._state.get('highest_profit_pct', 0.0)
        if pnl_pct > current_highest:
            self.update(highest_profit_pct=pnl_pct)
    
    # ==================== 交易计数 ====================
    
    def increment_trades_today(self) -> int:
        """增加今日交易计数"""
        current = self._state.get('trades_today', 0)
        self.update(trades_today=current + 1)
        return current + 1
    
    def reset_daily_trades(self) -> None:
        """重置每日交易计数"""
        self.update(trades_today=0)
