"""
自动交易机器人 - 整合策略、执行、监控和风险管理
"""
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging

import ccxt.async_support as ccxt_async

from .trading_engine import TradingEngine, OrderSide
from .market_monitor import MarketMonitor, KlineMonitor
from .risk_manager import RiskManager, RiskLimits
from .strategies import BaseStrategy

logger = logging.getLogger(__name__)


class TradingBot:
    """
    自动交易机器人
    
    整合功能：
    1. 策略信号生成
    2. 交易执行
    3. 实时监控
    4. 风险管理
    5. 持仓管理
    """
    
    def __init__(self, 
                 exchange: ccxt_async.Exchange,
                 strategy: BaseStrategy,
                 symbol: str,
                 timeframe: str = '15m',
                 initial_capital: float = 10000.0,
                 risk_limits: Optional[RiskLimits] = None,
                 config: Dict[str, Any] = None):
        """
        初始化交易机器人
        
        Args:
            exchange: ccxt 交易所实例
            strategy: 交易策略
            symbol: 交易对，如 'BTC/USDT'
            timeframe: K线周期
            initial_capital: 初始资金
            risk_limits: 风险限制
            config: 配置参数
        """
        self.exchange = exchange
        self.strategy = strategy
        self.symbol = symbol
        self.timeframe = timeframe
        self.config = config or {}
        
        # 初始化各个模块
        self.trading_engine = TradingEngine(exchange, config)
        self.market_monitor = MarketMonitor(exchange)
        self.kline_monitor = KlineMonitor(exchange)
        self.risk_manager = RiskManager(initial_capital, risk_limits)
        
        # 运行状态
        self.running = False
        self.mode = self.config.get('mode', 'paper')  # paper/live
        
        # 信号缓存
        self.last_signal: Optional[Dict] = None
        self.signal_history: List[Dict] = []
        
        logger.info(f"交易机器人初始化: {symbol} {timeframe} 模式={self.mode}")
    
    async def start(self):
        """启动交易机器人"""
        if self.running:
            logger.warning("交易机器人已在运行")
            return
        
        self.running = True
        logger.info("=" * 60)
        logger.info("🚀 交易机器人启动")
        logger.info(f"交易对: {self.symbol}")
        logger.info(f"策略: {self.strategy.name}")
        logger.info(f"周期: {self.timeframe}")
        logger.info(f"模式: {self.mode.upper()}")
        logger.info("=" * 60)
        
        # 启动各个监控器
        await self.market_monitor.start()
        await self.kline_monitor.start()
        
        # 订阅行情数据
        await self.market_monitor.subscribe_ticker(self.symbol, self._on_ticker_update)
        await self.kline_monitor.subscribe_kline(self.symbol, self.timeframe, self._on_kline_update)
        
        # 启动主循环
        try:
            await self._run_loop()
        except Exception as e:
            logger.error(f"交易机器人运行错误: {e}", exc_info=True)
        finally:
            await self.stop()
    
    async def stop(self):
        """停止交易机器人"""
        if not self.running:
            return
        
        self.running = False
        logger.info("🛑 交易机器人停止中...")
        
        # 停止监控器
        await self.market_monitor.stop()
        await self.kline_monitor.stop()
        
        # 关闭交易引擎
        await self.trading_engine.close()
        
        # 打印最终报告
        logger.info("\n" + self.risk_manager.get_risk_report())
        logger.info("✅ 交易机器人已停止")
    
    async def _run_loop(self):
        """主运行循环"""
        check_interval = self.config.get('check_interval', 60)  # 默认60秒检查一次
        
        while self.running:
            try:
                # 更新持仓状态
                await self.trading_engine.update_positions()
                
                # 生成交易信号
                await self._generate_and_execute_signal()
                
                # 等待下一次检查
                await asyncio.sleep(check_interval)
                
            except Exception as e:
                logger.error(f"主循环错误: {e}", exc_info=True)
                await asyncio.sleep(10)
    
    async def _on_ticker_update(self, ticker: Dict):
        """行情更新回调"""
        # 可以在这里实现实时止损止盈检查
        pass
    
    async def _on_kline_update(self, kline: Dict):
        """K线更新回调"""
        logger.debug(f"K线更新: {kline['timestamp']} close={kline['close']}")
    
    async def _generate_and_execute_signal(self):
        """生成并执行交易信号"""
        try:
            # 获取K线数据
            klines = self.kline_monitor.get_klines(self.symbol, self.timeframe, limit=500)
            
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            if not klines or len(klines) < 200:
                print(f"\n[{current_time}] ⚠️  K线数据不足: {len(klines) if klines else 0}/200，跳过信号生成")
                logger.warning("K线数据不足，跳过信号生成")
                return
            
            # 获取最新价格
            latest_price = klines[-1]['close']
            print(f"\n[{current_time}] 📊 正在分析市场...")
            print(f"  交易对: {self.symbol}")
            print(f"  当前价格: ${latest_price:,.2f}")
            print(f"  K线数量: {len(klines)}")
            print(f"  时间周期: {self.timeframe}")
            
            # 生成信号
            signal = self.strategy.analyze(klines)
            self.last_signal = signal
            self.signal_history.append({
                'timestamp': datetime.now(),
                'signal': signal
            })
            
            # 详细输出信号信息
            signal_type = signal['signal']
            print(f"  策略信号: {signal_type.upper()}")
            print(f"  信号原因: {signal.get('reason', '无')}")
            
            if signal.get('confidence'):
                print(f"  信号强度: {signal['confidence']:.2%}")
            
            logger.info(f"策略信号: {signal['signal']} - {signal.get('reason', '')}")
            
            # 执行信号
            if signal['signal'] in ['buy', 'sell']:
                print(f"  🎯 发现{signal_type.upper()}信号，准备执行...")
                try:
                    await self._execute_signal(signal, klines)
                    print(f"  ✅ 信号执行完成")
                except Exception as e:
                    print(f"  ❌ 信号执行失败: {e}")
                    logger.error(f"信号执行失败: {e}", exc_info=True)
            else:
                print(f"  ⏸️  无交易信号，继续观望")
            
        except Exception as e:
            print(f"\n[{current_time}] ❌ 信号生成错误: {e}")
            logger.error(f"信号生成执行错误: {e}", exc_info=True)
    
    async def _execute_signal(self, signal: Dict, klines: List[Dict]):
        """
        执行交易信号
        
        Args:
            signal: 策略信号
            klines: K线数据
        """
        signal_type = signal['signal']
        print(f"  [执行] 开始执行{signal_type.upper()}信号...")
        
        # 检查是否已有持仓（检查risk_manager的持仓）
        if len(self.risk_manager.current_positions) > 0:
            print(f"  [执行] 已有持仓（{len(self.risk_manager.current_positions)}笔），跳过新信号")
            for sym, pos in self.risk_manager.current_positions.items():
                print(f"    - {sym}: {pos}")
            logger.info(f"已有持仓，跳过新信号: {list(self.risk_manager.current_positions.keys())}")
            return
        
        # 同时检查trading_engine的持仓
        if self.symbol in self.trading_engine.positions:
            pos = self.trading_engine.positions[self.symbol]
            if pos.size > 0:  # 确保持仓数量大于0
                print(f"  [执行] trading_engine中有持仓（size={pos.size}），跳过新信号")
                logger.info(f"trading_engine中有持仓，跳过新信号")
                return
            else:
                # 清理无效持仓
                print(f"  [执行] 清理无效持仓（size=0）")
                del self.trading_engine.positions[self.symbol]
        
        # 获取当前价格
        current_price = signal.get('price', klines[-1]['close'])
        
        # 计算止损止盈
        stop_loss = signal.get('stop_loss')
        take_profit_levels = signal.get('take_profit_levels', [])
        
        if not stop_loss:
            # 如果策略没有提供止损，使用风险管理器计算
            atr = signal.get('atr')
            side = 'long' if signal_type == 'buy' else 'short'
            stop_loss = self.risk_manager.calculate_stop_loss(
                current_price, side, atr
            )
        
        # 计算仓位大小（使用策略的position_ratio）
        position_ratio = signal.get('position_ratio', 0.1)  # 默认10%
        position_value = self.risk_manager.current_capital * position_ratio  # 使用资金的10%
        position_size = position_value / current_price  # 转换为BTC数量
        
        print(f"  [执行] 仓位计算: 资金={self.risk_manager.current_capital:.2f}, 比例={position_ratio:.1%}, 价值={position_value:.2f}, 数量={position_size:.4f}")
        logger.info(f"仓位计算: 资金={self.risk_manager.current_capital:.2f}, 比例={position_ratio:.1%}, 价值={position_value:.2f}, 数量={position_size:.4f}")
        
        if position_size == 0:
            print(f"  [执行] 计算仓位为0，跳过交易")
            logger.warning("计算仓位为0，跳过交易")
            return
        
        # 风险检查
        side_str = 'buy' if signal_type == 'buy' else 'sell'
        print(f"  [执行] 开始风险检查...")
        allowed, reason = self.risk_manager.check_trade_allowed(
            self.symbol, side_str, position_size, current_price
        )
        
        if not allowed:
            print(f"  [执行] ❌ 风险检查未通过: {reason}")
            logger.warning(f"风险检查未通过: {reason}")
            return
        
        print(f"  [执行] ✅ 风险检查通过")
        
        # 执行交易
        if self.mode == 'live':
            await self._execute_live_trade(signal_type, position_size, current_price, 
                                          stop_loss, take_profit_levels)
        else:
            await self._execute_paper_trade(signal_type, position_size, current_price, 
                                           stop_loss, take_profit_levels)
    
    async def _execute_live_trade(self, signal_type: str, amount: float, 
                                  price: float, stop_loss: float, 
                                  take_profit_levels: List[Dict]):
        """执行实盘交易"""
        try:
            logger.info("=" * 60)
            logger.info(f"🔥 执行实盘交易")
            logger.info(f"方向: {signal_type.upper()}")
            logger.info(f"价格: {price:.2f}")
            logger.info(f"数量: {amount:.4f}")
            logger.info(f"止损: {stop_loss:.2f}")
            logger.info("=" * 60)
            
            # 1. 执行开仓
            side = OrderSide.BUY if signal_type == 'buy' else OrderSide.SELL
            order = await self.trading_engine.execute_market_order(
                self.symbol, side, amount
            )
            
            logger.info(f"✅ 开仓成功: {order['id']}")
            
            # 2. 设置止损
            stop_side = OrderSide.SELL if signal_type == 'buy' else OrderSide.BUY
            stop_order = await self.trading_engine.set_stop_loss(
                self.symbol, stop_side, amount, stop_loss
            )
            
            logger.info(f"✅ 止损设置: {stop_order['id']} @ {stop_loss:.2f}")
            
            # 3. 设置止盈（如果有）
            if take_profit_levels:
                for i, level in enumerate(take_profit_levels):
                    tp_amount = amount * level['close_ratio']
                    tp_price = level['price']
                    
                    tp_order = await self.trading_engine.set_take_profit(
                        self.symbol, stop_side, tp_amount, tp_price
                    )
                    
                    logger.info(f"✅ 止盈{i+1}设置: {tp_order['id']} @ {tp_price:.2f}")
            
            # 记录交易
            self.risk_manager.record_trade({
                'symbol': self.symbol,
                'side': signal_type,
                'amount': amount,
                'price': price,
                'stop_loss': stop_loss,
                'pnl': 0  # 开仓时盈亏为0
            })
            
        except Exception as e:
            logger.error(f"实盘交易执行失败: {e}", exc_info=True)
    
    async def _execute_paper_trade(self, signal_type: str, amount: float, 
                                   price: float, stop_loss: float, 
                                   take_profit_levels: List[Dict]):
        """执行模拟交易"""
        logger.info("=" * 60)
        logger.info(f"📝 模拟交易")
        logger.info(f"方向: {signal_type.upper()}")
        logger.info(f"价格: {price:.2f}")
        logger.info(f"数量: {amount:.4f}")
        logger.info(f"止损: {stop_loss:.2f}")
        
        if take_profit_levels:
            logger.info(f"止盈目标:")
            for i, level in enumerate(take_profit_levels):
                logger.info(f"  目标{i+1}: {level['price']:.2f} ({level['close_ratio']:.0%})")
        
        logger.info("=" * 60)
        
        # 模拟记录交易
        self.risk_manager.record_trade({
            'symbol': self.symbol,
            'side': signal_type,
            'amount': amount,
            'price': price,
            'stop_loss': stop_loss,
            'pnl': 0
        })
    
    def get_status(self) -> Dict[str, Any]:
        """获取机器人状态"""
        return {
            'running': self.running,
            'mode': self.mode,
            'symbol': self.symbol,
            'timeframe': self.timeframe,
            'strategy': self.strategy.name,
            'last_signal': self.last_signal,
            'positions': self.trading_engine.get_positions(),
            'statistics': {
                'trading': self.trading_engine.get_statistics(),
                'risk': self.risk_manager.get_statistics()
            }
        }
    
    def get_performance_report(self) -> str:
        """获取性能报告"""
        status = self.get_status()
        risk_stats = status['statistics']['risk']
        trading_stats = status['statistics']['trading']
        
        report = f"""
╔══════════════════════════════════════════════════════════════╗
║                    交易机器人性能报告                        ║
╚══════════════════════════════════════════════════════════════╝

【基本信息】
  交易对: {self.symbol}
  策略:   {self.strategy.name}
  周期:   {self.timeframe}
  模式:   {self.mode.upper()}
  状态:   {'运行中' if self.running else '已停止'}

【交易统计】
  总交易: {trading_stats['total_trades']}
  盈利:   {trading_stats['winning_trades']}
  亏损:   {trading_stats['losing_trades']}
  胜率:   {trading_stats['win_rate']:.1f}%
  持仓:   {trading_stats['active_positions']}
  挂单:   {trading_stats['active_orders']}

【资金状况】
  初始:   {risk_stats['capital']['initial']:,.2f} USDT
  当前:   {risk_stats['capital']['current']:,.2f} USDT
  盈亏:   {risk_stats['capital']['total_pnl']:+,.2f} USDT
  收益率: {risk_stats['capital']['total_return']:+.2%}

【最新信号】
  信号:   {self.last_signal['signal'] if self.last_signal else 'N/A'}
  原因:   {self.last_signal.get('reason', 'N/A') if self.last_signal else 'N/A'}

╚══════════════════════════════════════════════════════════════╝
        """
        
        return report


