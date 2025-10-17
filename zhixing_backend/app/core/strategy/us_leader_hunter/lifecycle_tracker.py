"""
生命周期跟踪器
Lifecycle Tracker
"""
from typing import Dict, List, Any
from loguru import logger
from ...interfaces import KLineData


class LifecycleTracker:
    """生命周期跟踪器"""
    
    def identify_lifecycle(
        self,
        code: str,
        klines: List[KLineData],
        sector_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        识别股票生命周期
        
        Returns:
            {
                "stage": "Birth" | "Growth" | "Consolidation" | "Decline",
                "days": 当前阶段天数,
                "description": 描述,
                "confidence": 置信度
            }
        """
        try:
            sector_age = sector_info.get('sector_age', 0)
            
            # 计算关键指标
            big_move_days = self._count_big_move_days(klines, days=5)
            consecutive_up = self._count_consecutive_up_days(klines)
            days_since_high = self._days_since_high(klines)
            recent_return = self._calculate_recent_return(klines, days=5)
            is_sideways = self._is_sideways(klines)
            is_breaking_down = self._is_breaking_down(klines)
            
            # 判断生命周期
            # 1. 初生期
            if sector_age <= 3 and big_move_days == 1:
                return {
                    "stage": "Birth",
                    "days": 1,
                    "description": "首次大涨，板块刚启动",
                    "confidence": "medium"
                }
            
            # 2. 加速期（最佳买入期）
            if (big_move_days >= 2) or (consecutive_up >= 3) or (recent_return > 30):
                return {
                    "stage": "Growth",
                    "days": big_move_days,
                    "description": "连续大涨，成交量放大，最佳买入期",
                    "confidence": "high"
                }
            
            # 3. 衰退期
            if is_breaking_down or days_since_high > 5:
                return {
                    "stage": "Decline",
                    "days": days_since_high,
                    "description": "放量下跌或长时间无新高，立即清仓",
                    "confidence": "high"
                }
            
            # 4. 休整期
            if is_sideways:
                return {
                    "stage": "Consolidation",
                    "days": self._count_sideways_days(klines),
                    "description": "横盘整理，等待方向选择",
                    "confidence": "medium"
                }
            
            # 默认：初生期
            return {
                "stage": "Birth",
                "days": 0,
                "description": "生命周期不明确",
                "confidence": "low"
            }
        
        except Exception as e:
            logger.error(f"识别生命周期时出错: {e}")
            return {
                "stage": "Unknown",
                "days": 0,
                "description": f"识别失败: {str(e)}",
                "confidence": "none"
            }
    
    def _count_big_move_days(self, klines: List[KLineData], days: int = 5) -> int:
        """统计大涨天数（涨幅>5%）"""
        if len(klines) < days:
            return 0
        
        recent = klines[-days:]
        count = 0
        for k in recent:
            change_pct = (k.close - k.open) / k.open
            if change_pct > 0.05:  # 涨幅>5%
                count += 1
        
        return count
    
    def _count_consecutive_up_days(self, klines: List[KLineData]) -> int:
        """统计连续上涨天数"""
        count = 0
        for k in reversed(klines[-10:]):  # 最多看10天
            if k.close > k.open:
                count += 1
            else:
                break
        return count
    
    def _days_since_high(self, klines: List[KLineData]) -> int:
        """距离最高点的天数"""
        if len(klines) < 5:
            return 0
        
        recent = klines[-20:]  # 看最近20天
        max_price = max(k.high for k in recent)
        
        for i, k in enumerate(reversed(recent)):
            if k.high == max_price:
                return i
        
        return len(recent)
    
    def _calculate_recent_return(self, klines: List[KLineData], days: int = 5) -> float:
        """计算最近N天的涨幅"""
        if len(klines) < days + 1:
            return 0.0
        
        start_price = klines[-days-1].close
        current_price = klines[-1].close
        
        return ((current_price - start_price) / start_price) * 100
    
    def _is_sideways(self, klines: List[KLineData]) -> bool:
        """判断是否横盘"""
        if len(klines) < 5:
            return False
        
        recent = klines[-5:]
        high = max(k.high for k in recent)
        low = min(k.low for k in recent)
        
        # 振幅小于5%认为是横盘
        amplitude = (high - low) / low
        return amplitude < 0.05
    
    def _is_breaking_down(self, klines: List[KLineData]) -> bool:
        """判断是否破位下跌"""
        if len(klines) < 20:
            return False
        
        # 计算20日均线
        ma20 = sum(k.close for k in klines[-20:]) / 20
        current_price = klines[-1].close
        
        # 跌破20日均线且跌幅>5%
        if current_price < ma20:
            today_change = (klines[-1].close - klines[-1].open) / klines[-1].open
            if today_change < -0.05:
                return True
        
        return False
    
    def _count_sideways_days(self, klines: List[KLineData]) -> int:
        """统计横盘天数"""
        count = 0
        for k in reversed(klines[-10:]):
            change_pct = abs((k.close - k.open) / k.open)
            if change_pct < 0.03:  # 振幅小于3%
                count += 1
            else:
                break
        return count

