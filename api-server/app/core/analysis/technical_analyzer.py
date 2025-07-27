"""
技术分析器实现
实现各种技术指标计算和形态识别算法
"""
import numpy as np
from typing import List, Dict, Optional
from dataclasses import dataclass
from loguru import logger

# 尝试导入talib，如果失败则使用简化实现
try:
    import talib
    TALIB_AVAILABLE = True
except ImportError:
    TALIB_AVAILABLE = False
    logger.warning("TA-Lib not available, using simplified implementation")

from ..interfaces import ITechnicalAnalyzer, KLineData, AnalysisResult


@dataclass
class MAEntanglementResult:
    """均线缠绕检测结果"""
    found: bool
    score: int
    entanglement_periods: List[Dict]
    latest_breakout: Optional[Dict] = None


@dataclass
class EMA55PullbackResult:
    """EMA55回踩检测结果"""
    found: bool
    score: int
    analysis: str
    main_uptrend: Optional[Dict] = None
    pullback_info: Optional[Dict] = None
    stabilization: Optional[Dict] = None


class TechnicalAnalyzer(ITechnicalAnalyzer):
    """技术分析器实现"""
    
    def __init__(self):
        self.min_data_points = 60
    
    def calculate_sma(self, prices: List[float], period: int) -> List[float]:
        """计算简单移动平均线"""
        if len(prices) < period:
            return []

        if TALIB_AVAILABLE:
            prices_array = np.array(prices)
            sma = talib.SMA(prices_array, timeperiod=period)
            return sma.tolist()
        else:
            # 简化实现
            result = []
            for i in range(len(prices)):
                if i >= period - 1:
                    avg = sum(prices[i-period+1:i+1]) / period
                    result.append(avg)
                else:
                    result.append(np.nan)
            return result

    def calculate_ema(self, prices: List[float], period: int) -> List[float]:
        """计算指数移动平均线"""
        if len(prices) < period:
            return []

        if TALIB_AVAILABLE:
            prices_array = np.array(prices)
            ema = talib.EMA(prices_array, timeperiod=period)
            return ema.tolist()
        else:
            # 简化EMA实现
            result = []
            multiplier = 2 / (period + 1)

            # 第一个值使用SMA
            sma_first = sum(prices[:period]) / period
            result.extend([np.nan] * (period - 1))
            result.append(sma_first)

            # 后续值使用EMA公式
            for i in range(period, len(prices)):
                ema_value = (prices[i] * multiplier) + (result[-1] * (1 - multiplier))
                result.append(ema_value)

            return result
    
    def detect_ma_entanglement(self, kline_data: List[KLineData]) -> MAEntanglementResult:
        """检测均线缠绕突破"""
        if len(kline_data) < self.min_data_points:
            return MAEntanglementResult(False, 0, [])
        
        try:
            closes = [k.close for k in kline_data]
            
            # 计算移动平均线
            ma5 = self.calculate_sma(closes, 5)
            ma10 = self.calculate_sma(closes, 10)
            ma20 = self.calculate_sma(closes, 20)
            
            if not ma5 or not ma10 or not ma20:
                return MAEntanglementResult(False, 0, [])
            
            # 检测缠绕期间
            entanglement_periods = self._find_entanglement_periods(ma5, ma10, ma20, kline_data)
            
            if not entanglement_periods:
                return MAEntanglementResult(False, 0, [])
            
            # 检测突破
            latest_entanglement = entanglement_periods[-1]
            breakout = self._detect_breakout(latest_entanglement, ma5, ma10, ma20, kline_data)
            
            if breakout and breakout.get('direction') == 'UP':
                score = self._calculate_entanglement_score(latest_entanglement, breakout, kline_data)
                return MAEntanglementResult(True, score, entanglement_periods, breakout)
            
            return MAEntanglementResult(False, 0, entanglement_periods)
            
        except Exception as e:
            logger.error(f"均线缠绕检测失败: {e}")
            return MAEntanglementResult(False, 0, [])
    
    def detect_ema55_pullback(self, daily_data: List[KLineData], 
                             hourly_data: List[KLineData]) -> EMA55PullbackResult:
        """检测EMA55回踩企稳"""
        if len(daily_data) < 100 or len(hourly_data) < 100:
            return EMA55PullbackResult(False, 0, "数据不足")
        
        try:
            daily_closes = [k.close for k in daily_data]
            ema55 = self.calculate_ema(daily_closes, 55)
            
            if not ema55:
                return EMA55PullbackResult(False, 0, "EMA55计算失败")
            
            # 检测主升浪
            main_uptrend = self._detect_main_uptrend(daily_data, 30, 0.20)
            if not main_uptrend['found']:
                return EMA55PullbackResult(False, 0, "未检测到前期主升浪")
            
            # 检测回踩
            pullback = self._detect_ema_pullback(daily_data, ema55, 0.03)
            if not pullback['found']:
                return EMA55PullbackResult(False, 0, "未检测到有效回踩")
            
            # 检测企稳
            stabilization = self._detect_hourly_stabilization(hourly_data, 8, 0.02)
            
            score = self._calculate_pullback_score(main_uptrend, pullback, stabilization)
            analysis = f"主升浪涨幅: {main_uptrend['gain_percent']:.2f}%, 回踩幅度: {pullback['pullback_percent']:.2f}%, 企稳状态: {'已企稳' if stabilization['found'] else '未企稳'}"
            
            return EMA55PullbackResult(
                stabilization['found'], 
                score, 
                analysis,
                main_uptrend,
                pullback,
                stabilization
            )
            
        except Exception as e:
            logger.error(f"EMA55回踩检测失败: {e}")
            return EMA55PullbackResult(False, 0, f"分析错误: {str(e)}")
    
    def analyze_stock(self, symbol: str, daily_data: List[KLineData], 
                     hourly_data: List[KLineData], strategy_type: str) -> AnalysisResult:
        """分析股票"""
        try:
            if len(daily_data) < self.min_data_points:
                return AnalysisResult(False, 0, ["数据不足"])
            
            reasons = []
            total_score = 0
            technical_details = ""
            
            # 根据策略类型执行分析
            if "均线缠绕" in strategy_type or "缠绕突破" in strategy_type:
                result = self.detect_ma_entanglement(daily_data)
                if result.found:
                    reasons.append("检测到均线缠绕后向上突破")
                    total_score += result.score
                    
                    if result.latest_breakout and result.latest_breakout.get('volume_confirmation'):
                        reasons.append("突破伴随成交量放大确认")
                        total_score += 10
            
            if "EMA55" in strategy_type or "回踩企稳" in strategy_type:
                result = self.detect_ema55_pullback(daily_data, hourly_data)
                if result.found:
                    reasons.append("主升浪回踩EMA55不破，小时级别企稳")
                    total_score += result.score
                    technical_details = result.analysis
            
            # 计算价格信息
            current_price = daily_data[-1].close if daily_data else 0
            target_price = None
            stop_loss = None
            
            if total_score >= 60 and current_price > 0:
                target_gain_percent = 0.05 + (total_score - 60) * 0.15 / 40
                target_price = current_price * (1 + target_gain_percent)
                
                stop_loss_percent = 0.12 - (total_score - 60) * 0.05 / 40
                stop_loss = current_price * (1 - stop_loss_percent)
            
            # 设置置信度
            confidence = "low"
            if total_score >= 80:
                confidence = "high"
            elif total_score >= 65:
                confidence = "medium"
            
            matched = total_score >= 60
            
            return AnalysisResult(
                matched=matched,
                score=total_score,
                reasons=reasons,
                technical_details=technical_details,
                confidence=confidence,
                target_price=target_price,
                stop_loss=stop_loss
            )
            
        except Exception as e:
            logger.error(f"分析股票 {symbol} 失败: {e}")
            return AnalysisResult(False, 0, [f"分析错误: {str(e)}"])
    
    def _find_entanglement_periods(self, ma5: List[float], ma10: List[float], 
                                  ma20: List[float], kline_data: List[KLineData]) -> List[Dict]:
        """寻找均线缠绕期间"""
        periods = []
        current_period = None
        
        start_idx = max(20, len(ma5) - len(kline_data))
        
        for i in range(start_idx, len(ma5)):
            if np.isnan(ma5[i]) or np.isnan(ma10[i]) or np.isnan(ma20[i]):
                continue
            
            is_entangled = self._is_ma_entangled(ma5[i], ma10[i], ma20[i], 0.02)
            
            if is_entangled:
                if current_period is None:
                    current_period = {
                        'start_index': i,
                        'start_date': kline_data[i].datetime,
                        'end_index': i,
                        'end_date': kline_data[i].datetime
                    }
                else:
                    current_period['end_index'] = i
                    current_period['end_date'] = kline_data[i].datetime
            else:
                if current_period and (current_period['end_index'] - current_period['start_index']) >= 5:
                    periods.append(current_period)
                current_period = None
        
        if current_period and (current_period['end_index'] - current_period['start_index']) >= 5:
            periods.append(current_period)
        
        return periods
    
    def _is_ma_entangled(self, ma5: float, ma10: float, ma20: float, threshold: float) -> bool:
        """判断均线是否缠绕"""
        max_ma = max(ma5, ma10, ma20)
        min_ma = min(ma5, ma10, ma20)
        
        if min_ma == 0:
            return False
        
        range_percent = (max_ma - min_ma) / min_ma
        return range_percent < threshold
    
    def _detect_breakout(self, entanglement: Dict, ma5: List[float], 
                        ma10: List[float], ma20: List[float], 
                        kline_data: List[KLineData]) -> Optional[Dict]:
        """检测突破"""
        check_period = 10
        end_index = entanglement['end_index']
        
        if end_index + check_period >= len(kline_data):
            return None
        
        # 计算缠绕期间平均价格
        entanglement_avg_price = np.mean([
            kline_data[i].close 
            for i in range(entanglement['start_index'], end_index + 1)
        ])
        
        # 检查突破
        for i in range(end_index + 1, min(end_index + check_period + 1, len(kline_data))):
            current_bar = kline_data[i]
            price_change = (current_bar.close - entanglement_avg_price) / entanglement_avg_price
            
            if price_change > 0.03:  # 向上突破3%
                volume_confirmation = self._check_volume_confirmation(kline_data, i, 10)
                
                return {
                    'direction': 'UP',
                    'breakout_index': i,
                    'breakout_date': current_bar.datetime,
                    'breakout_percent': price_change * 100,
                    'volume_confirmation': volume_confirmation
                }
        
        return None
    
    def _check_volume_confirmation(self, kline_data: List[KLineData], 
                                  breakout_index: int, lookback_period: int) -> bool:
        """检查成交量确认"""
        if breakout_index < lookback_period:
            return False
        
        avg_volume = np.mean([
            kline_data[i].volume 
            for i in range(breakout_index - lookback_period, breakout_index)
        ])
        
        breakout_volume = kline_data[breakout_index].volume
        return breakout_volume > avg_volume * 1.5
    
    def _detect_main_uptrend(self, daily_data: List[KLineData], 
                           lookback_days: int, min_gain_percent: float) -> Dict:
        """检测主升浪"""
        if len(daily_data) < lookback_days + 10:
            return {'found': False, 'gain_percent': 0}
        
        end_index = len(daily_data) - 1
        start_index = end_index - lookback_days
        
        min_price = min(daily_data[start_index:end_index + 1], key=lambda x: x.low).low
        max_price = max(daily_data[start_index:end_index + 1], key=lambda x: x.high).high
        
        gain_percent = (max_price - min_price) / min_price * 100
        
        return {
            'found': gain_percent >= min_gain_percent * 100,
            'gain_percent': gain_percent,
            'min_price': min_price,
            'max_price': max_price
        }
    
    def _detect_ema_pullback(self, daily_data: List[KLineData], 
                           ema55: List[float], tolerance: float) -> Dict:
        """检测EMA回踩"""
        recent_data = daily_data[-20:]
        recent_ema = ema55[-20:]
        
        for i, (bar, ema_val) in enumerate(zip(recent_data, recent_ema)):
            if np.isnan(ema_val):
                continue
            
            distance_to_ema = abs(bar.low - ema_val) / ema_val
            if distance_to_ema <= tolerance:
                pullback_percent = (bar.high - bar.low) / bar.low * 100
                return {
                    'found': True,
                    'pullback_percent': pullback_percent,
                    'distance_to_ema': distance_to_ema * 100
                }
        
        return {'found': False, 'pullback_percent': 0}
    
    def _detect_hourly_stabilization(self, hourly_data: List[KLineData], 
                                   hours: int, max_volatility: float) -> Dict:
        """检测小时级别企稳"""
        if len(hourly_data) < hours:
            return {'found': False, 'volatility': 0}
        
        recent_data = hourly_data[-hours:]
        
        max_price = max(bar.high for bar in recent_data)
        min_price = min(bar.low for bar in recent_data)
        
        if min_price == 0:
            return {'found': False, 'volatility': 0}
        
        volatility = (max_price - min_price) / min_price
        is_stabilized = volatility <= max_volatility
        
        return {
            'found': is_stabilized,
            'volatility': volatility * 100
        }
    
    def _calculate_entanglement_score(self, entanglement: Dict, 
                                    breakout: Dict, kline_data: List[KLineData]) -> int:
        """计算缠绕突破评分"""
        score = 60
        
        entanglement_days = entanglement['end_index'] - entanglement['start_index'] + 1
        score += min(entanglement_days * 2, 20)
        
        breakout_percent = breakout['breakout_percent']
        score += min(int(breakout_percent * 2), 15)
        
        if breakout['volume_confirmation']:
            score += 10
        
        return min(score, 100)
    
    def _calculate_pullback_score(self, main_uptrend: Dict, 
                                pullback: Dict, stabilization: Dict) -> int:
        """计算回踩评分"""
        score = 50
        
        score += min(int(main_uptrend['gain_percent'] / 2), 25)
        
        pullback_percent = pullback.get('pullback_percent', 0)
        if 3 < pullback_percent < 15:
            score += 15
        
        if stabilization['found']:
            score += 15
        
        return min(score, 100)
