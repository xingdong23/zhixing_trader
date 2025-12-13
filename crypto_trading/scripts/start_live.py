#!/usr/bin/env python3
"""
实盘交易启动脚本
"""
import sys
import argparse
import logging
from pathlib import Path

# 添加项目根目录到 Python 路径
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from config.settings import (
    OKX_API_KEY, OKX_SECRET, OKX_PASSPHRASE,
    FEISHU_WEBHOOK_URL, DRY_RUN, LOGS_DIR
)
from core.exchange import ExchangeClient
from strategies.momentum_v11 import MomentumV11Strategy
from notifications.feishu import FeishuNotifier
from live.runner import LiveRunner


def setup_logging(log_file: str = None):
    """配置日志"""
    handlers = [logging.StreamHandler(sys.stdout)]
    
    if log_file:
        log_path = LOGS_DIR / log_file
        log_path.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(logging.FileHandler(log_path))
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=handlers
    )


def main():
    parser = argparse.ArgumentParser(description="Start live trading bot")
    parser.add_argument(
        "--strategy", 
        type=str, 
        default="momentum_v11",
        help="Strategy name"
    )
    parser.add_argument(
        "--symbol", 
        type=str, 
        default="DOGE/USDT:USDT",
        help="Trading symbol"
    )
    parser.add_argument(
        "--dry-run", 
        action="store_true",
        default=None,
        help="Run in dry-run mode (no actual trading)"
    )
    parser.add_argument(
        "--log-file",
        type=str,
        default="live.log",
        help="Log file name"
    )
    
    args = parser.parse_args()
    
    # 确定 dry_run 模式
    dry_run = args.dry_run if args.dry_run is not None else DRY_RUN
    
    # 配置日志
    setup_logging(args.log_file)
    logger = logging.getLogger(__name__)
    
    logger.info(f"Starting live trading: {args.symbol}")
    logger.info(f"Strategy: {args.strategy}")
    logger.info(f"Dry run: {dry_run}")
    
    # 初始化组件
    try:
        # 交易所
        exchange = ExchangeClient(
            exchange_name='okx',
            api_key=OKX_API_KEY,
            secret=OKX_SECRET,
            password=OKX_PASSPHRASE
        )
        
        # 策略
        if args.strategy == "momentum_v11":
            strategy = MomentumV11Strategy()
        else:
            raise ValueError(f"Unknown strategy: {args.strategy}")
        
        # 通知
        notifier = FeishuNotifier(FEISHU_WEBHOOK_URL)
        
        # 运行器
        runner = LiveRunner(
            strategy=strategy,
            exchange=exchange,
            symbol=args.symbol,
            notifier=notifier,
            state_file=str(LOGS_DIR / f"state_{args.symbol.replace('/', '_')}.json"),
            dry_run=dry_run
        )
        
        # 启动
        runner.run()
        
    except KeyboardInterrupt:
        logger.info("Stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        raise


if __name__ == "__main__":
    main()
