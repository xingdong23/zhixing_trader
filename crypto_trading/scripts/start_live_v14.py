#!/usr/bin/env python3
"""
V14 实盘交易启动脚本
支持智能资金管理
"""
import sys
import argparse
import logging
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from config.settings import (
    OKX_API_KEY, OKX_SECRET, OKX_PASSPHRASE,
    FEISHU_WEBHOOK_URL, DRY_RUN, LOGS_DIR
)
from core.exchange import ExchangeClient
from strategies.momentum_v11 import MomentumV11Strategy
from notifications.feishu import FeishuNotifier
from live.runner_v14 import LiveRunnerV14


def setup_logging(log_file: str = None):
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
    parser = argparse.ArgumentParser(description="Start V14 live trading bot")
    parser.add_argument("--strategy", type=str, default="momentum_v11")
    parser.add_argument("--symbol", type=str, default="DOGE/USDT:USDT")
    parser.add_argument("--dry-run", action="store_true", default=None)
    parser.add_argument("--capital", type=float, default=1000, help="Initial capital")
    parser.add_argument("--no-smart-money", action="store_true", help="Disable smart money management")
    parser.add_argument("--log-file", type=str, default="live_v14.log")
    
    args = parser.parse_args()
    
    dry_run = args.dry_run if args.dry_run is not None else DRY_RUN
    
    setup_logging(args.log_file)
    logger = logging.getLogger(__name__)
    
    logger.info(f"Starting V14 live trading: {args.symbol}")
    logger.info(f"Initial capital: {args.capital} USDT")
    logger.info(f"Smart money: {not args.no_smart_money}")
    logger.info(f"Dry run: {dry_run}")
    
    try:
        exchange = ExchangeClient(
            exchange_name='okx',
            api_key=OKX_API_KEY,
            secret=OKX_SECRET,
            password=OKX_PASSPHRASE
        )
        
        if args.strategy == "momentum_v11":
            strategy = MomentumV11Strategy()
        else:
            raise ValueError(f"Unknown strategy: {args.strategy}")
        
        notifier = FeishuNotifier(FEISHU_WEBHOOK_URL)
        
        runner = LiveRunnerV14(
            strategy=strategy,
            exchange=exchange,
            symbol=args.symbol,
            notifier=notifier,
            state_file=str(LOGS_DIR / f"state_v14_{args.symbol.replace('/', '_')}.json"),
            dry_run=dry_run,
            initial_capital=args.capital,
            enable_smart_money=not args.no_smart_money
        )
        
        runner.run()
        
    except KeyboardInterrupt:
        logger.info("Stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        raise


if __name__ == "__main__":
    main()
