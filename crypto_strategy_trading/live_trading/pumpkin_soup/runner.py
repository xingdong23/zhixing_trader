"""
Pumpkin Soup 策略运行脚本

使用说明：
python live_trading/pumpkin_soup/runner.py --mode paper  # 模拟盘
python live_trading/pumpkin_soup/runner.py --mode live   # 实盘
"""

import os
import sys
import asyncio
import argparse
import logging
from dotenv import load_dotenv

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from live_trading.common.base_trader import BaseTrader
from strategies.pumpkin_soup.strategy import PumpkinSoupStrategy
import ccxt
from ccxt.base.errors import NetworkError, ExchangeError, InsufficientFunds, RequestTimeout
import time
from functools import wraps

def retry_on_error(max_retries=3, delay=1):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            for i in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except (NetworkError, RequestTimeout) as e:
                    last_exception = e
                    wait_time = delay * (2 ** i)
                    logger.warning(f"网络请求失败 ({i+1}/{max_retries}): {e}. 重试中 ({wait_time}s)...")
                    await asyncio.sleep(wait_time)
                except Exception as e:
                    # 非网络错误直接抛出
                    raise e
            logger.error(f"重试 {max_retries} 次后仍然失败: {last_exception}")
            raise last_exception
        return wrapper
    return decorator

logger = logging.getLogger(__name__)

# 加载环境变量 (优先加载当前目录下的 .env)
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(env_path)


