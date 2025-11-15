#!/usr/bin/env python3
"""
数据重采样脚本 - 将5分钟数据重采样为1小时和日线数据
用于 ema_simple_trend 多时间框架策略回测
"""

import pandas as pd
import logging
from pathlib import Path
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def resample_to_1h(input_file: str, output_file: str):
    """
    将5分钟数据重采样为1小时数据
    
    Args:
        input_file: 输入的5分钟数据文件
        output_file: 输出的1小时数据文件
    """
    logger.info(f"读取5分钟数据: {input_file}")
    
    # 读取数据
    df = pd.read_csv(input_file)
    
    # 过滤掉无效行（open_time不是数字的行）
    df = df[pd.to_numeric(df['open_time'], errors='coerce').notna()]
    df['open_time'] = df['open_time'].astype('int64')
    
    # 转换时间戳为datetime
    df['datetime'] = pd.to_datetime(df['open_time'], unit='ms')
    df.set_index('datetime', inplace=True)
    
    logger.info(f"原始数据: {len(df)} 根K线")
    logger.info(f"时间范围: {df.index.min()} ~ {df.index.max()}")
    
    # 检测列名（支持 vol/volume 两种格式）
    vol_col = 'volume' if 'volume' in df.columns else 'vol'
    quote_vol_col = 'quote_volume' if 'quote_volume' in df.columns else 'quote_vol'
    taker_buy_vol_col = 'taker_buy_volume' if 'taker_buy_volume' in df.columns else 'taker_buy_vol'
    taker_buy_quote_vol_col = 'taker_buy_quote_volume' if 'taker_buy_quote_volume' in df.columns else 'taker_buy_quote_vol'
    
    # 重采样为1小时
    df_1h = df.resample('1h').agg({
        'open_time': 'first',
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last',
        vol_col: 'sum',
        'close_time': 'last',
        quote_vol_col: 'sum',
        'count': 'sum',
        taker_buy_vol_col: 'sum',
        taker_buy_quote_vol_col: 'sum',
        'ignore': 'first'
    })
    
    # 统一列名为标准格式
    df_1h = df_1h.rename(columns={
        vol_col: 'vol',
        quote_vol_col: 'quote_vol',
        taker_buy_vol_col: 'taker_buy_vol',
        taker_buy_quote_vol_col: 'taker_buy_quote_vol'
    })
    
    # 删除空行（如果有）
    df_1h = df_1h.dropna()
    
    # 重置索引，保留datetime列
    df_1h.reset_index(inplace=True)
    df_1h = df_1h.drop('datetime', axis=1)
    
    # 保存
    df_1h.to_csv(output_file, index=False)
    
    logger.info(f"✓ 1小时数据生成完成")
    logger.info(f"  - 输出文件: {output_file}")
    logger.info(f"  - 数据条数: {len(df_1h)} 根K线")
    logger.info(f"  - 文件大小: {Path(output_file).stat().st_size / 1024:.2f} KB")
    
    return df_1h


def resample_to_4h(input_file: str, output_file: str):
    """
    将5分钟数据重采样为4小时数据
    
    Args:
        input_file: 输入的5分钟数据文件
        output_file: 输出的4小时数据文件
    """
    logger.info(f"读取数据: {input_file}")
    
    # 读取数据
    df = pd.read_csv(input_file)
    
    # 过滤掉无效行（open_time不是数字的行）
    df = df[pd.to_numeric(df['open_time'], errors='coerce').notna()]
    df['open_time'] = df['open_time'].astype('int64')
    
    # 转换时间戳为datetime
    df['datetime'] = pd.to_datetime(df['open_time'], unit='ms')
    df.set_index('datetime', inplace=True)
    
    logger.info(f"原始数据: {len(df)} 根K线")
    logger.info(f"时间范围: {df.index.min()} ~ {df.index.max()}")
    
    # 检测列名（支持 vol/volume 两种格式）
    vol_col = 'volume' if 'volume' in df.columns else 'vol'
    quote_vol_col = 'quote_volume' if 'quote_volume' in df.columns else 'quote_vol'
    taker_buy_vol_col = 'taker_buy_volume' if 'taker_buy_volume' in df.columns else 'taker_buy_vol'
    taker_buy_quote_vol_col = 'taker_buy_quote_volume' if 'taker_buy_quote_volume' in df.columns else 'taker_buy_quote_vol'
    
    # 重采样为4小时
    df_4h = df.resample('4h').agg({
        'open_time': 'first',
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last',
        vol_col: 'sum',
        'close_time': 'last',
        quote_vol_col: 'sum',
        'count': 'sum',
        taker_buy_vol_col: 'sum',
        taker_buy_quote_vol_col: 'sum',
        'ignore': 'first'
    })
    
    # 统一列名为标准格式
    df_4h = df_4h.rename(columns={
        vol_col: 'vol',
        quote_vol_col: 'quote_vol',
        taker_buy_vol_col: 'taker_buy_vol',
        taker_buy_quote_vol_col: 'taker_buy_quote_vol'
    })
    
    # 删除空行（如果有）
    df_4h = df_4h.dropna()
    
    # 重置索引，保留datetime列
    df_4h.reset_index(inplace=True)
    df_4h = df_4h.drop('datetime', axis=1)
    
    # 保存
    df_4h.to_csv(output_file, index=False)
    
    logger.info(f"✓ 4小时数据生成完成")
    logger.info(f"  - 输出文件: {output_file}")
    logger.info(f"  - 数据条数: {len(df_4h)} 根K线")
    logger.info(f"  - 文件大小: {Path(output_file).stat().st_size / 1024:.2f} KB")
    
    return df_4h


