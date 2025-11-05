"""
技术形态检测器
Pattern Detector
"""
from typing import Dict, List, Any
from loguru import logger
from ...interfaces import KLineData


class PatternDetector:
    """技术形态检测器"""
    
    def detect_pattern(self, klines: List[KLineData]) -> Dict[str, Any]:
        """
        检测技术形态
        
        Returns:
            {
                "primary_pattern": 主要形态名称,
                "score": 形态分数,
                "patterns": 所有识别到的形态列表,
                "description": 形态描述
            }
        """
        try:
            patterns = []
            score = 0
            
            # 1. 突破新高形态（40分）
            if self._is_breakout_new_high(klines):
                patterns.append("突破新高")
                score = max(score, 40)
            
            # 2. 连续大阳线（38分）
            if self._is_consecutive_big_green(klines):
                patterns.append("连续大阳线")
                score = max(score, 38)
            
            # 3. Gap Up突破（35分）
            if self._is_gap_up(klines):
                patterns.append("Gap Up突破")
                score = max(score, 35)
            
            # 4. 回踩支撑（35分）
            if self._is_pullback_support(klines):
                patterns.append("回踩支撑")
                score = max(score, 35)
            
            # 5. 放量滞涨（-20分，卖出信号）
            if self._is_volume_climax(klines):
                patterns.append("放量滞涨")
                score = -20
            
            # 6. 破位下跌（-40分，止损信号）
            if self._is_breakdown(klines):
                patterns.append("破位下跌")
                score = -40
            
            # 如果没有识别到任何形态
            if not patterns:
                patterns.append("无明确形态")
                score = 0
            
            return {
                "primary_pattern": patterns[0],
                "score": score,
                "patterns": patterns,
                "description": self._get_pattern_description(patterns[0])
            }
        
        except Exception as e:
            logger.error(f"检测技术形态时出错: {e}")
            return {
                "primary_pattern": "未知",
                "score": 0,
                "patterns": [],
                "description": f"检测失败: {str(e)}"
            }
    
    def _is_breakout_new_high(self, klines: List[KLineData]) -> bool:
        """突破新高形态"""
        if len(klines) < 52:  # 至少需要52周数据
            return False
        
        current = klines[-1]
        high_52w = max(k.high for k in klines[-252:])  # 假设每周5个交易日
        
        # 突破52周新高 + 大涨 + 放量
        return (
            current.close > high_52w and
            (current.close - current.open) / current.open > 0.10 and
            current.volume > self._avg_volume(klines[-21:-1]) * 2
        )
    
    def _is_consecutive_big_green(self, klines: List[KLineData]) -> bool:
        """连续大阳线"""
        if len(klines) < 3:
            return False
        
        recent = klines[-3:]
        big_green_count = 0
        
        for k in recent:
            change_pct = (k.close - k.open) / k.open
            if k.close > k.open and change_pct > 0.08:  # 涨幅>8%
                big_green_count += 1
        
        return big_green_count >= 2
    
    def _is_gap_up(self, klines: List[KLineData]) -> bool:
        """Gap Up突破"""
        if len(klines) < 2:
            return False
        
        today = klines[-1]
        yesterday = klines[-2]
        
        # 高开>5% + 不回补缺口
        gap_pct = (today.open - yesterday.close) / yesterday.close
        no_fill_gap = today.low > yesterday.close
        
        return gap_pct > 0.05 and no_fill_gap and today.close > today.open
    
    def _is_pullback_support(self, klines: List[KLineData]) -> bool:
        """回踩支撑"""
        if len(klines) < 25:
            return False
        
        # 计算20日均线
        ma20 = sum(k.close for k in klines[-20:]) / 20
        today = klines[-1]
        
        # 前几天有大涨
        has_recent_rally = any(
            (k.close - k.open) / k.open > 0.08
            for k in klines[-5:-1]
        )
        
        # 回踩到20日均线附近 + 今天放量反弹
        near_ma20 = abs(today.close - ma20) / ma20 < 0.03
        volume_surge = today.volume > self._avg_volume(klines[-21:-1]) * 1.5
        
        return has_recent_rally and near_ma20 and volume_surge and today.close > today.open
    
    def _is_volume_climax(self, klines: List[KLineData]) -> bool:
        """放量滞涨（警告信号）"""
        if len(klines) < 21:
            return False
        
        today = klines[-1]
        avg_vol = self._avg_volume(klines[-21:-1])
        
        # 成交量巨大 + 涨幅很小 + 长上影线
        huge_volume = today.volume > avg_vol * 3
        small_gain = (today.close - today.open) / today.open < 0.03
        long_upper_shadow = (today.high - today.close) > (today.close - today.open) * 2
        
        return huge_volume and small_gain and long_upper_shadow
    
    def _is_breakdown(self, klines: List[KLineData]) -> bool:
        """破位下跌（止损信号）"""
        if len(klines) < 20:
            return False
        
        ma20 = sum(k.close for k in klines[-20:]) / 20
        today = klines[-1]
        
        # 跌破20日均线 + 大跌 + 连续阴线
        below_ma20 = today.close < ma20
        big_drop = (today.close - today.open) / today.open < -0.05
        consecutive_down = all(k.close < k.open for k in klines[-2:])
        
        return below_ma20 and big_drop and consecutive_down
    
    def _avg_volume(self, klines: List[KLineData]) -> float:
        """计算平均成交量"""
        if not klines:
            return 0
        return sum(k.volume for k in klines) / len(klines)
    
    def _get_pattern_description(self, pattern: str) -> str:
        """获取形态描述"""
        descriptions = {
            "突破新高": "突破52周新高，放量大涨，强势形态",
            "连续大阳线": "连续2-3天大阳线，涨幅>8%，强势上涨",
            "Gap Up突破": "高开>5%且不回补缺口，通常有重大利好",
            "回踩支撑": "回踩20日均线后放量反弹，二次买入机会",
            "放量滞涨": "成交量巨大但涨幅很小，警惕主力出货",
            "破位下跌": "跌破20日均线且大跌，立即止损",
            "无明确形态": "无明显技术形态",
        }
        return descriptions.get(pattern, "未知形态")

