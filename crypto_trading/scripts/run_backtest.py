#!/usr/bin/env python3
"""
回测脚本
"""
import sys
import argparse
import logging
from pathlib import Path
from datetime import datetime

# 添加项目根目录到 Python 路径
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from core.exchange import ExchangeClient
from strategies.momentum_v11 import MomentumV11Strategy
from backtest.engine import BacktestEngine
from config.settings import OKX_API_KEY, OKX_SECRET, OKX_PASSPHRASE


def main():
    parser = argparse.ArgumentParser(description="Run backtest")
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
        "--limit",
        type=int,
        default=500,
        help="Number of candles to fetch"
    )
    parser.add_argument(
        "--capital",
        type=float,
        default=1000,
        help="Initial capital"
    )
    
    args = parser.parse_args()
    
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    logger.info(f"Starting backtest: {args.symbol}")
    
    # 初始化交易所 (用于获取数据)
    exchange = ExchangeClient(
        exchange_name='okx',
        api_key=OKX_API_KEY,
        secret=OKX_SECRET,
        password=OKX_PASSPHRASE
    )
    
    # 获取数据
    logger.info(f"Fetching {args.limit} candles...")
    df = exchange.fetch_ohlcv(args.symbol, '4h', limit=args.limit)
    logger.info(f"Got {len(df)} candles")
    
    # 初始化策略
    if args.strategy == "momentum_v11":
        strategy = MomentumV11Strategy()
    else:
        raise ValueError(f"Unknown strategy: {args.strategy}")
    
    # 运行回测
    engine = BacktestEngine(
        strategy=strategy,
        initial_capital=args.capital,
        leverage=10
    )
    
    result = engine.run(df)
    
    # 打印结果
    engine.print_result(result)
    
    # 打印交易明细
    if result.trades:
        print("\n📝 交易明细:")
        for i, trade in enumerate(result.trades, 1):
            print(f"  {i}. {trade.entry_time} -> {trade.exit_time}")
            print(f"     价格: {trade.entry_price:.6f} -> {trade.exit_price:.6f}")
            print(f"     盈亏: {trade.pnl_pct*100:+.2f}% ({trade.exit_reason})")


if __name__ == "__main__":
    main()
