"""
智能资金管理模块 - V14

功能:
1. 自动复利 - 根据账户余额动态调整仓位
2. 提现保护 - 盈利超过阈值时提现一半，防止归零
3. 动态仓位 - 连续亏损后自动减小仓位
4. 金字塔加仓 - 盈利10%后加仓到满仓
"""
import logging
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class WithdrawRecord:
    """提现记录"""
    timestamp: datetime
    amount: float
    capital_before: float
    capital_after: float
    reason: str = "profit_taking"


class SmartMoneyManager:
    """
    智能资金管理器
    
    核心功能:
    1. 自动复利 - 账户越多，下注越大
    2. 提现保护 - 盈利超过阈值时锁定一半利润
    3. 动态减仓 - 连续亏损时自动减仓
    4. 金字塔加仓 - 做对了加仓
    """
    
    def __init__(
        self,
        initial_capital: float,
        # 复利模式参数
        position_ratio: float = 0.3,          # 每次下注账户余额的比例 (30%)
        min_position_size: float = 50,        # 最小仓位 (USDT)
        max_position_size: float = 500,       # 最大仓位 (USDT)
        # 提现参数
        withdraw_threshold: float = 1.0,      # 提现触发阈值 (100% 盈利)
        withdraw_ratio: float = 0.5,          # 提现比例 (提现一半利润)
        # 动态仓位参数
        min_position_scale: float = 0.25,     # 最小仓位倍数
        max_position_scale: float = 1.0,      # 最大仓位倍数
        loss_scale_factor: float = 0.5,       # 亏损后仓位缩减因子
        win_scale_factor: float = 1.5,        # 盈利后仓位恢复因子
        consecutive_losses_trigger: int = 2,  # 触发减仓的连续亏损次数
        # 金字塔加仓参数
        pyramid_add_threshold: float = 0.10,  # 加仓触发阈值 (10% 盈利)
        pyramid_add_enabled: bool = True,     # 是否启用金字塔加仓
    ):
        self.initial_capital = initial_capital
        self.capital = initial_capital
        self.baseline_capital = initial_capital  # 用于计算盈利的基准
        
        # 复利参数
        self.position_ratio = position_ratio
        self.min_position_size = min_position_size
        self.max_position_size = max_position_size
        
        # 提现参数
        self.withdraw_threshold = withdraw_threshold
        self.withdraw_ratio = withdraw_ratio
        
        # 仓位调整参数
        self.min_position_scale = min_position_scale
        self.max_position_scale = max_position_scale
        self.loss_scale_factor = loss_scale_factor
        self.win_scale_factor = win_scale_factor
        self.consecutive_losses_trigger = consecutive_losses_trigger
        
        # 金字塔加仓参数
        self.pyramid_add_threshold = pyramid_add_threshold
        self.pyramid_add_enabled = pyramid_add_enabled
        self.has_added_position = False  # 当前仓位是否已加仓
        
        # 状态
        self.position_scale = 1.0
        self.consecutive_losses = 0
        self.total_withdrawn = 0.0
        self.withdraw_records: List[WithdrawRecord] = []
        
        logger.info(f"SmartMoneyManager初始化: {initial_capital} USDT, 复利{position_ratio:.0%}, 加仓门槛{pyramid_add_threshold:.0%}")
    
    # ==================== 复利计算 ====================
    
    def get_position_size(self) -> float:
        """
        计算当前应该下注的仓位大小（复利模式）
        
        Returns:
            仓位大小 (USDT)
        """
        # 基础仓位 = 账户余额 × 比例
        base_size = self.capital * self.position_ratio
        
        # 应用动态仓位倍数（连续亏损减仓）
        adjusted_size = base_size * self.position_scale
        
        # 限制在最小/最大范围内
        final_size = max(self.min_position_size, min(self.max_position_size, adjusted_size))
        
        logger.debug(f"Position size: {final_size:.2f} USDT "
                    f"(capital={self.capital:.2f}, ratio={self.position_ratio:.0%}, scale={self.position_scale:.0%})")
        
        return final_size
    
    # ==================== 提现管理 ====================
    
    def check_withdraw(self) -> Optional[float]:
        """
        检查是否应该提现
        
        Returns:
            提现金额，如果不需要提现则返回 None
        """
        if self.baseline_capital <= 0:
            return None
            
        profit_pct = (self.capital - self.baseline_capital) / self.baseline_capital
        
        if profit_pct >= self.withdraw_threshold:
            profit = self.capital - self.baseline_capital
            withdraw_amount = profit * self.withdraw_ratio
            
            self.capital -= withdraw_amount
            self.total_withdrawn += withdraw_amount
            self.baseline_capital = self.capital  # 重置基准
            
            record = WithdrawRecord(
                timestamp=datetime.now(),
                amount=withdraw_amount,
                capital_before=self.capital + withdraw_amount,
                capital_after=self.capital
            )
            self.withdraw_records.append(record)
            
            logger.info(f"💰 Profit taking: withdrew {withdraw_amount:.2f} USDT "
                       f"(total: {self.total_withdrawn:.2f})")
            
            return withdraw_amount
        
        return None
    
    # ==================== 动态仓位管理 ====================
    
    def update_after_trade(self, pnl: float) -> None:
        """
        交易结束后更新状态
        
        Args:
            pnl: 本次交易盈亏金额
        """
        self.capital += pnl
        
        if pnl < 0:
            # 亏损 - 增加连续亏损计数
            self.consecutive_losses += 1
            
            if self.consecutive_losses >= self.consecutive_losses_trigger:
                # 触发减仓
                old_scale = self.position_scale
                self.position_scale = max(
                    self.min_position_scale,
                    self.position_scale * self.loss_scale_factor
                )
                logger.info(f"📉 连续亏损 {self.consecutive_losses} 次，"
                           f"仓位倍数 {old_scale:.0%} → {self.position_scale:.0%}")
        else:
            # 盈利 - 重置连续亏损，恢复仓位
            self.consecutive_losses = 0
            
            if self.position_scale < self.max_position_scale:
                old_scale = self.position_scale
                self.position_scale = min(
                    self.max_position_scale,
                    self.position_scale * self.win_scale_factor
                )
                logger.info(f"📈 盈利恢复，仓位倍数 {old_scale:.0%} → {self.position_scale:.0%}")
    
    def get_position_scale(self) -> float:
        """获取当前仓位倍数"""
        return self.position_scale
    
    # ==================== 金字塔加仓 ====================
    
    def get_max_position_size(self) -> float:
        """获取满仓仓位大小（不受position_scale影响）"""
        base_size = self.capital * self.position_ratio
        return max(self.min_position_size, min(self.max_position_size, base_size))
    
    def should_add_position(self, current_pnl_pct: float) -> bool:
        """
        判断是否应该加仓
        
        Args:
            current_pnl_pct: 当前持仓盈亏比例
            
        Returns:
            是否应该加仓
        """
        if not self.pyramid_add_enabled:
            return False
        if self.has_added_position:
            return False
        if current_pnl_pct >= self.pyramid_add_threshold:
            return True
        return False
    
    def mark_position_added(self) -> None:
        """标记当前仓位已加仓"""
        self.has_added_position = True
        logger.info("📈 金字塔加仓触发!")
    
    def reset_position_state(self) -> None:
        """平仓后重置仓位状态"""
        self.has_added_position = False
    
    # ==================== 状态查询 ====================
    
    def get_status(self) -> dict:
        """获取当前状态"""
        return {
            'capital': self.capital,
            'initial': self.initial_capital,
            'profit_pct': (self.capital - self.baseline_capital) / self.baseline_capital if self.baseline_capital > 0 else 0,
            'total_withdrawn': self.total_withdrawn,
            'total_value': self.capital + self.total_withdrawn,
            'position_size': self.get_position_size(),
            'position_scale': self.position_scale,
            'consecutive_losses': self.consecutive_losses,
        }
    
    def get_notification_message(self) -> str:
        """生成状态通知消息"""
        status = self.get_status()
        
        return f"""💰 资金状态
当前资金: {status['capital']:.2f} USDT
累计提现: {status['total_withdrawn']:.2f} USDT
总价值: {status['total_value']:.2f} USDT
下注金额: {status['position_size']:.2f} USDT
仓位倍数: {status['position_scale']:.0%}
连续亏损: {status['consecutive_losses']} 次"""
    
    def reset_baseline(self) -> None:
        """重置基准资金（用于手动提现后）"""
        self.baseline_capital = self.capital
        logger.info(f"Baseline reset to {self.capital:.2f}")
    
    def sync_capital(self, actual_capital: float) -> None:
        """
        同步实际账户余额（从交易所获取后调用）
        
        Args:
            actual_capital: 交易所实际余额
        """
        if abs(self.capital - actual_capital) > 1:  # 差异超过 1 USDT
            logger.info(f"Syncing capital: {self.capital:.2f} → {actual_capital:.2f}")
            self.capital = actual_capital

