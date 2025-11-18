"""
OKX 资金费率套利策略

核心原理：
- 正费率：现货持币 + 合约做空（超额），吃多头的钱
- 负费率：现货卖出 + 合约做多（超额），吃空头的钱
- 自动翻仓，永远站在被付钱的一方

风险：极低（2x杠杆下爆仓需单边暴跌50%+）
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class FundingArbitrageStrategy:
    """资金费率套利策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典
        """
        self.name = "资金费率套利策略"
        self.parameters = parameters
        
        # 策略参数
        self.symbol = parameters.get("symbol", "ETH-USDT")
        self.leverage = parameters.get("leverage", 1.8)
        self.target_delta = parameters.get("target_delta", 0.98)  # 轻微超额
        self.funding_threshold = parameters.get("funding_threshold", 0.0001)  # 费率阈值
        self.max_position_value = parameters.get("max_position_value", None)  # 最大仓位价值限制（USDT）
        
        # 持仓状态
        self.current_position = None  # 当前合约仓位 {'side': 'long'/'short', 'size': float}
        self.spot_balance = 0.0  # 现货余额
        self.last_rebalance_time = None
        self.last_funding_rate = 0.0
        
        # 统计信息
        self.total_funding_earned = 0.0
        self.rebalance_count = 0
        self.flip_count = 0  # 翻仓次数
        
        logger.info(f"✓ {self.name}初始化完成")
        logger.info(f"  交易对: {self.symbol}")
        logger.info(f"  杠杆: {self.leverage}x")
        logger.info(f"  超额比例: {self.target_delta}")
    
    def analyze(self, klines: List[Dict], market_data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        分析市场并生成交易信号
        
        Args:
            klines: K线数据（用于获取当前价格）
            market_data: 额外的市场数据，包含资金费率等
            
        Returns:
            交易信号字典
        """
        if not klines:
            return {"signal": "hold", "reason": "数据不足"}
        
        current_price = klines[-1]["close"]
        
        # 获取资金费率（从market_data或使用默认值）
        funding_rate = 0.0
        if market_data and "funding_rate" in market_data:
            funding_rate = market_data["funding_rate"]
            self.last_funding_rate = funding_rate
        
        # 获取现货余额（从market_data）
        if market_data and "spot_balance" in market_data:
            self.spot_balance = market_data["spot_balance"]
        
        # 计算现货价值
        spot_value = self.spot_balance * current_price
        
        # 判断应该持有的仓位方向
        desired_side = self._get_desired_side(funding_rate)
        
        # 计算目标合约价值
        target_futures_value = spot_value * self.leverage * self.target_delta
        
        # 如果设置了最大仓位限制，则限制目标合约价值
        if self.max_position_value is not None and target_futures_value > self.max_position_value:
            target_futures_value = self.max_position_value
            logger.info(f"⚠️  仓位受限于最大值: ${self.max_position_value:.2f}")
        
        # 获取当前合约仓位
        current_side = None
        current_value = 0.0
        if self.current_position:
            current_side = self.current_position.get("side")
            current_size = self.current_position.get("size", 0)
            current_value = current_size * current_price
        
        # 判断是否需要调整仓位
        need_rebalance = self._should_rebalance(
            desired_side, current_side, 
            target_futures_value, current_value, 
            spot_value
        )
        
        if need_rebalance:
            return self._create_rebalance_signal(
                desired_side, current_side, 
                target_futures_value, current_price,
                funding_rate
            )
        
        return {
            "signal": "hold",
            "reason": f"仓位平衡，资金费率: {funding_rate*100:.4f}%",
            "funding_rate": funding_rate,
            "spot_value": spot_value,
            "futures_value": current_value
        }
    
    def _get_desired_side(self, funding_rate: float) -> str:
        """
        根据资金费率判断应该持有的仓位方向
        
        Args:
            funding_rate: 资金费率
            
        Returns:
            'long' 或 'short'
        """
        # 正费率（多头付费给空头）→ 做空吃钱
        # 负费率（空头付费给多头）→ 做多吃钱
        if funding_rate > self.funding_threshold:
            return "short"
        else:
            return "long"
    
    def _should_rebalance(
        self, 
        desired_side: str, 
        current_side: Optional[str],
        target_value: float,
        current_value: float,
        spot_value: float
    ) -> bool:
        """
        判断是否需要调整仓位
        
        Returns:
            True: 需要调整
        """
        # 方向不对，需要翻仓
        if current_side != desired_side:
            return True
        
        # 仓位偏差超过5%
        if spot_value > 0:
            deviation = abs(current_value - target_value) / spot_value
            if deviation > 0.05:
                return True
        
        return False
    
    def _create_rebalance_signal(
        self,
        desired_side: str,
        current_side: Optional[str],
        target_value: float,
        current_price: float,
        funding_rate: float
    ) -> Dict[str, Any]:
        """
        创建调仓信号
        
        Returns:
            交易信号字典
        """
        # 判断是否需要翻仓
        is_flip = (current_side is not None and current_side != desired_side)
        
        signal_type = "flip" if is_flip else "rebalance"
        
        # 计算目标仓位大小
        target_size = target_value / current_price if current_price > 0 else 0
        
        reason = ""
        if is_flip:
            reason = f"费率反转！翻仓 {current_side} → {desired_side}"
            self.flip_count += 1
        else:
            reason = f"仓位调整 → {desired_side}"
        
        self.rebalance_count += 1
        self.last_rebalance_time = datetime.now()
        
        return {
            "signal": signal_type,
            "side": desired_side,
            "target_size": target_size,
            "target_value": target_value,
            "price": current_price,
            "funding_rate": funding_rate,
            "reason": reason,
            "leverage": self.leverage
        }
    
    def update_position(self, signal: Dict[str, Any]):
        """
        更新持仓状态
        
        Args:
            signal: 交易信号
        """
        if signal.get("signal") in ["rebalance", "flip"]:
            self.current_position = {
                "side": signal.get("side"),
                "size": signal.get("target_size", 0),
                "entry_price": signal.get("price"),
                "entry_time": datetime.now()
            }
            
            logger.info(f"✓ 仓位更新: {signal.get('side').upper()}, "
                       f"大小: {signal.get('target_size', 0):.4f}, "
                       f"价值: ${signal.get('target_value', 0):.2f}")
    
    def record_funding(self, funding_amount: float):
        """
        记录资金费率收益
        
        Args:
            funding_amount: 资金费率收益金额
        """
        self.total_funding_earned += funding_amount
        logger.info(f"💰 资金费率收益: ${funding_amount:.4f}, "
                   f"累计: ${self.total_funding_earned:.4f}")
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取策略统计信息"""
        return {
            "total_funding_earned": self.total_funding_earned,
            "rebalance_count": self.rebalance_count,
            "flip_count": self.flip_count,
            "current_position": self.current_position,
            "last_funding_rate": self.last_funding_rate,
            "last_rebalance_time": self.last_rebalance_time
        }
    
    def reset_daily_stats(self):
        """重置每日统计"""
        logger.info(f"📊 日统计 - 资金费率收益: ${self.total_funding_earned:.4f}, "
                   f"调仓次数: {self.rebalance_count}, 翻仓次数: {self.flip_count}")
