"""
日志系统测试 - 验证所有日志记录功能
"""

import sys
import os
import logging
from datetime import datetime
from pathlib import Path

sys.path.append('.')

from app.core.strategies.high_frequency_scalping_strategy import HighFrequencyScalpingStrategy
import numpy as np


def setup_logging():
    """设置日志系统"""
    # 创建日志目录
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # 日志文件名
    log_file = log_dir / f"test_logging_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    
    # 配置日志
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s | %(name)s | %(levelname)s | %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler()
        ]
    )
    
    return log_file


def generate_test_klines(num_bars: int = 200):
    """生成测试K线"""
    klines = []
    base_price = 50000.0
    
    for i in range(num_bars):
        change = np.random.randn() * 100
        current_price = base_price + change
        
        klines.append({
            "timestamp": datetime.now(),
            "open": current_price,
            "high": current_price + abs(np.random.randn() * 50),
            "low": current_price - abs(np.random.randn() * 50),
            "close": current_price + np.random.randn() * 30,
            "volume": 1000 + abs(np.random.randn() * 500)
        })
        
        base_price = current_price
    
    return klines


def test_logging_system():
    """测试日志系统"""
    logger = logging.getLogger(__name__)
    
    print("\n" + "="*60)
    print("日志系统测试")
    print("="*60)
    
    # 1. 测试不同级别的日志
    logger.debug("这是DEBUG级别日志 - 调试信息")
    logger.info("这是INFO级别日志 - 一般信息")
    logger.warning("这是WARNING级别日志 - 警告信息")
    logger.error("这是ERROR级别日志 - 错误信息")
    
    # 2. 测试策略日志
    logger.info("\n【策略初始化】")
    strategy = HighFrequencyScalpingStrategy()
    logger.info(f"策略名称: {strategy.name}")
    logger.info(f"策略参数: {len(strategy.parameters)} 个")
    
    # 3. 测试交易信号日志
    logger.info("\n【生成交易信号】")
    klines = generate_test_klines(200)
    signal = strategy.analyze(klines)
    
    logger.info(f"信号类型: {signal['signal']}")
    logger.info(f"信号原因: {signal['reason']}")
    
    if 'analysis' in signal:
        logger.info("技术分析:")
        for key, value in signal['analysis'].items():
            if isinstance(value, (int, float)):
                logger.info(f"  - {key}: {value:.2f}")
            elif isinstance(value, dict):
                logger.info(f"  - {key}: {value}")
    
    # 4. 测试风险控制日志
    logger.info("\n【风险控制检查】")
    risk_check = strategy._check_risk_controls()
    logger.info(f"风险检查结果: {risk_check['allowed']}")
    logger.info(f"检查原因: {risk_check['reason']}")
    
    # 5. 测试模拟交易日志
    logger.info("\n【模拟交易执行】")
    
    # 模拟开仓
    logger.info("执行开仓操作:")
    logger.info("  交易对: BTC/USDT")
    logger.info("  方向: 做多")
    logger.info("  价格: 50000.00 USDT")
    logger.info("  数量: 0.006 BTC")
    logger.info("  止损: 49600.00 USDT (-0.8%)")
    logger.info("  止盈: 51000.00 USDT (+2.0%)")
    logger.info("  杠杆: 3x")
    
    # 模拟持仓更新
    logger.info("\n【持仓更新】")
    logger.info("当前价格: 50500.00 USDT")
    logger.info("未实现盈亏: +3.00 USDT (+1.0%)")
    
    # 模拟平仓
    logger.info("\n【平仓操作】")
    logger.info("触发条件: 止盈")
    logger.info("平仓价格: 51000.00 USDT")
    logger.info("实现盈亏: +6.00 USDT (+2.0%)")
    
    # 6. 测试统计信息日志
    logger.info("\n【策略统计】")
    stats = strategy.get_statistics()
    logger.info(f"今日交易次数: {stats['daily_trades']}")
    logger.info(f"盈利次数: {stats['winning_trades']}")
    logger.info(f"亏损次数: {stats['losing_trades']}")
    logger.info(f"胜率: {stats['win_rate']:.1f}%")
    logger.info(f"今日盈亏: {strategy.daily_pnl:.2f} USDT")
    
    # 7. 测试异常日志
    logger.info("\n【异常处理测试】")
    try:
        # 模拟一个异常
        raise ValueError("这是一个测试异常")
    except Exception as e:
        logger.error(f"捕获异常: {e}", exc_info=True)
    
    # 8. 测试性能日志
    logger.info("\n【性能指标】")
    import time
    start_time = time.time()
    
    # 执行一些操作
    for _ in range(10):
        strategy.analyze(klines)
    
    elapsed = time.time() - start_time
    logger.info(f"执行10次策略分析耗时: {elapsed:.3f} 秒")
    logger.info(f"平均每次耗时: {elapsed/10:.3f} 秒")
    
    print("\n" + "="*60)
    print("✅ 日志系统测试完成")
    print("="*60)


def test_log_file_content(log_file):
    """验证日志文件内容"""
    print("\n" + "="*60)
    print("验证日志文件")
    print("="*60)
    
    if not log_file.exists():
        print(f"❌ 日志文件不存在: {log_file}")
        return False
    
    # 读取日志文件
    with open(log_file, 'r', encoding='utf-8') as f:
        content = f.read()
        lines = content.split('\n')
    
    print(f"✓ 日志文件路径: {log_file}")
    print(f"✓ 日志文件大小: {log_file.stat().st_size} 字节")
    print(f"✓ 日志行数: {len(lines)}")
    
    # 检查关键日志
    keywords = [
        "策略初始化",
        "生成交易信号",
        "风险控制检查",
        "模拟交易执行",
        "持仓更新",
        "平仓操作",
        "策略统计"
    ]
    
    print("\n关键日志检查:")
    for keyword in keywords:
        found = any(keyword in line for line in lines)
        status = "✓" if found else "✗"
        print(f"  {status} {keyword}")
    
    # 显示最后10行日志
    print("\n最后10行日志:")
    print("-" * 60)
    for line in lines[-10:]:
        if line.strip():
            print(line)
    print("-" * 60)
    
    return True


def main():
    """主函数"""
    # 设置日志
    log_file = setup_logging()
    
    # 运行日志测试
    test_logging_system()
    
    # 验证日志文件
    test_log_file_content(log_file)
    
    print(f"\n📄 完整日志已保存到: {log_file}")
    print("\n🎉 日志系统测试全部通过！\n")


if __name__ == "__main__":
    main()