class PumpkinSoupTrader(BaseTrader):
    """Pumpkin Soup 交易机器人"""
    
    def __init__(self, **kwargs):
        # 构造配置文件路径
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            'strategies/pumpkin_soup/config_live.json'
        )
        
        super().__init__(
            name="pumpkin_soup",
            config_path=config_path,
            **kwargs
        )

    def _init_strategy(self):
        # 准备策略参数
        strategy_params = self.config.get('strategy', {}).get('parameters', {}).copy()
        risk_params = self.config.get('risk_management', {}).copy()
        # 合并参数
        strategy_params.update(risk_params)
        
        return PumpkinSoupStrategy(strategy_params)

    async def start(self):
        """重写启动方法，添加初始状态同步"""
        await self.sync_state()
        await super().start()

    async def sync_state(self):
        """从交易所同步持仓和订单状态"""
        if self.mode == 'paper':
            return

        logger.info("🔄 正在同步交易所状态...")
        try:
            # 1. 获取持仓
            # 注意: OKX swap 模式下 fetch_positions 返回列表
            # 1. 获取持仓
            # 使用 retry 装饰器或者手动 retry 逻辑
            # 这里简单起见，我们假设 fetch_positions 内部没有 retry，我们在外层捕获
            # 但为了代码整洁，我们把 sync_state 的核心逻辑拆分，或者直接在这里加 try-except 循环太乱
            # 更好的方式是 BaseTrader 的 exchange 方法都带 retry，或者这里使用上面定义的 decorator
            # 由于 sync_state 是一个大函数，我们尽量保证里面的每个网络请求都健壮
            
            @retry_on_error()
            async def safe_fetch_positions():
                return self.exchange.fetch_positions([self.symbol])
                
            positions = await safe_fetch_positions()
            target_pos = None
            
            for pos in positions:
                # 过滤出当前交易对且有持仓的
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
                # 2. 获取挂单 (寻找止损单)
                @retry_on_error()
                async def safe_fetch_orders():
                    return self.exchange.fetch_open_orders(self.symbol)

                orders = await safe_fetch_orders()
                for order in orders:
                    # 简单判断：止损单通常是 stop_market 或 stop_limit
                    # OKX: ordType='conditional', slTriggerPx...
                    is_stop = order.get('type') in ['stop', 'stop_market'] or \
                              'stop' in order.get('info', {}).get('ordType', '').lower()
                    
                    if is_stop:
                        # 尝试获取触发价格
                        stop_price = float(order.get('stopPrice') or order.get('info', {}).get('slTriggerPx', 0))
                        if stop_price > 0:
                            self.strategy.current_position['stop_loss'] = stop_price
                            logger.info(f"  关联止损单: {stop_price}")
            else:
                logger.info("✓ 当前无持仓")
                self.strategy.current_position = None
            
            # 3. 同步账户余额 (动态调整策略资金)
            # 注意: OKX 合约交易通常使用 USDT 作为保证金
            # 3. 同步账户余额 (动态调整策略资金)
            @retry_on_error()
            async def safe_fetch_balance():
                return self.exchange.fetch_balance()

            balance = await safe_fetch_balance()
            # 获取 USDT 可用余额 + 冻结余额 (总权益)
            # 对于单币种保证金模式，通常看 'total'['USDT']
            # 如果是全仓，可能需要更复杂的逻辑
            usdt_balance = balance.get('total', {}).get('USDT', 0)
            
            if usdt_balance > 0:
                old_cap = float(self.strategy.parameters.get("total_capital", 0))
                # 更新策略资金参数
                self.strategy.parameters["total_capital"] = usdt_balance
                logger.info(f"✓ 账户余额同步: {old_cap:.2f} -> {usdt_balance:.2f} USDT")
            else:
                logger.warning("⚠️ 未获取到有效 USDT 余额，保持配置值")
                
        except Exception as e:
        except Exception as e:
            logger.error(f"❌ 状态同步失败: {e}")
            # 实盘模式下，如果同步失败，不要崩溃，而是跳过本次循环
            # 等待下一次周期重试
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

    async def execute_trade(self, signal):
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
                # 注意：OKX 平仓通常使用 reduceOnly=True 的反向单
                # 或者使用 close_position 接口 (如果 ccxt 支持)
                # 这里使用反向市价单 reduceOnly
                order_side = 'sell' if side == 'close_long' else 'buy'
                if side == 'buy': order_side = 'buy' # 如果是 reduce_only 的 buy
                if side == 'sell': order_side = 'sell'
                
                params = {'reduceOnly': True}
                
                @retry_on_error()
                async def safe_create_order(*args, **kwargs):
                    return self.exchange.create_order(*args, **kwargs)

                await safe_create_order(self.symbol, 'market', order_side, amount, params=params)
                logger.info("✓ 平仓订单已发送")
                return

            # 2. 开仓逻辑 (Open Position)
            logger.info(f"执行开仓: {side} {amount} @ {price}")
            
            # A. 发送市价开仓单
            # OKX: amount 是张数 (contracts)
            # 精度处理: 使用 exchange.amount_to_precision
            # 但对于 OKX 合约，通常必须是整数张
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
            logger.info(f"✓ 开仓订单成功: ID={order['id']}, 成交均价={order.get('average')}")
            
            # B. 发送止损单 (Algo Order)
            if stop_loss and stop_loss > 0:
                logger.info(f"正在设置止损: {stop_loss}")
                sl_side = 'sell' if side == 'buy' else 'buy'
                
                # OKX 止损单参数
                # 注意: 不同交易所参数不同，这里针对 OKX 优化
                params = {
                    'stopLoss': {
                        'triggerPrice': stop_loss,
                        'type': 'market', # 触发后市价止损
                    }
                }
                
                # 有些 ccxt 版本支持直接在 create_order 中传 stopLoss
                # 或者使用 create_order(..., type='stop_market', params={'stopPrice': ...})
                # 为了兼容性，尝试使用 create_order 发送条件单
                try:
                    # 方法1: 尝试在开仓时带止损 (OKX 支持) - 但上面已经开了
                    # 方法2: 发送独立的止损单
                    sl_params = {
                        'tdMode': 'cross', # 或 isolated
                        'slTriggerPx': str(stop_loss),
                        'slOrdPx': '-1', # -1 代表市价
                        'ordType': 'conditional' # 这是一个条件单
                    }
                    # 注意: ccxt 对 algo 订单的支持比较复杂，这里简化处理
                    # 如果是 OKX，建议使用 implicit API 或 params
                    
                    # 简单尝试：使用 stop_market 类型
                    # 止损单也需要重试，但如果开仓成功止损失败，这是高危情况
                    # retry_on_error 会自动重试，如果最终失败，会抛出异常被外层捕获
                    await safe_create_order(self.symbol, 'stop_market', sl_side, amount, params={'stopPrice': stop_loss})
                    logger.info("✓ 止损单已设置")
                    
                except Exception as e:
                    logger.error(f"❌ 设置止损失败 (请手动设置!): {e}")

        except InsufficientFunds as e:
            logger.critical(f"❌ 资金不足: {e}")
            self.stop() # 停止机器人
        except Exception as e:
            logger.error(f"❌ 交易执行失败: {e}")
            # 可以在这里添加重试逻辑
    
    async def run_strategy_cycle(self):
        try:
            # 0. 定期同步状态 (每5分钟)
            current_time = time.time()
            if not hasattr(self, 'last_sync_time'): self.last_sync_time = 0
            
            if current_time - self.last_sync_time > 300:
                await self.sync_state()
                self.last_sync_time = current_time

            # 获取 K 线 (Pumpkin Soup 需要较多数据计算 EMA55)
            df = await self.fetch_klines(limit=300)
            
            if df.empty:
                logger.warning("未获取到K线数据")
                return
            
            current_kline_time = df.iloc[-1]['timestamp']
            if self.last_kline_time and current_kline_time == self.last_kline_time:
                return
            
            self.last_kline_time = current_kline_time
            
            # 转换为字典列表
            klines = df.to_dict('records')
            
            # 运行策略分析
            signal = self.strategy.analyze(klines)
            
            logger.info(f"策略信号: {signal['signal']} - {signal['reason']}")
            
            # 如果有交易信号
            if signal["signal"] in ["buy", "sell"]:
                logger.info(f"🔔 交易信号触发!")
                logger.info(f"  信号: {signal['signal']}")
                logger.info(f"  价格: {signal.get('price', 0):.2f}")
                logger.info(f"  数量: {signal.get('amount', 0):.4f}")
                logger.info(f"  原因: {signal['reason']}")
                
                try:
                    # 1. 记录信号到数据库
                    sig_id = self.db.log_signal(
                        mode=self.mode,
                        symbol=self.symbol,
                        timeframe=self.timeframe,
                        signal=signal,
                    )
                    
                    # 2. 执行交易
                    await self.execute_trade(signal)
                    
                    # 3. 交易成功后，更新策略内部状态
                    # 注意：如果是实盘，最好再次 sync_state，但为了响应速度，先手动更新
                    self.strategy.update_position(signal)
                    
                    # 4. 记录下单日志
                    self.db.log_order(
                        signal_id=sig_id,
                        side=signal["signal"],
                        price=signal.get("price"),
                        amount=signal.get("amount"),
                        status="placed",
                        details={"mode": self.mode},
                    )
                    
                except Exception as e:
                    logger.error(f"❌ 交易流程失败: {e}")
                    # 如果交易失败，不要更新策略状态，等待下一次 sync_state 修正
            
            # 如果是平仓信号 (exit)
            elif signal.get("type") in ["stop_loss", "take_profit"]:
                 # 类似于开仓，也需要执行和平仓
                 logger.info(f"🔔 平仓信号触发: {signal['type']}")
                 try:
                     await self.execute_trade(signal)
                     self.strategy.update_position(signal)
                 except Exception as e:
                     logger.error(f"❌ 平仓失败: {e}")

        except Exception as e:
            logger.error(f"策略循环出错: {e}")
            import traceback
            traceback.print_exc()


