"""
龙头股识别器
Leader Stock Identifier
"""
from typing import Dict, List, Any
from loguru import logger
from ...interfaces import KLineData


class LeaderIdentifier:
    """龙头股识别器"""
    
    def calculate_leader_score(
        self,
        code: str,
        klines: List[KLineData],
        sector_info: Dict[str, Any]
    ) -> float:
        """
        计算龙头分数
        
        龙头评分 = 板块地位(25分) + 涨幅表现(20分) + 催化剂(20分) + 
                  技术形态(15分) + 成交量(10分) + 市值流通(10分)
        
        Returns:
            龙头分数 0-100
        """
        try:
            score = 0.0
            
            # 1. 板块地位（25分）
            sector_rank = sector_info.get('sector_rank', 999)
            if sector_rank == 1:
                score += 25
            elif sector_rank <= 3:
                score += 20
            elif sector_rank <= 5:
                score += 15
            
            # 加分项：首个启动
            if sector_info.get('is_first_mover', False):
                score += 5
            
            # 2. 涨幅表现（20分）
            return_since_start = self._calculate_return_since_start(klines, sector_info)
            if return_since_start > 30:
                score += 20
            elif return_since_start > 20:
                score += 15
            elif return_since_start > 10:
                score += 10
            
            # 3. 催化剂（20分）
            catalyst_type = sector_info.get('catalyst_type', '')
            catalyst_scores = {
                "FDA": 20,
                "Earnings_Beat": 18,
                "Product": 15,
                "Analyst": 12,
                "Concept": 8,
            }
            score += catalyst_scores.get(catalyst_type, 0)
            
            # 4. 技术形态（15分）- 简化版
            if self._is_strong_pattern(klines):
                score += 15
            elif self._is_moderate_pattern(klines):
                score += 10
            else:
                score += 5
            
            # 5. 成交量（10分）
            volume_ratio = self._calculate_volume_ratio(klines)
            if volume_ratio > 3:
                score += 10
            elif volume_ratio > 2:
                score += 8
            elif volume_ratio > 1.5:
                score += 5
            
            # 6. 市值流通（10分）
            market_cap = sector_info.get('market_cap', 0)  # 亿美元
            if 5 <= market_cap <= 30:
                score += 10
            elif 2 <= market_cap < 5 or 30 < market_cap <= 50:
                score += 6
            else:
                score += 0
            
            return min(score, 100.0)
        
        except Exception as e:
            logger.error(f"计算龙头分数时出错: {e}")
            return 0.0
    
    def _calculate_return_since_start(
        self,
        klines: List[KLineData],
        sector_info: Dict[str, Any]
    ) -> float:
        """计算自板块启动以来的累计涨幅"""
        if len(klines) < 5:
            return 0.0
        
        sector_age = sector_info.get('sector_age', 5)
        start_idx = max(0, len(klines) - sector_age - 1)
        
        start_price = klines[start_idx].close
        current_price = klines[-1].close
        
        return ((current_price - start_price) / start_price) * 100
    
    def _is_strong_pattern(self, klines: List[KLineData]) -> bool:
        """判断是否是强势形态"""
        if len(klines) < 3:
            return False
        
        # 连续大阳线
        recent = klines[-3:]
        big_green_count = sum(1 for k in recent if k.close > k.open and 
                              (k.close - k.open) / k.open > 0.05)
        
        return big_green_count >= 2
    
    def _is_moderate_pattern(self, klines: List[KLineData]) -> bool:
        """判断是否是中等形态"""
        if len(klines) < 2:
            return False
        
        # 最近有大涨
        recent = klines[-2:]
        return any((k.close - k.open) / k.open > 0.05 for k in recent)
    
    def _calculate_volume_ratio(self, klines: List[KLineData]) -> float:
        """计算量比"""
        if len(klines) < 21:
            return 1.0
        
        current_volume = klines[-1].volume
        avg_volume = sum(k.volume for k in klines[-21:-1]) / 20
        
        if avg_volume == 0:
            return 1.0
        
        return current_volume / avg_volume

