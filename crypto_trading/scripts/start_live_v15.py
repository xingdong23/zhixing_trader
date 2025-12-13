#!/usr/bin/env python3
"""
V15 复利引擎 启动脚本

特性:
- 自动复利 (30% 仓位)
- 提现保护 (100% 盈利提现一半)
- 动态减仓 (连亏减仓)
- 金字塔加仓 (10% 盈利加仓)

用法:
    # 观察模式 (推荐先用这个)
    python scripts/start_live_v15.py --dry-run --capital 220
    
    # 实盘模式
    python scripts/start_live_v15.py --capital 220
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

import argparse
import logging

from config.settings import settings
from core.exchange import ExchangeClient
from strategies.turbo_engine_v15 import TurboEngineV15
from notifications.feishu import FeishuNotifier
from live.runner_v15 import LiveRunnerV15


def setup_logging(level: str = "INFO"):
    """配置日志"""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )


def main():
    parser = argparse.ArgumentParser(description="V15 复利引擎")
    parser.add_argument("--symbol", type=str, default="DOGE/USDT:USDT",
                       help="交易对 (默认: DOGE/USDT:USDT)")
    parser.add_argument("--capital", type=float, default=220,
                       help="初始资金 (默认: 220 USDT)")
    parser.add_argument("--dry-run", action="store_true",
                       help="观察模式，不实际下单")
    parser.add_argument("--log-level", type=str, default="INFO",
                       help="日志级别 (默认: INFO)")
    
    args = parser.parse_args()
    
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)
    
    # 确定模式
    dry_run = args.dry_run or settings.DRY_RUN
    mode = "🔍 观察模式" if dry_run else "💰 实盘模式"
    
    logger.info("=" * 50)
    logger.info("🚀 V15 复利引擎 启动")
    logger.info(f"   币种: {args.symbol}")
    logger.info(f"   资金: {args.capital} USDT")
    logger.info(f"   模式: {mode}")
    logger.info("=" * 50)
    
    # 初始化组件
    exchange = ExchangeClient()
    strategy = TurboEngineV15()
    notifier = FeishuNotifier(settings.FEISHU_WEBHOOK_URL)
    
    # 创建 V15 运行器
    runner = LiveRunnerV15(
        strategy=strategy,
        exchange=exchange,
        symbol=args.symbol,
        notifier=notifier,
        dry_run=dry_run,
        initial_capital=args.capital,
    )
    
    # 启动
    try:
        runner.run()
    except KeyboardInterrupt:
        logger.info("用户中断")
    except Exception as e:
        logger.error(f"运行错误: {e}")
        raise


if __name__ == "__main__":
    main()