def main():
    parser = argparse.ArgumentParser(description='Pumpkin Soup 策略')
    parser.add_argument('--mode', type=str, default='paper', choices=['paper', 'live'])
    parser.add_argument('--once', action='store_true', help='仅运行一次')
    parser.add_argument('--yes', action='store_true', help='实盘确认')
    
    # 数据库相关参数 (BaseTrader 支持)
    parser.add_argument('--db-path', type=str, default=None)
    parser.add_argument('--db', type=str, default=None, choices=['sqlite', 'mysql'])
    parser.add_argument('--mysql-host', type=str, default=None)
    parser.add_argument('--mysql-port', type=int, default=None)
    parser.add_argument('--mysql-user', type=str, default=None)
    parser.add_argument('--mysql-password', type=str, default=None)
    parser.add_argument('--mysql-database', type=str, default=None)
    
    args = parser.parse_args()
    
    if args.mode == 'live' and not args.yes:
        print("⚠️  警告：实盘模式！")
        if input("确认继续？(YES): ") != "YES":
            return
            
    trader = PumpkinSoupTrader(
        mode=args.mode, 
        once=args.once,
        db_path=args.db_path,
        db_backend=args.db,
        mysql_host=args.mysql_host,
        mysql_port=args.mysql_port,
        mysql_user=args.mysql_user,
        mysql_password=args.mysql_password,
        mysql_database=args.mysql_database,
    )
    
    try:
        asyncio.run(trader.start())
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    main()
