"""
具体策略实现
实现各种选股策略的具体算法
"""
from typing import Dict, List, Any
from datetime import datetime
from loguru import logger

from ..interfaces import IStrategy, KLineData, SelectionResult
from ..analysis.technical_analyzer import TechnicalAnalyzer


class BaseStrategy(IStrategy):
    """策略基类"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.analyzer = TechnicalAnalyzer()
    
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """验证策略配置"""
        required_fields = ['parameters']
        return all(field in config for field in required_fields)
    
    def _calculate_target_price(self, current_price: float, score: int) -> float:
        """计算目标价格"""
        target_gain_percent = 0.05 + (score - 60) * 0.15 / 40
        return current_price * (1 + target_gain_percent)
    
    def _calculate_stop_loss(self, current_price: float, score: int) -> float:
        """计算止损价格"""
        stop_loss_percent = 0.12 - (score - 60) * 0.05 / 40
        return current_price * (1 - stop_loss_percent)
    
    def _get_confidence(self, score: int) -> str:
        """获取置信度"""
        if score >= 80:
            return "high"
        elif score >= 65:
            return "medium"
        else:
            return "low"
    
    def _get_suggested_action(self, score: int) -> str:
        """获取建议操作"""
        if score >= 85:
            return "强烈建议买入"
        elif score >= 75:
            return "建议买入"
        elif score >= 65:
            return "可以考虑买入"
        else:
            return "建议观察"


class EMA55PullbackStrategy(BaseStrategy):
    """EMA55回踩企稳策略"""
    
    @property
    def name(self) -> str:
        return "EMA55回踩企稳策略"
    
    @property
    def description(self) -> str:
        return "主升浪回踩EMA55不破，1小时级别企稳"
    
    async def execute(self, stock_data: Dict[str, List[KLineData]]) -> List[SelectionResult]:
        """执行EMA55回踩策略"""
        results = []
        execution_time = datetime.now()
        
        for symbol, data in stock_data.items():
            try:
                daily_data = data.get('daily', [])
                hourly_data = data.get('hourly', [])
                
                if len(daily_data) < 100 or len(hourly_data) < 100:
                    continue
                
                # 执行技术分析
                analysis_result = self.analyzer.detect_ema55_pullback(daily_data, hourly_data)

                if analysis_result.found and analysis_result.score >= 60:
                    current_price = daily_data[-1].close if daily_data else 0
                    
                    result = SelectionResult(
                        strategy_id=1,  # 简化实现
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
        
        # 按评分排序
        results.sort(key=lambda x: x.score, reverse=True)
        return results
    
    def _calculate_risk_level(self, score: int) -> int:
        """计算风险等级"""
        if score >= 85:
            return 2
        elif score >= 75:
            return 3
        elif score >= 65:
            return 4
        else:
            return 5


# 暂时注释掉其他策略，专注于EMA55回踩策略
#
# class MAEntanglementStrategy(BaseStrategy):
#     """均线缠绕突破策略 - 暂时禁用"""
#     pass
#
# class TrendBreakthroughStrategy(BaseStrategy):
#     """趋势突破策略 - 暂时禁用"""
#     pass
