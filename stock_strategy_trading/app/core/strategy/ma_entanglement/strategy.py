"""
均线缠绕策略
检测多条均线缠绕后的突破机会
"""
from datetime import datetime
from typing import Dict, List

from loguru import logger

from ..base import BaseStrategy
from ...interfaces import KLineData, SelectionResult


class MAEntanglementStrategy(BaseStrategy):
    """均线缠绕策略 - 识别多条均线粘合后的突破机会"""

    @property
    def name(self) -> str:
        return "均线缠绕策略"

    @property
    def description(self) -> str:
        return "检测5日、10日、20日均线缠绕后突破的形态，通常预示趋势启动"

    async def execute(self, stock_data: Dict[str, List[KLineData]]) -> List[SelectionResult]:
        """执行均线缠绕策略分析"""
        results: List[SelectionResult] = []
        execution_time = datetime.now()

        for symbol, data in stock_data.items():
            try:
                daily_data = data.get('daily', [])
                
                # 至少需要30个交易日数据
                if len(daily_data) < 30:
                    continue

                # 分析均线缠绕形态
                analysis_result = self._analyze_ma_entanglement(daily_data)

                # 评分达到60分以上才纳入结果
                if analysis_result['matched'] and analysis_result['score'] >= 60:
                    current_price = daily_data[-1].close if daily_data else 0

                    result = SelectionResult(
                        strategy_id=self.strategy_id or 0,
                        stock_symbol=symbol,
                        execution_time=execution_time,
                        score=analysis_result['score'],
                        confidence=self._get_confidence(analysis_result['score']),
                        reasons=analysis_result['reasons'],
                        suggested_action=self._get_suggested_action(analysis_result['score']),
                        target_price=self._calculate_target_price(current_price, analysis_result['score']),
                        stop_loss=self._calculate_stop_loss(current_price, analysis_result['score']),
                        current_price=current_price,
                        technical_details=analysis_result['details'],
                        risk_level=self._calculate_risk_level(analysis_result['score'])
                    )

                    results.append(result)
                    logger.debug(f"股票 {symbol} 符合均线缠绕策略，评分: {analysis_result['score']}")

            except Exception as e:
                logger.error(f"分析股票 {symbol} 时发生错误: {e}")
                continue

        # 按评分排序
        results.sort(key=lambda x: x.score, reverse=True)
        return results

    def _analyze_ma_entanglement(self, daily_data: List[KLineData]) -> Dict:
        """分析均线缠绕形态"""
        try:
            # 获取收盘价列表
            closes = [k.close for k in daily_data]
            
            # 计算MA5、MA10、MA20
            ma5 = self.analyzer.calculate_sma(closes, 5)
            ma10 = self.analyzer.calculate_sma(closes, 10)
            ma20 = self.analyzer.calculate_sma(closes, 20)
            
            if not ma5 or not ma10 or not ma20:
                return {'matched': False, 'score': 0, 'reasons': [], 'details': ''}
            
            # 获取最新的均线值
            current_ma5 = ma5[-1]
            current_ma10 = ma10[-1]
            current_ma20 = ma20[-1]
            current_price = closes[-1]
            
            # 获取3天前的均线值（用于判断缠绕）
            if len(ma5) < 5 or len(ma10) < 5 or len(ma20) < 5:
                return {'matched': False, 'score': 0, 'reasons': [], 'details': ''}
                
            prev_ma5 = ma5[-3]
            prev_ma10 = ma10[-3]
            prev_ma20 = ma20[-3]
            
            score = 0
            reasons = []
            
            # 1. 检查均线缠绕（三条均线距离很近）
            max_ma = max(current_ma5, current_ma10, current_ma20)
            min_ma = min(current_ma5, current_ma10, current_ma20)
            ma_spread = (max_ma - min_ma) / min_ma * 100  # 最大差距百分比
            
            if ma_spread < 3:  # 均线差距小于3%视为缠绕
                score += 30
                reasons.append(f"三条均线缠绕紧密（差距{ma_spread:.2f}%）")
            elif ma_spread < 5:
                score += 20
                reasons.append(f"三条均线较为接近（差距{ma_spread:.2f}%）")
            
            # 2. 检查价格突破均线（向上）
            if current_price > current_ma5 and current_price > current_ma10 and current_price > current_ma20:
                score += 25
                reasons.append("价格突破所有均线")
                
                # 如果前期在均线下方，加分
                prev_price = closes[-3]
                if prev_price < prev_ma20:
                    score += 15
                    reasons.append("突破前处于均线下方，突破有效性强")
            
            # 3. 检查均线多头排列
            if current_ma5 > current_ma10 > current_ma20:
                score += 20
                reasons.append("均线形成多头排列")
            elif current_ma5 > current_ma10:
                score += 10
                reasons.append("短期均线金叉")
            
            # 4. 检查成交量配合
            if len(daily_data) >= 5:
                recent_volumes = [k.volume for k in daily_data[-5:]]
                avg_volume = sum(recent_volumes[:-1]) / (len(recent_volumes) - 1)
                current_volume = recent_volumes[-1]
                
                if current_volume > avg_volume * 1.5:
                    score += 15
                    reasons.append(f"成交量放大{(current_volume/avg_volume-1)*100:.1f}%，突破有效")
                elif current_volume > avg_volume * 1.2:
                    score += 10
                    reasons.append(f"成交量温和放大{(current_volume/avg_volume-1)*100:.1f}%")
            
            # 5. 检查价格走势（最近5天）
            if len(closes) >= 5:
                recent_closes = closes[-5:]
                up_days = sum(1 for i in range(1, len(recent_closes)) if recent_closes[i] > recent_closes[i-1])
                
                if up_days >= 3:
                    score += 10
                    reasons.append(f"近5日有{up_days}天上涨，趋势向上")
            
            # 构建技术细节说明
            details = (
                f"MA5: {current_ma5:.2f}, MA10: {current_ma10:.2f}, MA20: {current_ma20:.2f}\n"
                f"当前价格: {current_price:.2f}, 均线差距: {ma_spread:.2f}%\n"
                f"总评分: {score}分"
            )
            
            matched = score >= 60
            
            return {
                'matched': matched,
                'score': score,
                'reasons': reasons,
                'details': details
            }
            
        except Exception as e:
            logger.error(f"均线缠绕分析失败: {e}")
            return {'matched': False, 'score': 0, 'reasons': [], 'details': str(e)}

