"""
主程序 - 模拟盘交易系统
"""
import sys
import time
import signal
from pathlib import Path
from datetime import datetime

# 添加src到路径
sys.path.insert(0, str(Path(__file__).parent))

from config import Config
from database import get_db
from okx_connector import get_okx
from paper_engine import get_engine
from strategy_runner import get_runner
import logging

# 配置日志
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(Config.LOG_FILE),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# 全局标志
running = True


def signal_handler(signum, frame):
    """信号处理器"""
    global running
    logger.info("\n收到停止信号，正在关闭...")
    running = False


def print_banner():
    """打印欢迎信息"""
    print("=" * 80)
    print("📊 模拟盘交易系统")
    print("=" * 80)
    print(f"策略: {Config.STRATEGY_NAME}")
    print(f"交易对: {Config.SYMBOL}")
    print(f"初始资金: {Config.INITIAL_BALANCE} USDT")
    print(f"杠杆: {Config.LEVERAGE}x")
    print(f"仓位: {Config.POSITION_SIZE * 100}%")
    print(f"检查间隔: {Config.CHECK_INTERVAL}秒 (持仓) / {Config.SIGNAL_CHECK_INTERVAL}秒 (信号)")
    print("=" * 80)
    print()


def print_status(runner, engine):
    """打印当前状态"""
    try:
        # 获取账户余额
        balance = engine.get_account_balance()
        
        # 获取持仓
        position = engine.db.get_position(Config.SYMBOL)
        
        # 获取当前价格
        current_price = runner.okx.get_current_price(Config.SYMBOL)
        
        print("\n" + "=" * 80)
        print(f"📊 状态更新 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        print(f"💰 账户余额: {balance['total_equity']:.2f} USDT")
        print(f"   可用余额: {balance['available_balance']:.2f} USDT")
        print(f"   已用保证金: {balance.get('margin_used', 0):.2f} USDT")
        print(f"   未实现盈亏: {balance.get('unrealized_pnl', 0):+.2f} USDT")
        print(f"   总盈亏: {balance.get('total_pnl', 0):+.2f} USDT ({balance.get('total_pnl_percent', 0):+.2f}%)")
        
        if position:
            print(f"\n📈 当前持仓:")
            print(f"   方向: {position['side']}")
            print(f"   入场价: {position['entry_price']:.2f}")
            print(f"   当前价: {current_price:.2f}")
            print(f"   数量: {position['amount']:.4f}")
            print(f"   未实现盈亏: {position.get('unrealized_pnl', 0):+.2f} ({position.get('unrealized_pnl_percent', 0):+.2f}%)")
            print(f"   止损: {position.get('stop_loss', 0):.2f}")
            print(f"   止盈: {position.get('take_profit', 0):.2f}")
        else:
            print(f"\n📭 当前无持仓")
            print(f"   当前价格: {current_price:.2f}")
        
        print("=" * 80)
        
    except Exception as e:
        logger.error(f"打印状态失败: {e}")


def main():
    """主函数"""
    global running
    
    # 设置信号处理器
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # 打印欢迎信息
        print_banner()
        
        # 验证配置
        logger.info("验证配置...")
        Config.validate()
        
        # 初始化组件
        logger.info("初始化数据库...")
        db = get_db()
        
        logger.info("初始化欧易连接...")
        okx = get_okx()
        
        logger.info("测试API连接...")
        if not okx.test_connection():
            logger.error("❌ API连接测试失败，请检查配置")
            return
        
        logger.info("初始化模拟交易引擎...")
        engine = get_engine()
        
        logger.info("初始化策略执行器...")
        runner = get_runner()
        
        logger.info("\n✅ 所有组件初始化成功！")
        logger.info("=" * 80)
        logger.info("🚀 模拟盘系统启动")
        logger.info("=" * 80)
        
        # 打印初始状态
        print_status(runner, engine)
        
        # 主循环
        last_signal_check = 0
        last_position_check = 0
        
        while running:
            try:
                current_time = time.time()
                
                # 检查是否需要运行策略分析
                if current_time - last_signal_check >= Config.SIGNAL_CHECK_INTERVAL:
                    logger.info("\n" + "=" * 60)
                    logger.info("🔍 开始策略分析...")
                    logger.info("=" * 60)
                    
                    # 运行策略
                    signal = runner.run_strategy()
                    
                    # 如果有信号，执行
                    if signal['signal'] != 'hold':
                        logger.info(f"📢 收到信号: {signal['signal']} - {signal.get('reason')}")
                        
                        # 执行信号
                        success = runner.execute_signal(signal)
                        if success:
                            logger.info("✅ 信号执行成功")
                        else:
                            logger.warning("⚠️ 信号执行失败")
                    
                    last_signal_check = current_time
                    
                    # 打印状态
                    print_status(runner, engine)
                
                # 检查持仓（止损止盈）
                if current_time - last_position_check >= Config.CHECK_INTERVAL:
                    # 检查持仓
                    closed = runner.check_positions()
                    if closed:
                        logger.info("✅ 持仓已平仓")
                        print_status(runner, engine)
                    
                    last_position_check = current_time
                
                # 休眠
                time.sleep(10)
                
            except KeyboardInterrupt:
                logger.info("\n收到中断信号...")
                break
            except Exception as e:
                logger.error(f"❌ 主循环异常: {e}", exc_info=True)
                time.sleep(60)  # 出错后等待1分钟
        
        logger.info("\n" + "=" * 80)
        logger.info("👋 模拟盘系统已停止")
        logger.info("=" * 80)
        
        # 打印最终状态
        print_status(runner, engine)
        
    except Exception as e:
        logger.error(f"❌ 系统启动失败: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
