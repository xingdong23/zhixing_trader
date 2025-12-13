"""
网格交易策略 - 优雅的震荡市盈利方案

核心思想：
1. 在价格区间内设置多个网格线
2. 价格下跌到网格线时买入
3. 价格上涨到网格线时卖出
4. 通过频繁的低买高卖获利

适用场景：震荡市、横盘整理
优势：交易逻辑清晰、盈亏比可控、适合手续费环境
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
import logging

logger = logging.getLogger(__name__)


class GridTradingStrategy:
    """网格交易策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化网格策略
        
        Args:
            parameters: 策略参数字典
        """
        
        self.name = "网格交易策略"
        self.parameters = parameters
        
        # 网格配置
        self.grid_lines: List[float] = []  # 网格价格线
        self.grid_positions: Dict[float, Dict] = {}  # 每个网格的持仓
        self.base_price: Optional[float] = None  # 基准价格（网格中心）
        
        # 持仓信息（兼容回测引擎）
        self.current_position = None
        
        # 统计信息
        self.total_profit = 0.0
        self.completed_grids = 0
        self.daily_trades = []
        self.daily_pnl = 0.0
        
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        分析市场并生成交易信号
        
        Args:
            klines: K线数据列表
            
        Returns:
            交易信号字典
        """
        if not klines or len(klines) < 50:
            return {"signal": "hold", "reason": "数据不足"}
        
        current_price = klines[-1]["close"]
        
        # 首次运行：初始化网格
        if not self.grid_lines:
            self._initialize_grid(klines)
            return {"signal": "hold", "reason": "网格初始化完成"}
        
        # 检查风控
        if not self._check_risk_controls():
            return {"signal": "hold", "reason": "触发风控限制"}
        
        # 检查是否需要调整网格（价格突破网格范围）
        if self._should_adjust_grid(current_price):
            self._adjust_grid(current_price)
            logger.info(f"网格需要重新初始化")
            return {"signal": "hold", "reason": "网格重新初始化中"}
        
        # 生成网格交易信号
        return self._generate_grid_signal(current_price)
    
    def _initialize_grid(self, klines: List[Dict]):
        """
        初始化网格线
        
        根据当前价格和波动率设置网格
        """
        closes = np.array([k["close"] for k in klines[-100:]])
        current_price = closes[-1]
        
        # 计算价格波动率（ATR）
        atr = self._calculate_atr(klines[-50:])
        volatility = atr / current_price if current_price > 0 else 0.02
        
        # 设置基准价格
        self.base_price = current_price
        
        # 根据波动率调整网格范围
        price_range_percent = self.parameters.get("price_range_percent", 0.15)
        volatility_threshold = self.parameters.get("volatility_threshold", 0.02)
        if volatility > volatility_threshold:
            price_range_percent *= 1.5  # 高波动时扩大网格范围
        
        # 计算网格上下边界
        num_grids = self.parameters.get("num_grids", 10)
        upper_price = self.base_price * (1 + price_range_percent)
        lower_price = self.base_price * (1 - price_range_percent)
        
        # 生成网格线
        self.grid_lines = np.linspace(lower_price, upper_price, num_grids).tolist()
        
        logger.info(f"✓ 网格初始化完成:")
        logger.info(f"  基准价格: {self.base_price:.2f}")
        logger.info(f"  价格范围: {lower_price:.2f} - {upper_price:.2f}")
        logger.info(f"  网格数量: {num_grids}")
        logger.info(f"  网格间距: {(upper_price - lower_price) / (num_grids - 1):.2f}")
    
    def _generate_grid_signal(self, current_price: float) -> Dict[str, Any]:
        """
        生成网格交易信号
        
        逻辑：
        1. 价格下跌触及网格线 → 买入
        2. 价格上涨到买入价格上方的网格线 → 卖出对应持仓
        """
        # 找到最接近当前价格的网格线
        closest_grid = min(self.grid_lines, key=lambda x: abs(x - current_price))
        
        # 计算价格偏离度
        price_diff_percent = abs(current_price - closest_grid) / closest_grid
        min_spacing = self.parameters.get("min_grid_spacing", 0.008)
        
        # 价格未触及网格线
        if price_diff_percent > min_spacing:
            return {"signal": "hold", "reason": f"等待触及网格线 {closest_grid:.2f}"}
        
        # 检查是否可以卖出（有低于当前价格的持仓）
        for buy_price, position in list(self.grid_positions.items()):
            # 如果当前价格高于买入价格的目标利润
            target_sell_price = position.get("target_price", buy_price * 1.015)
            if current_price >= target_sell_price:
                return self._create_sell_signal(buy_price)
        
        # 检查是否可以买入（该网格线无持仓且未达到最大持仓数）
        if closest_grid not in self.grid_positions:
            max_positions = self.parameters.get("max_total_positions", 8)
            if len(self.grid_positions) < max_positions:
                grid_index = self.grid_lines.index(closest_grid)
                return self._create_buy_signal(closest_grid, grid_index)
        
        return {"signal": "hold", "reason": "等待网格交易机会"}
    
    def _create_buy_signal(self, grid_price: float, grid_index: int) -> Dict[str, Any]:
        """创建买入信号"""
        # 计算仓位大小
        capital = self.parameters.get("total_capital", 300.0)
        max_positions = self.parameters.get("max_total_positions", 8)
        position_size = (capital / max_positions) / grid_price
        
        # 计算目标卖出价格（上一个网格）
        grid_profit = self.parameters.get("grid_profit_percent", 0.015)
        target_sell_price = grid_price * (1 + grid_profit)
        
        return {
            "signal": "buy",
            "price": grid_price,
            "amount": position_size,
            "leverage": self.parameters.get("leverage", 1.0),
            "grid_level": grid_index,
            "target_price": target_sell_price,
            "reason": f"网格买入 #{grid_index} @ {grid_price:.2f}"
        }
    
    def _create_sell_signal(self, grid_price: float) -> Dict[str, Any]:
        """创建卖出信号"""
        position = self.grid_positions[grid_price]
        
        return {
            "signal": "sell",
            "price": grid_price,
            "amount": position["amount"],
            "entry_price": position["entry_price"],
            "grid_level": position["grid_level"],
            "reason": f"网格卖出 #{position['grid_level']} @ {grid_price:.2f}"
        }
    
    def _should_adjust_grid(self, current_price: float) -> bool:
        """判断是否需要调整网格"""
        if not self.base_price or not self.grid_lines:
            return False
        
        # 价格突破网格上下边界的80%时调整
        upper_bound = self.grid_lines[-1]
        lower_bound = self.grid_lines[0]
        
        return current_price > upper_bound * 0.95 or current_price < lower_bound * 1.05
    
    def _adjust_grid(self, current_price: float):
        """调整网格中心"""
        # 清空现有网格持仓（实际应该平仓）
        self.grid_positions.clear()
        
        # 重新初始化网格
        self.base_price = None
        self.grid_lines.clear()
    
    def _check_risk_controls(self) -> bool:
        """检查风控条件"""
        # 检查日内亏损
        max_daily_loss = self.parameters.get("max_daily_loss", 0.05)
        capital = self.parameters.get("total_capital", 300.0)
        
        if self.daily_pnl < -capital * max_daily_loss:
            logger.warning(f"触发日内亏损限制: {self.daily_pnl:.2f}")
            return False
        
        # 检查持仓数量
        max_positions = self.parameters.get("max_total_positions", 8)
        if len(self.grid_positions) >= max_positions:
            logger.warning(f"达到最大持仓数: {len(self.grid_positions)}/{max_positions}")
            return False
        
        return True
    
    def _calculate_atr(self, klines: List[Dict], period: int = 14) -> float:
        """计算ATR（平均真实波幅）"""
        if len(klines) < period + 1:
            return 0.0
        
        true_ranges = []
        for i in range(1, len(klines)):
            high = klines[i]["high"]
            low = klines[i]["low"]
            prev_close = klines[i-1]["close"]
            
            tr = max(
                high - low,
                abs(high - prev_close),
                abs(low - prev_close)
            )
            true_ranges.append(tr)
        
        return np.mean(true_ranges[-period:]) if true_ranges else 0.0
    
    def update_position(self, signal: Dict[str, Any]):
        """更新持仓状态"""
        if signal["signal"] == "buy":
            # 记录网格买入
            grid_price = signal["price"]
            self.grid_positions[grid_price] = {
                "entry_price": signal["price"],
                "amount": signal["amount"],
                "grid_level": signal.get("grid_level", 0),
                "target_price": signal.get("target_price", grid_price * 1.015),
                "entry_time": datetime.now()
            }
            logger.info(f"✓ 网格买入: {grid_price:.2f}, 目标: {signal.get('target_price', grid_price * 1.015):.2f}, 持仓数: {len(self.grid_positions)}")
            
        elif signal["signal"] == "sell":
            # 移除网格卖出
            entry_price = signal.get("entry_price")
            if entry_price and entry_price in self.grid_positions:
                self.grid_positions.pop(entry_price)
                self.completed_grids += 1
                logger.info(f"✓ 网格卖出: 买入价{entry_price:.2f}, 卖出价{signal['price']:.2f}, 剩余持仓: {len(self.grid_positions)}")
    
    def record_trade(self, signal: Dict[str, Any]):
        """记录交易"""
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
            pnl_amount = signal["pnl"] * signal["price"] * signal.get("amount", 0)
            self.daily_pnl += pnl_amount
            self.total_profit += pnl_amount
    
    def reset_daily_stats(self):
        """重置每日统计"""
        logger.info(f"网格策略日统计 - 盈亏: {self.daily_pnl:.2f}, 完成网格: {self.completed_grids}")
        self.daily_trades.clear()
        self.daily_pnl = 0.0
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取策略统计信息"""
        return {
            "total_profit": self.total_profit,
            "completed_grids": self.completed_grids,
            "active_positions": len(self.grid_positions),
            "daily_pnl": self.daily_pnl,
            "grid_lines": len(self.grid_lines),
            "base_price": self.base_price
        }