def resample_to_1d(input_file: str, output_file: str):
    """
    将5分钟数据重采样为日线数据
    
    Args:
        input_file: 输入的5分钟数据文件（或1小时数据）
        output_file: 输出的日线数据文件
    """
    logger.info(f"读取数据: {input_file}")
    
    # 读取数据
    df = pd.read_csv(input_file)
    
    # 过滤掉无效行（open_time不是数字的行）
    df = df[pd.to_numeric(df['open_time'], errors='coerce').notna()]
    df['open_time'] = df['open_time'].astype('int64')
    
    # 转换时间戳为datetime
    df['datetime'] = pd.to_datetime(df['open_time'], unit='ms')
    df.set_index('datetime', inplace=True)
    
    logger.info(f"原始数据: {len(df)} 根K线")
    logger.info(f"时间范围: {df.index.min()} ~ {df.index.max()}")
    
    # 检测列名（支持 vol/volume 两种格式）
    vol_col = 'volume' if 'volume' in df.columns else 'vol'
    quote_vol_col = 'quote_volume' if 'quote_volume' in df.columns else 'quote_vol'
    taker_buy_vol_col = 'taker_buy_volume' if 'taker_buy_volume' in df.columns else 'taker_buy_vol'
    taker_buy_quote_vol_col = 'taker_buy_quote_volume' if 'taker_buy_quote_volume' in df.columns else 'taker_buy_quote_vol'
    
    # 重采样为日线
    df_1d = df.resample('1D').agg({
        'open_time': 'first',
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last',
        vol_col: 'sum',
        'close_time': 'last',
        quote_vol_col: 'sum',
        'count': 'sum',
        taker_buy_vol_col: 'sum',
        taker_buy_quote_vol_col: 'sum',
        'ignore': 'first'
    })
    
    # 统一列名为标准格式
    df_1d = df_1d.rename(columns={
        vol_col: 'vol',
        quote_vol_col: 'quote_vol',
        taker_buy_vol_col: 'taker_buy_vol',
        taker_buy_quote_vol_col: 'taker_buy_quote_vol'
    })
    
    # 删除空行（如果有）
    df_1d = df_1d.dropna()
    
    # 重置索引，保留datetime列
    df_1d.reset_index(inplace=True)
    df_1d = df_1d.drop('datetime', axis=1)
    
    # 保存
    df_1d.to_csv(output_file, index=False)
    
    logger.info(f"✓ 日线数据生成完成")
    logger.info(f"  - 输出文件: {output_file}")
    logger.info(f"  - 数据条数: {len(df_1d)} 根K线")
    logger.info(f"  - 文件大小: {Path(output_file).stat().st_size / 1024:.2f} KB")
    
    return df_1d


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='重采样K线数据')
    parser.add_argument('--input', required=True, help='输入文件路径')
    parser.add_argument('--output-1h', help='1小时数据输出路径')
    parser.add_argument('--output-4h', help='4小时数据输出路径')
    parser.add_argument('--output-1d', help='日线数据输出路径')
    
    args = parser.parse_args()
    
    # 检查输入文件
    if not Path(args.input).exists():
        logger.error(f"输入文件不存在: {args.input}")
        sys.exit(1)
    
    print("="*60)
    print("数据重采样工具")
    print("="*60)
    print(f"输入文件: {args.input}")
    print("="*60)
    print()
    
    # 生成1小时数据
    if args.output_1h:
        resample_to_1h(args.input, args.output_1h)
        print()
    
    # 生成4小时数据
    if args.output_4h:
        resample_to_4h(args.input, args.output_4h)
        print()
    
    # 生成日线数据
    if args.output_1d:
        resample_to_1d(args.input, args.output_1d)
        print()
    
    print("="*60)
    print("✓ 所有数据重采样完成")
    print("="*60)


if __name__ == '__main__':
    main()
