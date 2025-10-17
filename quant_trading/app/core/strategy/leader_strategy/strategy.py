"""
龙头策略
识别板块或市场中的龙头股票
"""
from datetime import datetime, timedelta
from typing import Dict, List

from loguru import logger

from ..base import BaseStrategy
from ...interfaces import KLineData, SelectionResult


class LeaderStrategy(BaseStrategy):
    """龙头策略 - 识别板块领涨股和市场龙头"""

    @property
    def name(self) -> str:
        return "龙头策略"

    @property
    def description(self) -> str:
        return "识别强势板块中的龙头股票，通常具有领涨特征和较强的持续性"

    async def execute(self, stock_data: Dict[str, List[KLineData]]) -> List[SelectionResult]:
        """执行龙头策略分析"""
        results: List[SelectionResult] = []
        execution_time = datetime.now()

        # 第一步：分析所有股票的强势特征
        stock_metrics = {}
        for symbol, data in stock_data.items():
            try:
                daily_data = data.get('daily', [])
                
                # 至少需要60个交易日数据
                if len(daily_data) < 60:
                    continue

                metrics = self._calculate_leader_metrics(symbol, daily_data)
                if metrics['score'] > 0:
                    stock_metrics[symbol] = metrics

            except Exception as e:
                logger.error(f"计算股票 {symbol} 龙头指标失败: {e}")
                continue

        # 第二步：筛选龙头股（评分前30%且绝对评分>=60）
        if stock_metrics:
            sorted_stocks = sorted(stock_metrics.items(), key=lambda x: x[1]['score'], reverse=True)
            threshold_index = max(1, len(sorted_stocks) // 3)  # 前30%
            
            for symbol, metrics in sorted_stocks[:threshold_index]:
                if metrics['score'] >= 60:
                    try:
                        daily_data = stock_data[symbol].get('daily', [])
                        current_price = daily_data[-1].close if daily_data else 0

                        result = SelectionResult(
                            strategy_id=self.strategy_id or 0,
                            stock_symbol=symbol,
                            execution_time=execution_time,
                            score=metrics['score'],
                            confidence=self._get_confidence(metrics['score']),
                            reasons=metrics['reasons'],
                            suggested_action=self._get_suggested_action(metrics['score']),
                            target_price=self._calculate_target_price(current_price, metrics['score']),
                            stop_loss=self._calculate_stop_loss(current_price, metrics['score']),
                            current_price=current_price,
                            technical_details=metrics['details'],
                            risk_level=self._calculate_risk_level(metrics['score'])
                        )

                        results.append(result)
                        logger.debug(f"股票 {symbol} 符合龙头策略，评分: {metrics['score']}")

                    except Exception as e:
                        logger.error(f"构建股票 {symbol} 结果时发生错误: {e}")
                        continue

        # 按评分排序
        results.sort(key=lambda x: x.score, reverse=True)
        return results

    def _calculate_leader_metrics(self, symbol: str, daily_data: List[KLineData]) -> Dict:
        """计算龙头指标"""
        try:
            score = 0
            reasons = []
            
            closes = [k.close for k in daily_data]
            volumes = [k.volume for k in daily_data]
            highs = [k.high for k in daily_data]
            lows = [k.low for k in daily_data]
            
            current_price = closes[-1]
            
            # 1. 涨幅排名（近5日、10日、20日涨幅）
            if len(closes) >= 20:
                # 5日涨幅
                gain_5d = (closes[-1] / closes[-6] - 1) * 100 if closes[-6] > 0 else 0
                # 10日涨幅
                gain_10d = (closes[-1] / closes[-11] - 1) * 100 if closes[-11] > 0 else 0
                # 20日涨幅
                gain_20d = (closes[-1] / closes[-21] - 1) * 100 if closes[-21] > 0 else 0
                
                # 短期涨幅强劲
                if gain_5d > 15:
                    score += 30
                    reasons.append(f"近5日大涨{gain_5d:.1f}%，短期强势")
                elif gain_5d > 10:
                    score += 20
                    reasons.append(f"近5日涨幅{gain_5d:.1f}%，表现优异")
                elif gain_5d > 5:
                    score += 10
                    reasons.append(f"近5日涨幅{gain_5d:.1f}%")
                
                # 中期趋势
                if gain_20d > 30:
                    score += 25
                    reasons.append(f"近20日涨幅{gain_20d:.1f}%，中期强势明显")
                elif gain_20d > 20:
                    score += 15
                    reasons.append(f"近20日涨幅{gain_20d:.1f}%")
            
            # 2. 成交量放大（龙头股通常伴随放量）
            if len(volumes) >= 20:
                recent_volume = sum(volumes[-5:]) / 5  # 近5日平均成交量
                prev_volume = sum(volumes[-20:-5]) / 15  # 前15日平均成交量
                
                if prev_volume > 0:
                    volume_ratio = recent_volume / prev_volume
                    if volume_ratio > 2:
                        score += 20
                        reasons.append(f"成交量显著放大{volume_ratio:.1f}倍，资金持续流入")
                    elif volume_ratio > 1.5:
                        score += 15
                        reasons.append(f"成交量放大{volume_ratio:.1f}倍")
                    elif volume_ratio > 1.2:
                        score += 10
                        reasons.append(f"成交量温和放大{volume_ratio:.1f}倍")
            
            # 3. 连续上涨天数（龙头股持续性强）
            consecutive_up = 0
            for i in range(len(closes) - 1, 0, -1):
                if closes[i] > closes[i-1]:
                    consecutive_up += 1
                else:
                    break
            
            if consecutive_up >= 5:
                score += 20
                reasons.append(f"连续{consecutive_up}日上涨，趋势稳固")
            elif consecutive_up >= 3:
                score += 15
                reasons.append(f"连续{consecutive_up}日上涨")
            elif consecutive_up >= 2:
                score += 8
                reasons.append(f"连续{consecutive_up}日上涨")
            
            # 4. 创新高（创60日新高）
            if len(highs) >= 60:
                max_high_60 = max(highs[-60:])
                if current_price >= max_high_60 * 0.99:  # 接近或创新高
                    score += 15
                    reasons.append("股价创60日新高，突破能力强")
            
            # 5. 回撤控制（龙头股回撤小）
            if len(highs) >= 20 and len(lows) >= 20:
                recent_high = max(highs[-20:])
                recent_low = min(lows[-20:])
                if recent_high > 0:
                    pullback = (recent_high - current_price) / recent_high * 100
                    
                    if pullback < 5:
                        score += 10
                        reasons.append(f"回撤仅{pullback:.1f}%，走势稳健")
                    elif pullback < 10:
                        score += 5
                        reasons.append(f"回撤{pullback:.1f}%，控制较好")
            
            # 6. 振幅分析（龙头股波动相对稳定）
            if len(highs) >= 10 and len(lows) >= 10:
                recent_amplitude = []
                for i in range(-10, 0):
                    if lows[i] > 0:
                        amp = (highs[i] - lows[i]) / lows[i] * 100
                        recent_amplitude.append(amp)
                
                if recent_amplitude:
                    avg_amplitude = sum(recent_amplitude) / len(recent_amplitude)
                    if 3 < avg_amplitude < 8:  # 适中的振幅
                        score += 10
                        reasons.append(f"日均振幅{avg_amplitude:.1f}%，走势稳健")
            
            # 构建技术细节
            details = f"龙头指标分析:\n"
            if len(closes) >= 20:
                gain_5d = (closes[-1] / closes[-6] - 1) * 100 if closes[-6] > 0 else 0
                gain_10d = (closes[-1] / closes[-11] - 1) * 100 if closes[-11] > 0 else 0
                gain_20d = (closes[-1] / closes[-21] - 1) * 100 if closes[-21] > 0 else 0
                details += f"5日涨幅: {gain_5d:.1f}%, 10日涨幅: {gain_10d:.1f}%, 20日涨幅: {gain_20d:.1f}%\n"
            
            details += f"连续上涨: {consecutive_up}天\n"
            details += f"当前价格: {current_price:.2f}\n"
            details += f"龙头评分: {score}分"
            
            return {
                'score': score,
                'reasons': reasons,
                'details': details
            }
            
        except Exception as e:
            logger.error(f"计算龙头指标失败: {e}")
            return {'score': 0, 'reasons': [], 'details': str(e)}

