"""
美股龙头猎手策略 - 主策略类
US Market Leader Hunter Strategy
"""
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from loguru import logger

from ..base import BaseStrategy
from ...interfaces import KLineData
from .sector_analyzer import SectorAnalyzer
from .leader_identifier import LeaderIdentifier
from .lifecycle_tracker import LifecycleTracker
from .pattern_detector import PatternDetector


class USLeaderHunterStrategy(BaseStrategy):
    """
    美股龙头猎手策略
    
    核心逻辑：
    1. 识别热点板块（热度>=70）
    2. 找出龙头股（龙头分>=70）
    3. 确认生命周期（加速期最佳）
    4. 验证技术形态
    5. 生成交易信号
    """
    
    def __init__(self, config: Dict[str, Any], strategy_id: Optional[int] = None):
        super().__init__(config, strategy_id)
        
        # 初始化各个分析模块
        self.sector_analyzer = SectorAnalyzer()
        self.leader_identifier = LeaderIdentifier()
        self.lifecycle_tracker = LifecycleTracker()
        self.pattern_detector = PatternDetector()
        
        # 策略参数
        self.params = self._init_parameters()
        
        logger.info(f"初始化美股龙头猎手策略，ID: {strategy_id}")
    
    def _init_parameters(self) -> Dict[str, Any]:
        """初始化策略参数"""
        default_params = {
            # 板块条件
            "sector_heat_threshold": 70.0,        # 热度阈值
            "sector_min_days": 2,                 # 最小持续天数
            "sector_max_days": 5,                 # 最大持续天数
            
            # 龙头条件
            "leader_score_threshold": 70.0,       # 龙头分数阈值
            "leader_rank_limit": 3,               # 板块内排名限制
            
            # 技术形态条件
            "pattern_score_threshold": 35.0,      # 形态分数阈值
            "volume_ratio_min": 2.0,              # 最小量比
            
            # 市值条件
            "market_cap_min": 500,                # 最小市值（百万美元）
            "market_cap_max": 5000,               # 最大市值（百万美元）
            "stock_price_max": 100.0,             # 最高股价
            
            # 仓位管理
            "position_ratios": {
                "Priority_1": 0.90,               # 满仓信号
                "Priority_2": 0.70,               # 重仓信号
                "Priority_3": 0.50,               # 半仓信号
                "Priority_4": 0.20,               # 试探信号
            },
            "max_single_position": 0.50,          # 单股最大仓位
            "max_sector_position": 0.70,          # 同板块最大仓位
            
            # 止损止盈
            "stop_loss_pct": 0.08,                # 固定止损8%
            "take_profit_targets": [
                {"profit": 0.15, "close_ratio": 0.40, "trailing_stop": 0.05},
                {"profit": 0.30, "close_ratio": 0.30, "trailing_stop": 0.15},
                {"profit": 0.50, "close_ratio": 0.30, "trailing_stop": 0.10},
            ],
            
            # 风险控制
            "premarket_stop_loss": -0.15,         # 盘前止损阈值-15%
            "max_hold_days": 15,                  # 最大持仓天数
        }
        
        # 合并用户配置
        params = self.config.get('parameters', {})
        default_params.update(params)
        
        return default_params
    
    def analyze(
        self,
        code: str,
        klines: List[KLineData],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        分析单只股票
        
        Args:
            code: 股票代码
            klines: K线数据列表
            context: 上下文数据（板块信息、市场环境等）
        
        Returns:
            分析结果字典
        """
        try:
            if len(klines) < 60:  # 至少需要60根K线
                return self._create_hold_result(code, "数据不足")
            
            # 提取上下文信息
            sector_info = context.get('sector_info') if context else None
            market_env = context.get('market_env') if context else None
            
            # 第一步：板块热度分析
            if not sector_info:
                return self._create_hold_result(code, "缺少板块信息")
            
            sector_heat = self.sector_analyzer.calculate_heat_score(sector_info)
            if sector_heat < self.params["sector_heat_threshold"]:
                return self._create_hold_result(
                    code,
                    f"板块热度不足: {sector_heat:.1f}"
                )
            
            # 第二步：龙头地位识别
            leader_score = self.leader_identifier.calculate_leader_score(
                code, klines, sector_info
            )
            
            if leader_score < self.params["leader_score_threshold"]:
                return self._create_hold_result(
                    code,
                    f"龙头分数不足: {leader_score:.1f}"
                )
            
            # 第三步：生命周期判断
            lifecycle = self.lifecycle_tracker.identify_lifecycle(
                code, klines, sector_info
            )
            
            if lifecycle["stage"] not in ["Birth", "Growth"]:
                return self._create_hold_result(
                    code,
                    f"生命周期不适合买入: {lifecycle['stage']}"
                )
            
            # 第四步：技术形态检测
            pattern_result = self.pattern_detector.detect_pattern(klines)
            
            if pattern_result["score"] < self.params["pattern_score_threshold"]:
                return self._create_hold_result(
                    code,
                    f"技术形态分数不足: {pattern_result['score']:.1f}"
                )
            
            # 第五步：市值和价格检查
            current_price = klines[-1].close
            market_cap = context.get('market_cap', 0) if context else 0
            
            if not self._check_market_cap_price(market_cap, current_price):
                return self._create_hold_result(code, "市值或价格不符合条件")
            
            # 第六步：综合评分和信号生成
            final_score, signal_strength = self._calculate_final_score(
                sector_heat=sector_heat,
                leader_score=leader_score,
                lifecycle=lifecycle,
                pattern_result=pattern_result,
            )
            
            # 生成买入信号
            if lifecycle["stage"] == "Growth":
                return self._create_buy_signal(
                    code=code,
                    klines=klines,
                    final_score=final_score,
                    signal_strength=signal_strength,
                    sector_heat=sector_heat,
                    leader_score=leader_score,
                    lifecycle=lifecycle,
                    pattern_result=pattern_result,
                    current_price=current_price,
                )
            else:
                # Birth阶段，试探性买入
                return self._create_watch_signal(
                    code=code,
                    klines=klines,
                    final_score=final_score,
                    sector_heat=sector_heat,
                    leader_score=leader_score,
                    lifecycle=lifecycle,
                    pattern_result=pattern_result,
                    current_price=current_price,
                )
        
        except Exception as e:
            logger.error(f"分析股票{code}时出错: {e}")
            return self._create_hold_result(code, f"分析出错: {str(e)}")
    
    def _calculate_final_score(
        self,
        sector_heat: float,
        leader_score: float,
        lifecycle: Dict[str, Any],
        pattern_result: Dict[str, Any],
    ) -> tuple[float, str]:
        """
        计算最终评分和信号强度
        
        Returns:
            (final_score, signal_strength)
        """
        # 基础分数：取各项的加权平均
        base_score = (
            sector_heat * 0.25 +
            leader_score * 0.35 +
            pattern_result["score"] * 0.40
        )
        
        # 生命周期加成
        lifecycle_bonus = {
            "Birth": 0,
            "Growth": 15,
            "Consolidation": -10,
            "Decline": -30,
        }
        final_score = base_score + lifecycle_bonus.get(lifecycle["stage"], 0)
        
        # 确定信号强度
        if final_score >= 90:
            signal_strength = "Priority_1"  # 满仓信号
        elif final_score >= 80:
            signal_strength = "Priority_2"  # 重仓信号
        elif final_score >= 70:
            signal_strength = "Priority_3"  # 半仓信号
        else:
            signal_strength = "Priority_4"  # 试探信号
        
        return final_score, signal_strength
    
    def _check_market_cap_price(self, market_cap: float, price: float) -> bool:
        """检查市值和价格是否符合条件"""
        if market_cap == 0:
            return True  # 如果没有市值数据，不做限制
        
        # 市值单位：百万美元
        if market_cap < self.params["market_cap_min"]:
            return False
        if market_cap > self.params["market_cap_max"]:
            return False
        
        # 价格限制
        if price > self.params["stock_price_max"]:
            return False
        
        return True
    
    def _create_buy_signal(
        self,
        code: str,
        klines: List[KLineData],
        final_score: float,
        signal_strength: str,
        sector_heat: float,
        leader_score: float,
        lifecycle: Dict[str, Any],
        pattern_result: Dict[str, Any],
        current_price: float,
    ) -> Dict[str, Any]:
        """创建买入信号"""
        
        # 计算仓位
        position_ratio = self.params["position_ratios"].get(signal_strength, 0.2)
        
        # 计算止损止盈
        stop_loss = current_price * (1 - self.params["stop_loss_pct"])
        
        take_profit_levels = []
        for tp in self.params["take_profit_targets"]:
            target_price = current_price * (1 + tp["profit"])
            take_profit_levels.append({
                "price": round(target_price, 2),
                "close_ratio": tp["close_ratio"],
                "trailing_stop_pct": tp["trailing_stop"],
                "description": f"目标{len(take_profit_levels)+1}: +{tp['profit']*100:.0f}%"
            })
        
        # 计算风险收益比
        risk = current_price - stop_loss
        reward = take_profit_levels[0]["price"] - current_price
        risk_reward_ratio = reward / risk if risk > 0 else 0
        
        # 构建信号原因
        reasons = [
            f"板块热度: {sector_heat:.1f}",
            f"龙头分数: {leader_score:.1f}",
            f"生命周期: {lifecycle['stage']}（{lifecycle.get('description', '')}）",
            f"技术形态: {pattern_result.get('primary_pattern', 'N/A')}（{pattern_result['score']:.1f}分）",
        ]
        
        return {
            "code": code,
            "signal": "buy",
            "action": self._get_suggested_action(final_score),
            "score": round(final_score, 2),
            "confidence": self._get_confidence(final_score),
            
            # 信号强度和优先级
            "signal_strength": signal_strength,
            "priority": int(signal_strength.split('_')[1]),
            
            # 价格信息
            "current_price": round(current_price, 2),
            "entry_price_low": round(current_price * 0.98, 2),
            "entry_price_high": round(current_price * 1.02, 2),
            
            # 仓位
            "position_ratio": position_ratio,
            "max_position": position_ratio,
            
            # 止损止盈
            "stop_loss": round(stop_loss, 2),
            "stop_loss_pct": self.params["stop_loss_pct"],
            "take_profit_levels": take_profit_levels,
            "risk_reward_ratio": round(risk_reward_ratio, 2),
            
            # 分析详情
            "sector_heat_score": round(sector_heat, 2),
            "leader_score": round(leader_score, 2),
            "lifecycle": lifecycle,
            "tech_pattern": pattern_result,
            
            # 信号原因
            "reason": " | ".join(reasons),
            "key_points": reasons,
            
            # 风险等级
            "risk_level": self._assess_risk_level(final_score, lifecycle, pattern_result),
            
            # 时间戳
            "signal_time": datetime.now().isoformat(),
        }
    
    def _create_watch_signal(
        self,
        code: str,
        klines: List[KLineData],
        final_score: float,
        sector_heat: float,
        leader_score: float,
        lifecycle: Dict[str, Any],
        pattern_result: Dict[str, Any],
        current_price: float,
    ) -> Dict[str, Any]:
        """创建观察信号（初生期）"""
        
        return {
            "code": code,
            "signal": "watch",
            "action": "watch",
            "score": round(final_score, 2),
            "confidence": "low",
            
            "current_price": round(current_price, 2),
            "position_ratio": 0.2,  # 试探性小仓位
            
            "sector_heat_score": round(sector_heat, 2),
            "leader_score": round(leader_score, 2),
            "lifecycle": lifecycle,
            "tech_pattern": pattern_result,
            
            "reason": f"初生期龙头，建议观察或小仓位试探",
            "risk_level": "medium",
            
            "signal_time": datetime.now().isoformat(),
        }
    
    def _create_hold_result(self, code: str, reason: str) -> Dict[str, Any]:
        """创建持有/观望结果"""
        return {
            "code": code,
            "signal": "hold",
            "action": "hold",
            "score": 0,
            "confidence": "none",
            "reason": reason,
            "signal_time": datetime.now().isoformat(),
        }
    
    def _assess_risk_level(
        self,
        final_score: float,
        lifecycle: Dict[str, Any],
        pattern_result: Dict[str, Any]
    ) -> str:
        """评估风险等级"""
        risk_score = 0
        
        # 分数越高，风险越低
        if final_score >= 90:
            risk_score += 0
        elif final_score >= 80:
            risk_score += 10
        elif final_score >= 70:
            risk_score += 20
        else:
            risk_score += 30
        
        # 生命周期风险
        lifecycle_risk = {
            "Birth": 20,
            "Growth": 0,
            "Consolidation": 30,
            "Decline": 50,
        }
        risk_score += lifecycle_risk.get(lifecycle["stage"], 20)
        
        # 形态风险
        if pattern_result["score"] < 35:
            risk_score += 20
        
        # 风险等级
        if risk_score >= 50:
            return "high"
        elif risk_score >= 30:
            return "medium"
        else:
            return "low"
    
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """验证配置"""
        required_fields = ['parameters']
        return all(field in config for field in required_fields)

