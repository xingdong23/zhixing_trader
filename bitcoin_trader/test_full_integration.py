"""
完整集成测试 - 模拟真实交易流程
测试内容：
1. 数据库连接和表创建
2. 策略初始化
3. K线数据获取
4. 信号生成
5. 订单执行
6. 数据库记录
7. 持仓管理
8. 日志记录
"""

import sys
import os
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict
import json

sys.path.append('.')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, Order, Position, Strategy, Kline
from app.core.strategies.high_frequency_scalping_strategy import HighFrequencyScalpingStrategy
import numpy as np

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MockExchange:
    """模拟交易所"""
    
    def __init__(self):
        self.current_price = 50000.0
        self.orders = []
        self.positions = {}
        
    def create_market_order(self, symbol: str, side: str, amount: float):
        """模拟市价单"""
        order_id = f"ORDER_{len(self.orders) + 1}"
        order = {
            'id': order_id,
            'symbol': symbol,
            'side': side,
            'type': 'market',
            'amount': amount,
            'price': self.current_price,
            'filled': amount,
            'status': 'filled',
            'timestamp': datetime.now().timestamp() * 1000
        }
        self.orders.append(order)
        logger.info(f"✓ 模拟订单执行: {side} {amount} @ {self.current_price}")
        return order
    
    def fetch_ohlcv(self, symbol: str, timeframe: str = '5m', limit: int = 200):
        """模拟获取K线数据"""
        klines = []
        base_price = self.current_price
        
        for i in range(limit):
            timestamp = (datetime.now() - timedelta(minutes=(limit-i)*5)).timestamp() * 1000
            
            # 模拟价格波动
            change = np.random.randn() * 100
            open_price = base_price + change
            high_price = open_price + abs(np.random.randn() * 50)
            low_price = open_price - abs(np.random.randn() * 50)
            close_price = open_price + np.random.randn() * 30
            volume = 1000 + abs(np.random.randn() * 500)
            
            klines.append([
                timestamp,
                open_price,
                high_price,
                low_price,
                close_price,
                volume
            ])
            
            base_price = close_price
        
        self.current_price = klines[-1][4]  # 更新当前价格
        return klines