class MultiSymbolTradingBot:
    """
    多交易对交易机器人
    
    同时管理多个交易对的交易
    """
    
    def __init__(self, 
                 exchange: ccxt_async.Exchange,
                 strategy_configs: List[Dict[str, Any]],
                 initial_capital: float = 10000.0,
                 risk_limits: Optional[RiskLimits] = None):
        """
        初始化多交易对机器人
        
        Args:
            exchange: ccxt 交易所实例
            strategy_configs: 策略配置列表，每个包含 symbol, strategy, timeframe 等
            initial_capital: 初始资金
            risk_limits: 风险限制
        """
        self.exchange = exchange
        self.strategy_configs = strategy_configs
        self.initial_capital = initial_capital
        self.risk_limits = risk_limits
        
        # 为每个交易对创建独立的机器人
        self.bots: Dict[str, TradingBot] = {}
        
        # 分配资金（平均分配）
        capital_per_bot = initial_capital / len(strategy_configs)
        
        for config in strategy_configs:
            symbol = config['symbol']
            strategy = config['strategy']
            timeframe = config.get('timeframe', '15m')
            
            bot = TradingBot(
                exchange=exchange,
                strategy=strategy,
                symbol=symbol,
                timeframe=timeframe,
                initial_capital=capital_per_bot,
                risk_limits=risk_limits,
                config=config
            )
            
            self.bots[symbol] = bot
        
        logger.info(f"多交易对机器人初始化: {len(self.bots)} 个交易对")
    
    async def start(self):
        """启动所有机器人"""
        logger.info("=" * 60)
        logger.info("🚀 启动多交易对交易机器人")
        logger.info(f"交易对数量: {len(self.bots)}")
        logger.info("=" * 60)
        
        # 并发启动所有机器人
        tasks = [bot.start() for bot in self.bots.values()]
        await asyncio.gather(*tasks, return_exceptions=True)
    
    async def stop(self):
        """停止所有机器人"""
        logger.info("🛑 停止所有交易机器人...")
        
        tasks = [bot.stop() for bot in self.bots.values()]
        await asyncio.gather(*tasks, return_exceptions=True)
        
        logger.info("✅ 所有机器人已停止")
    
    def get_overall_status(self) -> Dict[str, Any]:
        """获取整体状态"""
        total_pnl = 0.0
        total_trades = 0
        total_positions = 0
        
        bot_statuses = {}
        
        for symbol, bot in self.bots.items():
            status = bot.get_status()
            bot_statuses[symbol] = status
            
            stats = status['statistics']
            total_pnl += stats['risk']['pnl']['total']
            total_trades += stats['trading']['total_trades']
            total_positions += stats['trading']['active_positions']
        
        return {
            'total_bots': len(self.bots),
            'total_pnl': total_pnl,
            'total_trades': total_trades,
            'total_positions': total_positions,
            'bots': bot_statuses
        }
