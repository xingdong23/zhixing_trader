"""
市场环境识别模块 (Market Regime Detection)

识别当前市场处于：
1. 牛市 (Bull Market) - 单边上涨
2. 熊市 (Bear Market) - 单边下跌
3. 震荡市 (Range-bound Market) - 横盘整理

识别方法：
- 趋势判断：使用均线系统（50日、200日）
- 波动性判断：使用ATR和价格波动率
- 综合判断：结合多个指标
"""

from typing import Dict, Any, Tuple
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)


class MarketRegimeDetector:
    """市场环境识别器"""
    
    def __init__(self, 
                 trend_ma_short: int = 50,
                 trend_ma_long: int = 200,
                 volatility_period: int = 20,
                 trend_threshold: float = 0.02):
        """
        初始化市场环境识别器
        
        Args:
            trend_ma_short: 短期均线周期（默认50）
            trend_ma_long: 长期均线周期（默认200）
            volatility_period: 波动率计算周期（默认20）
            trend_threshold: 趋势判断阈值（默认2%）
        """
        self.trend_ma_short = trend_ma_short
        self.trend_ma_long = trend_ma_long
        self.volatility_period = volatility_period
        self.trend_threshold = trend_threshold
        
        logger.info(f"✓ 市场环境识别器初始化完成")
        logger.info(f"  短期均线: {trend_ma_short}")
        logger.info(f"  长期均线: {trend_ma_long}")
        logger.info(f"  波动率周期: {volatility_period}")
        logger.info(f"  趋势阈值: {trend_threshold * 100}%")
    
    def detect_regime(self, df: pd.DataFrame) -> Tuple[str, Dict[str, Any]]:
        """
        识别市场环境
        
        Args:
            df: 包含OHLC数据的DataFrame
            
        Returns:
            (regime, details) - 市场环境和详细信息
            regime: 'bull' | 'bear' | 'range'
        """
        if len(df) < self.trend_ma_long:
            return 'unknown', {'reason': 'insufficient_data'}
        
        # 计算指标
        df = df.copy()
        df['ma_short'] = df['close'].rolling(window=self.trend_ma_short).mean()
        df['ma_long'] = df['close'].rolling(window=self.trend_ma_long).mean()
        df['atr'] = self._calculate_atr(df, self.volatility_period)
        
        # 获取最新值
        current_price = df['close'].iloc[-1]
        ma_short = df['ma_short'].iloc[-1]
        ma_long = df['ma_long'].iloc[-1]
        atr = df['atr'].iloc[-1]
        
        # 计算趋势强度
        trend_strength = (ma_short - ma_long) / ma_long
        
        # 计算价格相对均线的位置
        price_vs_ma_short = (current_price - ma_short) / ma_short
        price_vs_ma_long = (current_price - ma_long) / ma_long
        
        # 计算波动率（ATR相对价格的百分比）
        volatility_pct = atr / current_price
        
        # 计算价格波动范围（最近N天的高低点）
        recent_high = df['high'].iloc[-self.volatility_period:].max()
        recent_low = df['low'].iloc[-self.volatility_period:].min()
        price_range_pct = (recent_high - recent_low) / recent_low
        
        # 判断市场环境
        regime = self._classify_regime(
            trend_strength, 
            price_vs_ma_short, 
            price_vs_ma_long,
            volatility_pct,
            price_range_pct
        )
        
        # 详细信息
        details = {
            'current_price': current_price,
            'ma_short': ma_short,
            'ma_long': ma_long,
            'trend_strength': trend_strength,
            'price_vs_ma_short': price_vs_ma_short,
            'price_vs_ma_long': price_vs_ma_long,
            'volatility_pct': volatility_pct,
            'price_range_pct': price_range_pct,
            'atr': atr
        }
        
        logger.info(f"📊 市场环境: {regime.upper()}")
        logger.info(f"  趋势强度: {trend_strength * 100:.2f}%")
        logger.info(f"  价格 vs 短期均线: {price_vs_ma_short * 100:.2f}%")
        logger.info(f"  价格 vs 长期均线: {price_vs_ma_long * 100:.2f}%")
        logger.info(f"  波动率: {volatility_pct * 100:.2f}%")
        logger.info(f"  价格波动范围: {price_range_pct * 100:.2f}%")
        
        return regime, details
    
    def _classify_regime(self, 
                        trend_strength: float,
                        price_vs_ma_short: float,
                        price_vs_ma_long: float,
                        volatility_pct: float,
                        price_range_pct: float) -> str:
        """
        根据指标分类市场环境
        
        判断逻辑：
        1. 牛市：短期均线 > 长期均线 + 阈值，且价格在均线之上
        2. 熊市：短期均线 < 长期均线 - 阈值，且价格在均线之下
        3. 震荡市：其他情况
        """
        # 强牛市：短期均线远高于长期均线，且价格在均线之上
        if (trend_strength > self.trend_threshold and 
            price_vs_ma_short > -0.02 and 
            price_vs_ma_long > 0):
            return 'bull'
        
        # 强熊市：短期均线远低于长期均线，且价格在均线之下
        if (trend_strength < -self.trend_threshold and 
            price_vs_ma_short < 0.02 and 
            price_vs_ma_long < 0):
            return 'bear'
        
        # 震荡市：均线纠缠，或价格在均线附近波动
        return 'range'
    
    def _calculate_atr(self, df: pd.DataFrame, period: int) -> pd.Series:
        """计算ATR（平均真实波幅）"""
        high = df['high']
        low = df['low']
        close = df['close']
        
        tr1 = high - low
        tr2 = abs(high - close.shift())
        tr3 = abs(low - close.shift())
        
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(window=period).mean()
        
        return atr
    
    def get_regime_config(self, regime: str) -> Dict[str, Any]:
        """
        根据市场环境返回推荐的策略配置
        
        Args:
            regime: 市场环境 ('bull' | 'bear' | 'range')
            
        Returns:
            推荐的策略参数配置
        """
        if regime == 'bull':
            # 牛市：放宽参数，增加交易机会
            return {
                'oversold_threshold': 25,
                'overbought_threshold': 75,
                'use_trend_filter': False,
                'allow_short': False,  # 牛市不做空
                'stop_loss_pct': 0.05,
                'take_profit_pct': 0.15,  # 提高止盈
                'max_holding_days': 7,
                'reason': '牛市环境：放宽RSI阈值，禁止做空，提高止盈'
            }
        elif regime == 'bear':
            # 熊市：保守参数，主要做多超卖反弹
            return {
                'oversold_threshold': 10,
                'overbought_threshold': 90,
                'use_trend_filter': False,
                'allow_short': True,
                'stop_loss_pct': 0.05,
                'take_profit_pct': 0.10,
                'max_holding_days': 5,
                'reason': '熊市环境：严格RSI阈值，允许做空，快速止盈'
            }
        else:  # range
            # 震荡市：原版参数，最优配置
            return {
                'oversold_threshold': 10,
                'overbought_threshold': 90,
                'use_trend_filter': True,
                'allow_short': True,
                'stop_loss_pct': 0.05,
                'take_profit_pct': 0.10,
                'max_holding_days': 5,
                'reason': '震荡市环境：使用原版配置，表现最优'
            }


def detect_market_regime(df: pd.DataFrame, 
                        trend_ma_short: int = 50,
                        trend_ma_long: int = 200) -> Tuple[str, Dict[str, Any]]:
    """
    便捷函数：识别市场环境
    
    Args:
        df: 包含OHLC数据的DataFrame
        trend_ma_short: 短期均线周期
        trend_ma_long: 长期均线周期
        
    Returns:
        (regime, details) - 市场环境和详细信息
    """
    detector = MarketRegimeDetector(
        trend_ma_short=trend_ma_short,
        trend_ma_long=trend_ma_long
    )
    return detector.detect_regime(df)
