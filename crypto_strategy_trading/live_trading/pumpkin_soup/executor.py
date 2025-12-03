import logging
import asyncio
from datetime import datetime
from typing import Dict, Optional, Any, Callable

import ccxt
from ccxt.base.errors import NetworkError, ExchangeError, InsufficientFunds

from live_trading.common.utils import retry_on_error

logger = logging.getLogger(__name__)

class PumpkinSoupExecutor:
    """
    负责 Pumpkin Soup 策略的具体交易执行、状态同步和订单管理。
    """
    
    def __init__(
        self, 
        exchange: ccxt.Exchange, 
        symbol: str, 
        strategy: Any, 
        mode: str,
        db: Any,
        alert_callback: Callable[[str, str], None]
    ):
        self.exchange = exchange
        self.symbol = symbol
        self.strategy = strategy
        self.mode = mode
        self.db = db
        self.send_alert = alert_callback

    async def sync_state(self):
        """从交易所同步持仓和订单状态"""
        if self.mode == 'paper':
            return

        logger.info("🔄 正在同步交易所状态...")
        try:
            # 1. 获取持仓
            @retry_on_error()
            async def safe_fetch_positions():
                return self.exchange.fetch_positions([self.symbol])
                
            positions = await safe_fetch_positions()
            target_pos = None
            
            for pos in positions:
                # OKX: contracts 是张数, info['pos'] 是字符串
                size = float(pos.get('contracts', 0) or pos.get('info', {}).get('pos', 0))
                if pos['symbol'] == self.symbol and size > 0:
                    target_pos = pos
                    break
            
            if target_pos:
                side = target_pos['side'] # 'long' or 'short'
                amount = float(target_pos.get('contracts', 0) or target_pos.get('info', {}).get('pos', 0))
                entry_price = float(target_pos['entryPrice'])
                
                logger.info(f"✓ 检测到现有持仓: {side.upper()} {amount} 张 @ {entry_price}")
                
                # 重建策略内存状态
                self.strategy.current_position = {
                    "side": side,
                    "amount": amount,
                    "entry_price": entry_price,
                    "entry_time": datetime.now(), # 近似时间
                    "stop_loss": 0.0, # 稍后更新
                    "take_profit": 0.0
                }
                
                # 2. 获取挂单 (寻找止损单)
                @retry_on_error()
                async def safe_fetch_orders():
                    return self.exchange.fetch_open_orders(self.symbol)

                orders = await safe_fetch_orders()
                for order in orders:
                    # 简单判断：止损单通常是 stop_market 或 stop_limit
                    is_stop = order.get('type') in ['stop', 'stop_market'] or \
                              'stop' in order.get('info', {}).get('ordType', '').lower()
                    
                    if is_stop:
                        stop_price = float(order.get('stopPrice') or order.get('info', {}).get('slTriggerPx', 0))
                        if stop_price > 0:
                            self.strategy.current_position['stop_loss'] = stop_price
                            logger.info(f"  关联止损单: {stop_price}")
            else:
                logger.info("✓ 当前无持仓")
                self.strategy.current_position = None
            
            # 3. 同步账户余额 (动态调整策略资金)
            @retry_on_error()
            async def safe_fetch_balance():
                return self.exchange.fetch_balance()

            balance = await safe_fetch_balance()
            usdt_balance = balance.get('total', {}).get('USDT', 0)
            
            if usdt_balance > 0:
                old_cap = float(self.strategy.parameters.get("total_capital", 0))
                self.strategy.parameters["total_capital"] = usdt_balance
                logger.info(f"✓ 账户余额同步: {old_cap:.2f} -> {usdt_balance:.2f} USDT")
            else:
                logger.warning("⚠️ 未获取到有效 USDT 余额，保持配置值")
                
        except Exception as e:
            logger.error(f"❌ 状态同步失败: {e}")
            # 实盘模式下，同步失败不崩溃，等待下次重试
            return

    async def cancel_all_orders(self):
        """撤销当前交易对的所有挂单"""
        if self.mode == 'paper': return
        try:
            logger.info(f"正在撤销 {self.symbol} 所有挂单...")
            
            @retry_on_error()
            async def safe_cancel():
                return self.exchange.cancel_all_orders(self.symbol)
                
            await safe_cancel()
        except Exception as e:
            logger.error(f"撤单失败: {e}")

    async def execute_trade(self, signal: Dict):
        """执行交易指令"""
        if self.mode == 'paper':
            logger.info(f"[模拟交易] 执行 {signal['signal']} {signal.get('amount')} @ {signal.get('price')}")
            return

        try:
            side = signal['signal'] # 'buy' or 'sell'
            amount = signal.get('amount')
            price = signal.get('price')
            stop_loss = signal.get('stop_loss')
            
            # 1. 平仓逻辑 (Close Position)
            if side in ['close_long', 'close_short'] or (side in ['buy', 'sell'] and signal.get('reduce_only', False)):
                logger.info(f"执行平仓: {side} {amount}")
                # 撤销所有挂单 (止损/止盈)
                await self.cancel_all_orders()
                
                # 市价全平
                order_side = 'sell' if side == 'close_long' else 'buy'
                if side == 'buy': order_side = 'buy'
                if side == 'sell': order_side = 'sell'
                
                params = {'reduceOnly': True}
                
                @retry_on_error()
                async def safe_create_order(*args, **kwargs):
                    return self.exchange.create_order(*args, **kwargs)

                await safe_create_order(self.symbol, 'market', order_side, amount, params=params)
                logger.info("✓ 平仓订单已发送")
                
                self.send_alert(
                    "平仓成功",
                    f"✅ 策略平仓 ({side})\n"
                    f"交易对: {self.symbol}\n"
                    f"数量: {amount}\n"
                    f"原因: {signal.get('reason', 'Signal')}"
                )
                return

            # 2. 开仓逻辑 (Open Position)
            logger.info(f"执行开仓: {side} {amount} @ {price}")
            
            # A. 发送市价开仓单
            if self.exchange.id == 'okx' and self.exchange.options.get('defaultType') == 'swap':
                amount = int(amount)
            else:
                amount = float(self.exchange.amount_to_precision(self.symbol, amount))
            
            if amount <= 0:
                logger.warning(f"下单数量为0，忽略: {amount}")
                return 
            
            @retry_on_error()
            async def safe_create_order(*args, **kwargs):
                return self.exchange.create_order(*args, **kwargs)

            order = await safe_create_order(self.symbol, 'market', side, amount)
            avg_price = order.get('average') or price
            logger.info(f"✓ 开仓订单成功: ID={order['id']}, 成交均价={avg_price}")
            
            self.send_alert(
                "开仓成功",
                f"🚀 策略开仓 ({side})\n"
                f"交易对: {self.symbol}\n"
                f"价格: {avg_price}\n"
                f"数量: {amount}\n"
                f"原因: {signal.get('reason', 'Signal')}"
            )
            
            # B. 发送止损单 (Algo Order)
            if stop_loss and stop_loss > 0:
                logger.info(f"正在设置止损: {stop_loss}")
                sl_side = 'sell' if side == 'buy' else 'buy'
                
                try:
                    # 简单尝试：使用 stop_market 类型
                    await safe_create_order(self.symbol, 'stop_market', sl_side, amount, params={'stopPrice': stop_loss})
                    logger.info("✓ 止损单已设置")
                    
                    self.send_alert(
                        "止损设置成功",
                        f"🛡️ 止损单已挂单\n"
                        f"触发价格: {stop_loss}"
                    )
                    
                except Exception as e:
                    logger.error(f"❌ 设置止损失败 (请手动设置!): {e}")

        except InsufficientFunds as e:
            logger.critical(f"❌ 资金不足: {e}")
            self.send_alert("严重错误", f"❌ 资金不足，机器人停止运行: {e}")
            # 这里我们无法直接停止 runner，所以抛出异常让 runner 捕获并停止
            raise e
        except Exception as e:
            logger.error(f"❌ 交易执行失败: {e}")
            # 其他错误不停止机器人
