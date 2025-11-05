"""
板块分析器 - 识别热点板块
Sector Analyzer
"""
from typing import Dict, List, Any, Optional
from loguru import logger


class SectorAnalyzer:
    """板块热度分析器"""
    
    def calculate_heat_score(self, sector_info: Dict[str, Any]) -> float:
        """
        计算板块热度分数
        
        热度评分 = 板块涨跌幅(30%) + 相对强度(25%) + 成交量放大(20%) + 领涨股数量(15%) + 持续性(10%)
        
        Args:
            sector_info: 板块信息字典
        
        Returns:
            热度分数 0-100
        """
        score = 0.0
        
        try:
            # 1. 板块涨跌幅（30分）
            sector_return = sector_info.get('sector_return_1d', 0)
            if sector_return > 5:
                score += 30
            elif sector_return > 3:
                score += 20
            elif sector_return > 1:
                score += 10
            
            # 2. 相对强度（25分）- 相对SPY
            relative_strength = sector_info.get('relative_strength', 0)
            if relative_strength > 3:
                score += 25
            elif relative_strength > 1:
                score += 15
            elif relative_strength > 0:
                score += 5
            
            # 3. 成交量放大（20分）
            volume_ratio = sector_info.get('volume_ratio', 1.0)
            if volume_ratio > 2:
                score += 20
            elif volume_ratio > 1.5:
                score += 15
            elif volume_ratio > 1.2:
                score += 10
            
            # 4. 领涨股数量（15分）
            big_movers_count = sector_info.get('big_movers_count', 0)  # 涨幅>5%的股票数
            if big_movers_count >= 5:
                score += 15
            elif big_movers_count >= 3:
                score += 10
            elif big_movers_count >= 1:
                score += 5
            
            # 5. 持续性（10分）
            consecutive_days = sector_info.get('consecutive_up_days', 0)
            if consecutive_days >= 3:
                score += 10
            elif consecutive_days >= 2:
                score += 7
            elif consecutive_days >= 1:
                score += 3
            
            logger.debug(f"板块热度评分: {score:.1f}")
            return min(score, 100.0)
        
        except Exception as e:
            logger.error(f"计算板块热度时出错: {e}")
            return 0.0
    
    def identify_stage(self, sector_info: Dict[str, Any]) -> str:
        """
        识别板块阶段
        
        Returns:
            "新晋" | "持续" | "退潮"
        """
        sector_age = sector_info.get('sector_age', 0)  # 板块启动天数
        heat_score = self.calculate_heat_score(sector_info)
        consecutive_days = sector_info.get('consecutive_up_days', 0)
        
        if sector_age <= 2 and heat_score >= 70:
            return "新晋"
        elif sector_age <= 5 and consecutive_days >= 2:
            return "持续"
        else:
            return "退潮"
    
    def assess_catalyst_strength(self, catalyst_type: str) -> tuple[float, str]:
        """
        评估催化剂强度
        
        Returns:
            (score, strength_level)
        """
        catalyst_scores = {
            "FDA": (20.0, "强"),
            "Earnings_Beat": (18.0, "强"),
            "Product": (15.0, "中"),
            "Analyst": (12.0, "中"),
            "Merger": (15.0, "中"),
            "Concept": (8.0, "弱"),
            "": (0.0, "无"),
        }
        
        return catalyst_scores.get(catalyst_type, (5.0, "弱"))

