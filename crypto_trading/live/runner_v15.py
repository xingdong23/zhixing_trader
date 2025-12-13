"""
V15 复利引擎 实盘交易运行器

核心功能:
1. 自动复利 - 账户余额 × 30% = 仓位
2. 提现保护 - 盈利 100% 提现一半
3. 动态减仓 - 连亏 2 次仓位减半
4. 金字塔加仓 - 盈利 10% 时加仓到满仓
5. 支持多空双向交易
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import time
import logging
from typing import Optional
from datetime import datetime

from core.exchange import ExchangeClient
from strategies.base_strategy import BaseStrategy
from notifications.feishu import FeishuNotifier
from live.state_manager import StateManager
from live.money_manager import SmartMoneyManager

logger = logging.getLogger(__name__)


class LiveRunnerV15:
    """
    V15 复利引擎 - 实盘交易运行器
    
    核心功能:
    - 自动复利
    - 提现保护
    - 动态减仓
    - 金字塔加仓
    """
    
    VERSION = "V15 复利引擎"
    
    def __init__(
        self,
        strategy: BaseStrategy,
        exchange: ExchangeClient,
        symbol: str,
        notifier: Optional[FeishuNotifier] = None,
        instance_id: str = "default",
        dry_run: bool = True,
        heartbeat_interval: int = 4 * 60 * 60,
        initial_capital: float = 220,
    ):
        self.strategy = strategy
        self.exchange = exchange
        self.symbol = symbol
        self.notifier = notifier or FeishuNotifier("")
        self.instance_id = instance_id
        self.state_manager = StateManager(instance_id)
        self.dry_run = dry_run
        self.heartbeat_interval = heartbeat_interval
        
        # V15 智能资金管理器
        self.money_manager = SmartMoneyManager(
            initial_capital=initial_capital,
            position_ratio=0.3,           # 30% 仓位
            min_position_size=20,         # 最小 20U
            max_position_size=500,        # 最大 500U
            withdraw_threshold=1.0,       # 100% 盈利触发提现
            withdraw_ratio=0.5,           # 提现一半
            pyramid_add_threshold=0.10,   # 10% 盈利触发加仓
            pyramid_add_enabled=True,     # 启用金字塔加仓
        )
        
        self.last_heartbeat = None
        self._running = False
        
        mode = "🔍 观察模式" if dry_run else "💰 实盘模式"
        logger.info(f"{self.VERSION} 初始化: {symbol} - {mode}")
    
    # ==================== 交易所同步 ====================
    
    def sync_position_from_exchange(self) -> None:
        """从交易所同步持仓状态"""
        try:
            summary = self.exchange.get_account_summary(self.symbol)
            
            if not summary.get('connected'):
                error = summary.get('error', 'Unknown error')
                logger.error(f"Exchange connection failed: {error}")
                self.notifier.send("❌ 交易所连接失败", f"错误: {error}")
                return
            
            balance = summary.get('balance', {})
            position = summary.get('position')
            current_price = summary.get('current_price', 0)
            
            if position and position.get('contracts', 0) > 0:
                self.state_manager.open_position('long', position.get('entry_price', 0))
                logger.info(f"Synced position from exchange: {position}")
            else:
                if self.state_manager.has_position():
                    logger.warning("Local state has position but exchange doesn't, resetting")
                self.state_manager.close_position()
            
            self.notifier.send_account_sync(
                symbol=self.symbol,
                balance=balance,
                position=position,
                current_price=current_price,
                dry_run=self.dry_run
            )
            
        except Exception as e:
            logger.error(f"Failed to sync position: {e}")
            self.notifier.send("⚠️ 同步持仓失败", str(e))
    
    # ==================== 交易执行 ====================
    
    def open_position(self, current_price: float, side: str = 'long') -> bool:
        """开仓（复利模式）"""
        position_size = self.money_manager.get_position_size()
        leverage = self.strategy.params.get('leverage', 10)
        
        if self.dry_run:
            self.state_manager.open_position(side, current_price)
            action = 'open_long' if side == 'long' else 'open_short'
            self.notifier.send_trade_signal(action, self.symbol, current_price, 
                                           f"仓位: {position_size:.0f} USDT", dry_run=True)
            logger.info(f"[DRY RUN] Open {side}: {self.symbol} @ {current_price}, size={position_size:.0f} USDT")
            return True
        
        try:
            amount = (position_size * leverage) / current_price
            order_side = 'buy' if side == 'long' else 'sell'
            order = self.exchange.create_market_order(self.symbol, order_side, amount)
            
            if order:
                actual_price = order.get('average', current_price)
                self.state_manager.open_position(side, actual_price)
                action = 'open_long' if side == 'long' else 'open_short'
                self.notifier.send_trade_signal(action, self.symbol, actual_price,
                                               f"仓位: {position_size:.0f} USDT")
                return True
            
        except Exception as e:
            logger.error(f"Failed to open position: {e}")
            self.notifier.send("❌ 开仓失败", str(e))
        
        return False
    
    def close_position(self, current_price: float, reason: str = "") -> bool:
        """平仓"""
        entry = self.state_manager.get_entry_price()
        side = self.state_manager.get_position()
        
        if side == 'long':
            pnl_pct = (current_price - entry) / entry if entry else 0
        else:
            pnl_pct = (entry - current_price) / entry if entry else 0
        
        if self.dry_run:
            leverage = self.strategy.params.get('leverage', 10)
            position_size = self.money_manager.get_position_size()
            pnl_amount = position_size * pnl_pct * leverage
            self.money_manager.update_after_trade(pnl_amount)
            
            # 检查提现
            withdrawn = self.money_manager.check_withdraw()
            if withdrawn:
                self.notifier.send("💰 利润提现", 
                    f"提现: {withdrawn:.2f} USDT\n"
                    f"累计提现: {self.money_manager.total_withdrawn:.2f} USDT")
            
            self.state_manager.close_position()
            self.money_manager.reset_position_state()
            
            action = 'stop_loss' if pnl_pct < 0 else 'trailing_stop'
            self.notifier.send_trade_signal(action, self.symbol, current_price, reason, dry_run=True)
            logger.info(f"[DRY RUN] Close {side}: {self.symbol} @ {current_price} ({reason})")
            return True
        
        try:
            position = self.exchange.get_position(self.symbol)
            if not position:
                logger.warning("No position to close")
                self.state_manager.close_position()
                return False
            
            amount = float(position.get('contracts', 0))
            order_side = 'sell' if side == 'long' else 'buy'
            order = self.exchange.create_market_order(
                self.symbol, order_side, amount, reduce_only=True
            )
            
            if order:
                leverage = self.strategy.params.get('leverage', 10)
                position_size = self.money_manager.get_position_size()
                pnl_amount = position_size * pnl_pct * leverage
                self.money_manager.update_after_trade(pnl_amount)
                
                withdrawn = self.money_manager.check_withdraw()
                if withdrawn:
                    self.notifier.send("💰 利润提现", f"提现: {withdrawn:.2f} USDT")
                
                self.state_manager.close_position()
                self.money_manager.reset_position_state()
                action = 'stop_loss' if pnl_pct < 0 else 'trailing_stop'
                self.notifier.send_trade_signal(action, self.symbol, current_price, reason)
                return True
            
        except Exception as e:
            logger.error(f"Failed to close position: {e}")
            self.notifier.send("❌ 平仓失败", str(e))
        
        return False
    
    def _add_position(self, current_price: float, side: str) -> bool:
        """金字塔加仓"""
        max_size = self.money_manager.get_max_position_size()
        current_size = self.money_manager.get_position_size()
        add_size = max_size - current_size
        
        if add_size <= 10:
            return False
        
        leverage = self.strategy.params.get('leverage', 10)
        
        if self.dry_run:
            self.money_manager.mark_position_added()
            self.notifier.send(
                "📈 金字塔加仓",
                f"币种: {self.symbol}\n"
                f"方向: {'做多' if side == 'long' else '做空'}\n"
                f"加仓: +{add_size:.0f} USDT → 满仓 {max_size:.0f} USDT"
            )
            logger.info(f"[DRY RUN] Pyramid add: +{add_size:.0f} USDT")
            return True
        
        try:
            amount = (add_size * leverage) / current_price
            order_side = 'buy' if side == 'long' else 'sell'
            order = self.exchange.create_market_order(self.symbol, order_side, amount)
            
            if order:
                self.money_manager.mark_position_added()
                self.notifier.send("📈 金字塔加仓", f"币种: {self.symbol}\n加仓: +{add_size:.0f} USDT")
                return True
        except Exception as e:
            logger.error(f"Failed to add position: {e}")
        
        return False
    
    # ==================== 风控检查 ====================
    
    def check_risk_management(self, current_price: float) -> None:
        """检查风控和金字塔加仓"""
        if not self.state_manager.has_position():
            return
        
        entry_price = self.state_manager.get_entry_price()
        side = self.state_manager.get_position()
        
        if entry_price <= 0:
            return
        
        if side == 'long':
            pnl_pct = (current_price - entry_price) / entry_price
        else:
            pnl_pct = (entry_price - current_price) / entry_price
        
        self.state_manager.update_highest_profit(pnl_pct)
        
        # 金字塔加仓检查
        if self.money_manager.should_add_position(pnl_pct):
            self._add_position(current_price, side)
        
        # 止损
        if self.strategy.should_stop_loss(entry_price, current_price, side):
            logger.info(f"Stop loss triggered: {pnl_pct*100:.2f}%")
            self.close_position(current_price, "止损触发")
            return
        
        # 移动止盈
        highest = self.state_manager.state.get('highest_profit_pct', 0)
        if self.strategy.should_trailing_stop(entry_price, current_price, highest, side):
            logger.info(f"Trailing stop triggered")
            self.close_position(current_price, "移动止盈触发")
            return
    
    # ==================== 心跳 ====================
    
    def send_heartbeat(self, current_price: float) -> None:
        """发送心跳"""
        now = time.time()
        if self.last_heartbeat and (now - self.last_heartbeat) < self.heartbeat_interval:
            return
        
        self.last_heartbeat = now
        
        position_info = None
        if self.state_manager.has_position():
            position_info = {
                'entry_price': self.state_manager.get_entry_price(),
                'side': self.state_manager.get_position()
            }
        
        balance = self.exchange.fetch_balance()
        
        # 资金状态
        status = self.money_manager.get_status()
        extra_info = (
            f"\n💰 资金状态:\n"
            f"  当前: {status['capital']:.0f} USDT\n"
            f"  提现: {status['total_withdrawn']:.0f} USDT\n"
            f"  下注: {status['position_size']:.0f} USDT"
        )
        
        self.notifier.send_heartbeat(
            symbol=self.symbol,
            current_price=current_price,
            position_info=position_info,
            balance=balance,
            dry_run=self.dry_run
        )
    
    # ==================== 主循环 ====================
    
    def run(self) -> None:
        """启动主循环"""
        logger.info(f"Starting {self.VERSION}...")
        self._running = True
        
        self.sync_position_from_exchange()
        
        if not self.dry_run:
            leverage = self.strategy.params.get('leverage', 10)
            self.exchange.set_leverage(leverage, self.symbol)
            self.exchange.set_margin_mode('isolated', self.symbol)
        
        mode = "🔍 观察模式" if self.dry_run else "💰 实盘模式"
        status = self.money_manager.get_status()
        self.notifier.send(
            f"🚀 {self.VERSION} 启动",
            f"策略: {self.strategy.name}\n"
            f"币种: {self.symbol}\n"
            f"{mode}\n"
            f"初始资金: {status['capital']:.0f} USDT\n"
            f"下注比例: 30%\n"
            f"金字塔加仓: ✅ 10%触发"
        )
        
        self.last_heartbeat = time.time()
        error_count = 0
        
        try:
            while self._running:
                try:
                    df = self.exchange.fetch_ohlcv(
                        self.symbol, self.strategy.timeframe, limit=100
                    )
                    
                    current_price = self.exchange.get_current_price(self.symbol)
                    df = self.strategy.calculate_indicators(df)
                    
                    if self.state_manager.has_position():
                        self.check_risk_management(current_price)
                    
                    if not self.state_manager.has_position():
                        if hasattr(self.strategy, 'populate_entry_signals'):
                            df = self.strategy.populate_entry_signals(df)
                        
                        signal = self.strategy.generate_signal(df, len(df) - 2)
                        
                        if signal == 'long':
                            logger.info("Long signal detected!")
                            self.open_position(current_price, 'long')
                        elif signal == 'short':
                            logger.info("Short signal detected!")
                            self.open_position(current_price, 'short')
                    
                    self.send_heartbeat(current_price)
                    
                    error_count = 0
                    time.sleep(60)
                    
                except Exception as e:
                    logger.error(f"Main loop error: {e}")
                    error_count += 1
                    
                    if error_count > 10:
                        self.notifier.send("⚠️ 连续报错警告",
                            f"错误次数: {error_count}\n最后错误: {str(e)[:100]}")
                        time.sleep(300)
                    else:
                        time.sleep(60)
        
        except KeyboardInterrupt:
            logger.info("Received stop signal")
            self.notifier.send(f"🛑 {self.VERSION} 停止", f"币种: {self.symbol}\n原因: 用户手动停止")
        
        except Exception as e:
            logger.error(f"Fatal error: {e}")
            self.notifier.send(f"🚨 {self.VERSION} 崩溃", f"币种: {self.symbol}\n错误: {str(e)[:200]}")
            raise
        
        finally:
            self._running = False
    
    def stop(self) -> None:
        """停止运行"""
        self._running = False
        logger.info(f"{self.VERSION} stopped")
