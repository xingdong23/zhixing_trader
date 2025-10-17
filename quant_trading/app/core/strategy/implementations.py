"""
具体策略实现（旧文件，将逐步拆分到独立模块）
保留向后兼容一段时间
"""
from typing import Dict, List, Any
from datetime import datetime
from loguru import logger

from ..interfaces import KLineData, SelectionResult
from .base import BaseStrategy


class EMA55PullbackStrategy(BaseStrategy):
    """EMA55回踩企稳策略"""

    @property
    def name(self) -> str:
        return "EMA55回踩企稳策略"

    @property
    def description(self) -> str:
        return "主升浪回踩EMA55不破，1小时级别企稳"

    async def execute(self, stock_data: Dict[str, List[KLineData]]) -> List[SelectionResult]:
        results = []
        execution_time = datetime.now()

        for symbol, data in stock_data.items():
            try:
                daily_data = data.get('daily', [])
                hourly_data = data.get('hourly', [])

                if len(daily_data) < 100 or len(hourly_data) < 100:
                    continue

                analysis_result = self.analyzer.detect_ema55_pullback(daily_data, hourly_data)

                if analysis_result.found and analysis_result.score >= 60:
                    current_price = daily_data[-1].close if daily_data else 0

                    result = SelectionResult(
                        strategy_id=self.strategy_id or 0,
                        stock_symbol=symbol,
                        execution_time=execution_time,
                        score=analysis_result.score,
                        confidence=self._get_confidence(analysis_result.score),
                        reasons=[analysis_result.analysis] if analysis_result.analysis else [],
                        suggested_action=self._get_suggested_action(analysis_result.score),
                        target_price=self._calculate_target_price(current_price, analysis_result.score),
                        stop_loss=self._calculate_stop_loss(current_price, analysis_result.score),
                        current_price=current_price,
                        technical_details=analysis_result.analysis,
                        risk_level=self._calculate_risk_level(analysis_result.score)
                    )

                    results.append(result)
                    logger.debug(f"股票 {symbol} 符合EMA55回踩策略，评分: {analysis_result.score}")

            except Exception as e:
                logger.error(f"分析股票 {symbol} 时发生错误: {e}")
                continue

        results.sort(key=lambda x: x.score, reverse=True)
        return results

    def _calculate_risk_level(self, score: int) -> int:
        if score >= 85:
            return 2
        elif score >= 75:
            return 3
        elif score >= 65:
            return 4
        else:
            return 5
