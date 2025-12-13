"""
实盘交易运行器
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

logger = logging.getLogger(__name__)


class LiveRunner:
    """
    实盘交易运行器
    
    负责:
    - 获取行情数据
    - 调用策略生成信号
    - 根据信号执行交易
    - 管理持仓和风控
    - 发送通知
    """
    
    def __init__(
        self,
        strategy: BaseStrategy,
        exchange: ExchangeClient,
        symbol: str,
        notifier: Optional[FeishuNotifier] = None,
        state_file: str = "bot_state.json",
        dry_run: bool = True,
        heartbeat_interval: int = 4 * 60 * 60,  # 4 小时
    ):
        """
        Args:
            strategy: 策略实例
            exchange: 交易所客户端
            symbol: 交易对
            notifier: 通知器
            state_file: 状态文件路径
            dry_run: 是否观察模式（不实际下单）
            heartbeat_interval: 心跳间隔（秒）
        """
        self.strategy = strategy
        self.exchange = exchange
        self.symbol = symbol
        self.notifier = notifier or FeishuNotifier("")
        self.state_manager = StateManager(state_file)
        self.dry_run = dry_run
        self.heartbeat_interval = heartbeat_interval
        
        self.last_heartbeat = None
        self._running = False
        
        mode = "观察模式" if dry_run else "实盘模式"
        logger.info(f"LiveRunner initialized: {symbol} - {mode}")
    
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
                # 有持仓，同步到本地
                self.state_manager.open_position(
                    side='long',  # 目前只支持做多
                    entry_price=position.get('entry_price', 0)
                )
                logger.info(f"Synced position from exchange: {position}")
            else:
                # 无持仓，重置本地状态
                if self.state_manager.has_position():
                    logger.warning("Local state has position but exchange doesn't, resetting")
                self.state_manager.close_position()
            
            # 发送同步通知
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
    
    def open_position(self, current_price: float) -> bool:
        """开仓"""
        if self.dry_run:
            # 观察模式：只记录，不下单
            self.state_manager.open_position('long', current_price)
            self.notifier.send_trade_signal(
                'open_long', self.symbol, current_price, dry_run=True
            )
            logger.info(f"[DRY RUN] Open long signal: {self.symbol} @ {current_price}")
            return True
        
        try:
            # 计算数量
            position_size = self.strategy.params.get('position_size_usdt', 100)
            leverage = self.strategy.params.get('leverage', 10)
            amount = (position_size * leverage) / current_price
            
            # 下单
            order = self.exchange.create_market_order(
                self.symbol, 'buy', amount
            )
            
            if order:
                actual_price = order.get('average', current_price)
                self.state_manager.open_position('long', actual_price)
                self.notifier.send_trade_signal(
                    'open_long', self.symbol, actual_price
                )
                return True
            
        except Exception as e:
            logger.error(f"Failed to open position: {e}")
            self.notifier.send("❌ 开仓失败", str(e))
        
        return False
    
    def close_position(self, current_price: float, reason: str = "") -> bool:
        """平仓"""
        if self.dry_run:
            entry = self.state_manager.get_entry_price()
            pnl_pct = (current_price - entry) / entry * 100 if entry else 0
            
            self.state_manager.close_position()
            
            action = 'stop_loss' if pnl_pct < 0 else 'trailing_stop'
            self.notifier.send_trade_signal(
                action, self.symbol, current_price, reason, dry_run=True
            )
            logger.info(f"[DRY RUN] Close signal: {self.symbol} @ {current_price} ({reason})")
            return True
        
        try:
            # 获取持仓数量
            position = self.exchange.get_position(self.symbol)
            if not position:
                logger.warning("No position to close")
                self.state_manager.close_position()
                return False
            
            amount = float(position.get('contracts', 0))
            
            # 平仓
            order = self.exchange.create_market_order(
                self.symbol, 'sell', amount, reduce_only=True
            )
            
            if order:
                entry = self.state_manager.get_entry_price()
                pnl_pct = (current_price - entry) / entry * 100 if entry else 0
                
                self.state_manager.close_position()
                
                action = 'stop_loss' if pnl_pct < 0 else 'trailing_stop'
                self.notifier.send_trade_signal(action, self.symbol, current_price, reason)
                return True
            
        except Exception as e:
            logger.error(f"Failed to close position: {e}")
            self.notifier.send("❌ 平仓失败", str(e))
        
        return False
    
    # ==================== 风控检查 ====================
    
    def check_risk_management(self, current_price: float) -> None:
        """检查风控"""
        if not self.state_manager.has_position():
            return
        
        entry_price = self.state_manager.get_entry_price()
        if entry_price <= 0:
            return
        
        # 计算盈亏
        pnl_pct = (current_price - entry_price) / entry_price
        
        # 更新最高盈利
        self.state_manager.update_highest_profit(pnl_pct)
        
        # 检查止损
        if self.strategy.should_stop_loss(entry_price, current_price, 'long'):
            logger.info(f"Stop loss triggered: {pnl_pct*100:.2f}%")
            self.close_position(current_price, "止损触发")
            return
        
        # 检查移动止盈
        highest = self.state_manager.state.get('highest_profit_pct', 0)
        if self.strategy.should_trailing_stop(entry_price, current_price, highest, 'long'):
            logger.info(f"Trailing stop triggered: highest={highest*100:.2f}%, current={pnl_pct*100:.2f}%")
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
                'entry_price': self.state_manager.get_entry_price()
            }
        
        balance = self.exchange.fetch_balance()
        
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
        logger.info("Starting live runner...")
        self._running = True
        
        # 同步持仓
        self.sync_position_from_exchange()
        
        # 设置杠杆和保证金模式
        if not self.dry_run:
            leverage = self.strategy.params.get('leverage', 10)
            self.exchange.set_leverage(leverage, self.symbol)
            self.exchange.set_margin_mode('isolated', self.symbol)
        
        # 发送启动通知
        mode = "🔍 观察模式" if self.dry_run else "💰 实盘模式"
        self.notifier.send(
            "🤖 V11 引擎启动",
            f"策略: {self.strategy.name}\n币种: {self.symbol}\n{mode}"
        )
        
        self.last_heartbeat = time.time()
        error_count = 0
        
        try:
            while self._running:
                try:
                    # 1. 获取数据
                    df = self.exchange.fetch_ohlcv(
                        self.symbol,
                        self.strategy.timeframe,
                        limit=100
                    )
                    
                    # 2. 当前价格
                    current_price = self.exchange.get_current_price(self.symbol)
                    
                    # 3. 计算指标
                    df = self.strategy.calculate_indicators(df)
                    
                    # 4. 风控检查
                    if self.state_manager.has_position():
                        self.check_risk_management(current_price)
                    
                    # 5. 检查开仓信号（使用倒数第二根完成的 K 线）
                    if not self.state_manager.has_position():
                        signal = self.strategy.generate_signal(df, len(df) - 2)
                        if signal == 'long':
                            logger.info(f"Long signal detected!")
                            self.open_position(current_price)
                    
                    # 6. 心跳
                    self.send_heartbeat(current_price)
                    
                    error_count = 0
                    time.sleep(60)  # 每分钟检查一次
                    
                except Exception as e:
                    logger.error(f"Main loop error: {e}")
                    error_count += 1
                    
                    if error_count > 10:
                        self.notifier.send(
                            "⚠️ 连续报错警告",
                            f"错误次数: {error_count}\n最后错误: {str(e)[:100]}"
                        )
                        time.sleep(300)
                    else:
                        time.sleep(60)
        
        except KeyboardInterrupt:
            logger.info("Received stop signal")
            self.notifier.send("🛑 V11 机器人停止", f"币种: {self.symbol}\n原因: 用户手动停止")
        
        except Exception as e:
            logger.error(f"Fatal error: {e}")
            self.notifier.send("🚨 V11 机器人崩溃", f"币种: {self.symbol}\n错误: {str(e)[:200]}")
            raise
        
        finally:
            self._running = False
    
    def stop(self) -> None:
        """停止运行"""
        self._running = False
        logger.info("Live runner stopped")
