"""
策略基础类与公共工具
"""
from typing import Dict, List, Any, Optional

from ..interfaces import IStrategy, KLineData
from ..analysis.technical_analyzer import TechnicalAnalyzer


class BaseStrategy(IStrategy):
    """策略基类，提供公共能力"""

    def __init__(self, config: Dict[str, Any], strategy_id: Optional[int] = None):
        self.config = config
        self.strategy_id = strategy_id
        self.analyzer = TechnicalAnalyzer()

    def validate_config(self, config: Dict[str, Any]) -> bool:
        required_fields = ['parameters']
        return all(field in config for field in required_fields)


