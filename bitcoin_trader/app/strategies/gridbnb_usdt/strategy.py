"""
GridBNB-USDT 动态网格交易策略

核心特性:
1. 基于7日4小时线波动率的动态网格调整
2. EWMA混合算法 (70% EWMA + 30% 传统波动率)
3. 连续函数计算网格大小 (1.0% - 4.0%)
4. 波动率平滑处理，减少噪音干扰
5. 多层风险管理

适用场景: 震荡市场、横盘整理
优势: 动态适应市场波动、稳定捕捉价差收益
"""

from typing import List, Dict, Any
from datetime import datetime
import numpy as np
import logging
import math

logger = logging.getLogger(__name__)


class GridBNBStrategy:
    """GridBNB-USDT 动态网格交易策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典
        """
        self.name = "GridBNB-USDT动态网格策略"
        self.parameters = parameters
        
        # 基础参数
        self.capital = float(parameters.get('total_capital', 1000.0))
        self.min_trade_amount = float(parameters.get('min_trade_amount', 20.0))
        
        # 网格参数
        self.base_price = float(parameters.get('initial_base_price', 0.0))
        self.grid_size = float(parameters.get('initial_grid', 2.0))  # 初始网格大小 (%)
        self.min_grid_size = float(parameters.get('min_grid_size', 1.0))  # 最小网格 (%)
        self.max_grid_size = float(parameters.get('max_grid_size', 4.0))  # 最大网格 (%)
        
        # 波动率参数
        self.volatility_window = int(parameters.get('volatility_window', 42))  # 7天*6个4小时K线
        self.ewma_alpha = float(parameters.get('ewma_alpha', 0.3))  # EWMA平滑系数
        self.ewma_weight = float(parameters.get('ewma_weight', 0.7))  # EWMA权重 (70%)
        self.volatility_smoothing_window = int(parameters.get('volatility_smoothing_window', 3))
        
        # 风险管理参数
        self.max_position_ratio = float(parameters.get('max_position_ratio', 0.9))  # 最大仓位比例
        self.min_position_ratio = float(parameters.get('min_position_ratio', 0.1))  # 最小底仓比例
        self.max_daily_loss = float(parameters.get('max_daily_loss', 0.05))  # 最大日亏损
        
        # 状态变量
        self.current_position = None  # 兼容回测引擎
        self.initialized = False
        self.highest = None
        self.lowest = None
        self.current_price = None
        
        # EWMA波动率状态
        self.ewma_volatility = None
        self.last_price = None
        self.ewma_initialized = False
        
        # 波动率平滑
        self.volatility_history = []
        
        # 网格持仓跟踪
        self.grid_positions = {}  # {price: {'amount': x, 'entry_time': t}}
        self.active_orders = {'buy': None, 'sell': None}
        
        # 统计信息
        self.total_profit = 0.0
        self.daily_pnl = 0.0
        self.daily_trades = []
        self.completed_grids = 0
        
        # 监测状态
        self.is_monitoring_buy = False
        self.is_monitoring_sell = False
        
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        分析市场并生成交易信号
        
        Args:
            klines: K线数据列表
            
        Returns:
            交易信号字典
        """
        if not klines or len(klines) < self.volatility_window:
            return {"signal": "hold", "reason": "数据不足"}
        
        current_price = float(klines[-1]["close"])
        self.current_price = current_price
        
        # 首次运行：初始化基准价格
        if not self.initialized or self.base_price == 0:
            self._initialize_strategy(klines)
            return {"signal": "hold", "reason": "策略初始化完成"}
        
        # 更新波动率并调整网格
        self._update_volatility_and_grid(klines)
        
        # 更新最高最低价
        self._update_price_extremes(current_price)
        
        # 检查风控
        if not self._check_risk_controls():
            return {"signal": "hold", "reason": "触发风控限制"}
        
        # 生成网格交易信号
        return self._generate_grid_signal(current_price)
    
    def _initialize_strategy(self, klines: List[Dict]):
        """初始化策略状态"""
        closes = np.array([float(k["close"]) for k in klines[-100:]])
        current_price = closes[-1]
        
        # 如果没有设置基准价格，使用当前价格
        if self.base_price == 0:
            self.base_price = current_price
        
        self.highest = current_price
        self.lowest = current_price
        self.last_price = current_price
        self.initialized = True
        
        logger.info(f"✓ GridBNB策略初始化完成:")
        logger.info(f"  基准价格: {self.base_price:.2f}")
        logger.info(f"  初始网格: {self.grid_size:.2f}%")
        logger.info(f"  波动率窗口: {self.volatility_window}")
    
    def _update_volatility_and_grid(self, klines: List[Dict]):
        """
        更新波动率并动态调整网格大小
        
        使用EWMA混合算法:
        - 70% EWMA波动率 (快速响应)
        - 30% 传统标准差波动率 (稳定性)
        """
        # 获取最近的收盘价
        recent_closes = np.array([float(k["close"]) for k in klines[-self.volatility_window:]])
        
        if len(recent_closes) < 2:
            return
        
        # 计算收益率
        returns = np.diff(recent_closes) / recent_closes[:-1]
        
        # 计算传统波动率 (标准差)
        traditional_volatility = np.std(returns) if len(returns) > 0 else 0.02
        
        # 计算EWMA波动率
        if not self.ewma_initialized or self.ewma_volatility is None:
            # 首次初始化
            self.ewma_volatility = traditional_volatility
            self.ewma_initialized = True
        else:
            # 更新EWMA: V_t = α * r_t^2 + (1-α) * V_{t-1}
            latest_return = (recent_closes[-1] - self.last_price) / self.last_price if self.last_price else 0
            self.ewma_volatility = (
                self.ewma_alpha * (latest_return ** 2) + 
                (1 - self.ewma_alpha) * self.ewma_volatility
            )
            self.ewma_volatility = math.sqrt(self.ewma_volatility)
        
        # 混合波动率: 70% EWMA + 30% 传统
        mixed_volatility = (
            self.ewma_weight * self.ewma_volatility + 
            (1 - self.ewma_weight) * traditional_volatility
        )
        
        # 波动率平滑处理
        self.volatility_history.append(mixed_volatility)
        if len(self.volatility_history) > self.volatility_smoothing_window:
            self.volatility_history.pop(0)
        
        smoothed_volatility = np.mean(self.volatility_history)
        
        # 根据波动率连续调整网格大小 (1.0% - 4.0%)
        # 使用线性映射: volatility [0.01, 0.05] -> grid_size [1.0%, 4.0%]
        volatility_min = 0.01
        volatility_max = 0.05
        
        # 限制波动率范围
        clamped_volatility = max(volatility_min, min(volatility_max, smoothed_volatility))
        
        # 线性映射到网格大小
        normalized = (clamped_volatility - volatility_min) / (volatility_max - volatility_min)
        new_grid_size = self.min_grid_size + normalized * (self.max_grid_size - self.min_grid_size)
        
        # 平滑网格调整，避免剧烈变化
        if abs(new_grid_size - self.grid_size) > 0.1:
            self.grid_size = 0.7 * self.grid_size + 0.3 * new_grid_size
        else:
            self.grid_size = new_grid_size
        
        # 更新最后价格
        self.last_price = recent_closes[-1]
        
        logger.debug("波动率更新: 传统=%.4f, EWMA=%.4f, 混合=%.4f, 平滑=%.4f, 网格=%.2f%%" %
                    (traditional_volatility, self.ewma_volatility, mixed_volatility, 
                     smoothed_volatility, self.grid_size))
    
    def _update_price_extremes(self, current_price: float):
        """更新最高最低价"""
        if self.highest is None or current_price > self.highest:
            self.highest = current_price
        
        if self.lowest is None or current_price < self.lowest:
            self.lowest = current_price
    
    def _generate_grid_signal(self, current_price: float) -> Dict[str, Any]:
        """
        生成网格交易信号
        
        逻辑:
        1. 价格下跌到买入网格线 -> 买入
        2. 价格上涨到卖出网格线 -> 卖出
        """
        # 计算买入和卖出价格
        grid_percent = self.grid_size / 100.0
        
        # 买入价格: 基准价格 * (1 - grid_size%)
        buy_price = self.base_price * (1 - grid_percent)
        
        # 卖出价格: 基准价格 * (1 + grid_size%)
        sell_price = self.base_price * (1 + grid_percent)
        
        # 检查是否触发买入
        if not self.is_monitoring_buy and current_price <= buy_price:
            # 触发买入监测
            self.is_monitoring_buy = True
            logger.info(f"触发买入监测: 当前价{current_price:.2f} <= 买入价{buy_price:.2f}")
        
        # 检查是否触发卖出
        if not self.is_monitoring_sell and current_price >= sell_price:
            # 触发卖出监测
            self.is_monitoring_sell = True
            logger.info(f"触发卖出监测: 当前价{current_price:.2f} >= 卖出价{sell_price:.2f}")
        
        # 执行买入
        if self.is_monitoring_buy:
            # 检查是否有足够资金
            if self._can_buy():
                signal = self._create_buy_signal(current_price, buy_price)
                self.is_monitoring_buy = False
                return signal
        
        # 执行卖出
        if self.is_monitoring_sell:
            # 检查是否有持仓
            if self._can_sell():
                signal = self._create_sell_signal(current_price, sell_price)
                self.is_monitoring_sell = False
                return signal
        
        return {"signal": "hold", "reason": f"等待网格触发 (买入:{buy_price:.2f}, 卖出:{sell_price:.2f})"}
    
    def _can_buy(self) -> bool:
        """检查是否可以买入"""
        # 简化版本：检查是否有足够资金
        # 实际应该检查账户余额
        return True
    
    def _can_sell(self) -> bool:
        """检查是否可以卖出"""
        # 简化版本：检查是否有持仓
        # 实际应该检查账户持仓
        return self.current_position is not None
    
    def _create_buy_signal(self, current_price: float, target_price: float) -> Dict[str, Any]:
        """创建买入信号"""
        # 计算买入数量
        amount = self.min_trade_amount / current_price
        
        # 更新基准价格为买入价格
        self.base_price = current_price
        
        return {
            "signal": "buy",
            "type": "entry",
            "price": current_price,
            "amount": amount,
            "leverage": self.parameters.get("leverage", 1.0),
            "reason": f"网格买入 @ {current_price:.2f} (目标:{target_price:.2f}, 网格:{self.grid_size:.2f}%)"
        }
    
    def _create_sell_signal(self, current_price: float, target_price: float) -> Dict[str, Any]:
        """创建卖出信号"""
        # 计算卖出数量（全部持仓）
        amount = self.current_position.get("amount", 0) if self.current_position else 0
        
        # 更新基准价格为卖出价格
        self.base_price = current_price
        
        return {
            "signal": "sell",
            "type": "take_profit",
            "price": current_price,
            "amount": amount,
            "reason": f"网格卖出 @ {current_price:.2f} (目标:{target_price:.2f}, 网格:{self.grid_size:.2f}%)"
        }
    
    def _check_risk_controls(self) -> bool:
        """检查风控条件"""
        # 检查日内亏损
        if self.daily_pnl < -self.capital * self.max_daily_loss:
            logger.warning(f"触发日内亏损限制: {self.daily_pnl:.2f}")
            return False
        
        return True
    
    def update_position(self, signal: Dict[str, Any]):
        """
        更新持仓状态
        
        Args:
            signal: 交易信号
        """
        if signal["signal"] == "buy":
            # 记录买入持仓
            self.current_position = {
                "entry_price": signal["price"],
                "amount": signal["amount"],
                "entry_time": datetime.now(),
                "leverage": signal.get("leverage", 1.0)
            }
            logger.info(f"✓ 网格买入: {signal['price']:.2f}, 数量: {signal['amount']:.4f}")
            
        elif signal["signal"] == "sell":
            # 清空持仓
            if self.current_position:
                entry_price = self.current_position["entry_price"]
                profit_pct = (signal["price"] - entry_price) / entry_price
                logger.info(f"✓ 网格卖出: 买入价{entry_price:.2f}, 卖出价{signal['price']:.2f}, "
                          f"收益率{profit_pct:.2%}")
                self.completed_grids += 1
            
            self.current_position = None
    
    def record_trade(self, signal: Dict[str, Any]):
        """
        记录交易
        
        Args:
            signal: 交易信号
        """
        trade = {
            "timestamp": datetime.now(),
            "signal": signal["signal"],
            "price": signal["price"],
            "amount": signal.get("amount", 0),
            "pnl": signal.get("pnl", 0)
        }
        
        self.daily_trades.append(trade)
        
        # 更新盈亏
        if "pnl" in signal:
            pnl_amount = signal["pnl"]
            self.daily_pnl += pnl_amount
            self.total_profit += pnl_amount
    
    def reset_daily_stats(self):
        """重置每日统计"""
        logger.info(f"GridBNB策略日统计 - 盈亏: {self.daily_pnl:.2f}, 完成网格: {self.completed_grids}")
        self.daily_trades.clear()
        self.daily_pnl = 0.0
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取策略统计信息"""
        return {
            "total_profit": self.total_profit,
            "completed_grids": self.completed_grids,
            "daily_pnl": self.daily_pnl,
            "base_price": self.base_price,
            "grid_size": self.grid_size,
            "current_volatility": self.ewma_volatility,
            "highest": self.highest,
            "lowest": self.lowest
        }