class IntegrationTester:
    """集成测试器"""
    
    def __init__(self):
        # 创建内存数据库
        self.engine = create_engine('sqlite:///:memory:', echo=False)
        Base.metadata.create_all(self.engine)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
        
        # 模拟交易所
        self.exchange = MockExchange()
        
        # 初始化策略
        self.strategy = HighFrequencyScalpingStrategy()
        
        # 测试结果
        self.test_results = []
        
        logger.info("="*60)
        logger.info("集成测试器初始化完成")
        logger.info("="*60)
    
    def test_database_setup(self):
        """测试1: 数据库设置"""
        logger.info("\n【测试1】数据库设置")
        
        try:
            # 创建策略记录
            strategy_record = Strategy(
                name="高频短线策略",
                code="high_frequency_scalping",
                description="基于多技术指标的高频短线交易策略",
                parameters=json.dumps(self.strategy.parameters),
                enabled=True,
                exchange="OKX",
                symbol="BTC/USDT",
                interval="5m"
            )
            self.session.add(strategy_record)
            self.session.commit()
            
            logger.info(f"✓ 策略记录创建成功: ID={strategy_record.id}")
            self.strategy_id = strategy_record.id
            self.test_results.append(("数据库设置", True, "策略记录创建成功"))
            return True
            
        except Exception as e:
            logger.error(f"✗ 数据库设置失败: {e}")
            self.test_results.append(("数据库设置", False, str(e)))
            return False
    
    def test_kline_storage(self):
        """测试2: K线数据存储"""
        logger.info("\n【测试2】K线数据存储")
        
        try:
            # 获取K线数据
            ohlcv = self.exchange.fetch_ohlcv("BTC/USDT", "5m", 50)
            
            # 存储到数据库
            stored_count = 0
            for candle in ohlcv[-10:]:  # 只存储最后10根
                kline = Kline(
                    exchange="OKX",
                    symbol="BTC/USDT",
                    interval="5m",
                    open_time=datetime.fromtimestamp(candle[0]/1000),
                    open=candle[1],
                    high=candle[2],
                    low=candle[3],
                    close=candle[4],
                    volume=candle[5],
                    close_time=datetime.fromtimestamp(candle[0]/1000) + timedelta(minutes=5)
                )
                self.session.add(kline)
                stored_count += 1
            
            self.session.commit()
            
            # 验证存储
            count = self.session.query(Kline).count()
            logger.info(f"✓ K线数据存储成功: {count}条记录")
            self.test_results.append(("K线数据存储", True, f"{count}条记录"))
            return True
            
        except Exception as e:
            logger.error(f"✗ K线数据存储失败: {e}")
            self.test_results.append(("K线数据存储", False, str(e)))
            return False
    
    def test_strategy_signal_generation(self):
        """测试3: 策略信号生成"""
        logger.info("\n【测试3】策略信号生成")
        
        try:
            # 获取K线数据
            ohlcv = self.exchange.fetch_ohlcv("BTC/USDT", "5m", 200)
            
            # 转换为策略所需格式
            klines = []
            for candle in ohlcv:
                klines.append({
                    "timestamp": datetime.fromtimestamp(candle[0]/1000),
                    "open": candle[1],
                    "high": candle[2],
                    "low": candle[3],
                    "close": candle[4],
                    "volume": candle[5]
                })
            
            # 生成信号
            signal = self.strategy.analyze(klines)
            
            logger.info(f"✓ 信号生成: {signal['signal']}")
            logger.info(f"  原因: {signal['reason']}")
            
            if signal['signal'] != 'hold':
                logger.info(f"  价格: {signal.get('price', 0):.2f}")
                logger.info(f"  数量: {signal.get('amount', 0):.6f}")
                logger.info(f"  止损: {signal.get('stop_loss', 0):.2f}")
                logger.info(f"  止盈: {signal.get('take_profit', 0):.2f}")
            
            self.test_results.append(("信号生成", True, signal['signal']))
            self.last_signal = signal
            return signal
            
        except Exception as e:
            logger.error(f"✗ 信号生成失败: {e}")
            self.test_results.append(("信号生成", False, str(e)))
            return None
    
    def test_order_execution_and_storage(self):
        """测试4: 订单执行和存储"""
        logger.info("\n【测试4】订单执行和存储")
        
        try:
            # 模拟一个买入信号
            signal = {
                "signal": "buy",
                "price": 50000.0,
                "amount": 0.006,
                "stop_loss": 49600.0,
                "take_profit": 51000.0,
                "leverage": 3.0
            }
            
            # 执行订单
            order = self.exchange.create_market_order(
                symbol="BTC/USDT",
                side=signal["signal"],
                amount=signal["amount"]
            )
            
            # 存储订单到数据库
            order_record = Order(
                exchange="OKX",
                order_id=order['id'],
                symbol="BTC/USDT",
                side=signal["signal"],
                type="market",
                price=order['price'],
                amount=order['amount'],
                filled=order['filled'],
                status=order['status'],
                strategy_id=self.strategy_id
            )
            self.session.add(order_record)
            self.session.commit()
            
            logger.info(f"✓ 订单执行并存储: {order['id']}")
            logger.info(f"  方向: {signal['signal']}")
            logger.info(f"  价格: {order['price']:.2f}")
            logger.info(f"  数量: {order['amount']:.6f}")
            logger.info(f"  状态: {order['status']}")
            
            self.test_results.append(("订单执行", True, order['id']))
            self.last_order = order
            return order
            
        except Exception as e:
            logger.error(f"✗ 订单执行失败: {e}")
            self.test_results.append(("订单执行", False, str(e)))
            return None
    
    def test_position_management(self):
        """测试5: 持仓管理"""
        logger.info("\n【测试5】持仓管理")
        
        try:
            # 创建持仓记录
            position_record = Position(
                exchange="OKX",
                symbol="BTC/USDT",
                side="long",
                amount=0.006,
                entry_price=50000.0,
                current_price=50000.0,
                unrealized_pnl=0.0,
                strategy_id=self.strategy_id
            )
            self.session.add(position_record)
            self.session.commit()
            
            logger.info(f"✓ 持仓记录创建: ID={position_record.id}")
            logger.info(f"  方向: {position_record.side}")
            logger.info(f"  数量: {position_record.amount}")
            logger.info(f"  入场价: {position_record.entry_price:.2f}")
            
            # 模拟价格变化，更新持仓
            new_price = 50500.0
            unrealized_pnl = (new_price - position_record.entry_price) * position_record.amount
            
            position_record.current_price = new_price
            position_record.unrealized_pnl = unrealized_pnl
            self.session.commit()
            
            logger.info(f"✓ 持仓更新:")
            logger.info(f"  当前价: {new_price:.2f}")
            logger.info(f"  未实现盈亏: {unrealized_pnl:.2f} USDT ({unrealized_pnl/position_record.entry_price/position_record.amount*100:.2f}%)")
            
            self.test_results.append(("持仓管理", True, f"盈亏{unrealized_pnl:.2f}"))
            self.position_id = position_record.id
            return position_record
            
        except Exception as e:
            logger.error(f"✗ 持仓管理失败: {e}")
            self.test_results.append(("持仓管理", False, str(e)))
            return None
    
    def test_position_close(self):
        """测试6: 平仓流程"""
        logger.info("\n【测试6】平仓流程")
        
        try:
            # 获取持仓
            position = self.session.query(Position).filter_by(id=self.position_id).first()
            
            # 执行平仓订单
            close_order = self.exchange.create_market_order(
                symbol="BTC/USDT",
                side="sell",
                amount=position.amount
            )
            
            # 记录平仓订单
            order_record = Order(
                exchange="OKX",
                order_id=close_order['id'],
                symbol="BTC/USDT",
                side="sell",
                type="market",
                price=close_order['price'],
                amount=close_order['amount'],
                filled=close_order['filled'],
                status=close_order['status'],
                strategy_id=self.strategy_id
            )
            self.session.add(order_record)
            
            # 计算实现盈亏
            realized_pnl = (close_order['price'] - position.entry_price) * position.amount
            
            # 更新持仓状态
            position.closed_at = datetime.now()
            position.current_price = close_order['price']
            position.unrealized_pnl = 0.0
            
            self.session.commit()
            
            logger.info(f"✓ 平仓完成: {close_order['id']}")
            logger.info(f"  入场价: {position.entry_price:.2f}")
            logger.info(f"  出场价: {close_order['price']:.2f}")
            logger.info(f"  实现盈亏: {realized_pnl:.2f} USDT ({realized_pnl/position.entry_price/position.amount*100:.2f}%)")
            
            self.test_results.append(("平仓流程", True, f"盈亏{realized_pnl:.2f}"))
            return realized_pnl
            
        except Exception as e:
            logger.error(f"✗ 平仓流程失败: {e}")
            self.test_results.append(("平仓流程", False, str(e)))
            return None
    
    def test_database_query(self):
        """测试7: 数据库查询"""
        logger.info("\n【测试7】数据库查询")
        
        try:
            # 查询所有订单
            orders = self.session.query(Order).all()
            logger.info(f"✓ 订单总数: {len(orders)}")
            
            for order in orders:
                logger.info(f"  - {order.side} {order.amount} @ {order.price:.2f} ({order.status})")
            
            # 查询所有持仓
            positions = self.session.query(Position).all()
            logger.info(f"✓ 持仓总数: {len(positions)}")
            
            for pos in positions:
                status = "已平仓" if pos.closed_at else "持仓中"
                logger.info(f"  - {pos.side} {pos.amount} @ {pos.entry_price:.2f} ({status})")
            
            # 查询K线数据
            klines = self.session.query(Kline).all()
            logger.info(f"✓ K线总数: {len(klines)}")
            
            self.test_results.append(("数据库查询", True, f"{len(orders)}订单,{len(positions)}持仓"))
            return True
            
        except Exception as e:
            logger.error(f"✗ 数据库查询失败: {e}")
            self.test_results.append(("数据库查询", False, str(e)))
            return False
    
    def test_strategy_state_management(self):
        """测试8: 策略状态管理"""
        logger.info("\n【测试8】策略状态管理")
        
        try:
            # 测试策略统计
            stats = self.strategy.get_statistics()
            
            logger.info(f"✓ 策略统计:")
            logger.info(f"  今日交易: {stats['daily_trades']}")
            logger.info(f"  盈利次数: {stats['winning_trades']}")
            logger.info(f"  亏损次数: {stats['losing_trades']}")
            logger.info(f"  胜率: {stats['win_rate']:.1f}%")
            logger.info(f"  当前持仓: {stats['current_position']}")
            
            # 测试风险控制
            risk_check = self.strategy._check_risk_controls()
            logger.info(f"✓ 风险检查: {risk_check['reason']}")
            
            self.test_results.append(("策略状态", True, f"胜率{stats['win_rate']:.1f}%"))
            return True
            
        except Exception as e:
            logger.error(f"✗ 策略状态管理失败: {e}")
            self.test_results.append(("策略状态", False, str(e)))
            return False
    
    def print_summary(self):
        """打印测试总结"""
        logger.info("\n" + "="*60)
        logger.info("测试总结")
        logger.info("="*60)
        
        passed = sum(1 for _, success, _ in self.test_results if success)
        total = len(self.test_results)
        
        for test_name, success, detail in self.test_results:
            status = "✓ 通过" if success else "✗ 失败"
            logger.info(f"{status} | {test_name:20s} | {detail}")
        
        logger.info("="*60)
        logger.info(f"总计: {passed}/{total} 测试通过")
        logger.info("="*60)
        
        if passed == total:
            logger.info("🎉 所有测试通过！系统运行正常！")
            return True
        else:
            logger.warning(f"⚠️  有 {total-passed} 个测试失败")
            return False
    
    def run_all_tests(self):
        """运行所有测试"""
        logger.info("\n" + "="*60)
        logger.info("开始完整集成测试")
        logger.info("="*60)
        
        self.test_database_setup()
        self.test_kline_storage()
        self.test_strategy_signal_generation()
        self.test_order_execution_and_storage()
        self.test_position_management()
        self.test_position_close()
        self.test_database_query()
        self.test_strategy_state_management()
        
        return self.print_summary()


def main():
    """主函数"""
    tester = IntegrationTester()
    success = tester.run_all_tests()
    
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())
