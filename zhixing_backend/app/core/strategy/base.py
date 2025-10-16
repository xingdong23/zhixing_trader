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

    def _get_confidence(self, score: float) -> str:
        """根据评分获取置信度"""
        if score >= 85:
            return "very_high"
        elif score >= 75:
            return "high"
        elif score >= 65:
            return "medium"
        elif score >= 50:
            return "low"
        else:
            return "very_low"

    def _get_suggested_action(self, score: float) -> str:
        """根据评分获取建议操作"""
        if score >= 80:
            return "strong_buy"
        elif score >= 70:
            return "buy"
        elif score >= 60:
            return "watch"
        else:
            return "hold"

    def _calculate_target_price(self, current_price: float, score: float) -> float:
        """计算目标价格（预期收益比例根据评分调整）"""
        if score >= 85:
            return current_price * 1.15  # 15%收益目标
        elif score >= 75:
            return current_price * 1.12  # 12%收益目标
        elif score >= 65:
            return current_price * 1.10  # 10%收益目标
        else:
            return current_price * 1.08  # 8%收益目标

    def _calculate_stop_loss(self, current_price: float, score: float) -> float:
        """计算止损价格（根据评分调整止损距离）"""
        if score >= 85:
            return current_price * 0.95  # 5%止损
        elif score >= 75:
            return current_price * 0.93  # 7%止损
        elif score >= 65:
            return current_price * 0.92  # 8%止损
        else:
            return current_price * 0.90  # 10%止损

    def _calculate_risk_level(self, score: float) -> int:
        """计算风险等级（1-5，1为最低风险，5为最高风险）"""
        if score >= 85:
            return 2
        elif score >= 75:
            return 3
        elif score >= 65:
            return 4
        else:
            return 5


