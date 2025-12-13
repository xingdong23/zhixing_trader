"""
技术指标计算函数
"""
import pandas as pd
import numpy as np
from typing import Dict


def calculate_ema(series: pd.Series, period: int) -> pd.Series:
    """计算 EMA"""
    return series.ewm(span=period, adjust=False).mean()


def calculate_sma(series: pd.Series, period: int) -> pd.Series:
    """计算 SMA"""
    return series.rolling(window=period).mean()


def calculate_bollinger_bands(
    close: pd.Series,
    period: int = 20,
    std_dev: float = 2.0
) -> Dict[str, pd.Series]:
    """
    计算布林带
    
    Returns:
        dict with 'upper', 'middle', 'lower', 'width'
    """
    middle = close.rolling(window=period).mean()
    std = close.rolling(window=period).std()
    
    upper = middle + (std * std_dev)
    lower = middle - (std * std_dev)
    width = (upper - lower) / middle
    
    return {
        'upper': upper,
        'middle': middle,
        'lower': lower,
        'width': width
    }


def calculate_keltner_channels(
    df: pd.DataFrame,
    period: int = 20,
    atr_multiplier: float = 2.0
) -> Dict[str, pd.Series]:
    """
    计算 Keltner Channels
    
    Returns:
        dict with 'upper', 'middle', 'lower'
    """
    # 计算 ATR
    high = df['high']
    low = df['low']
    close = df['close']
    
    tr1 = high - low
    tr2 = abs(high - close.shift(1))
    tr3 = abs(low - close.shift(1))
    
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.rolling(window=period).mean()
    
    # Keltner Channels
    middle = close.rolling(window=period).mean()
    upper = middle + (atr * atr_multiplier)
    lower = middle - (atr * atr_multiplier)
    
    return {
        'upper': upper,
        'middle': middle,
        'lower': lower
    }


def calculate_adx(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """
    计算 ADX (Average Directional Index)
    """
    high = df['high']
    low = df['low']
    close = df['close']
    
    # TR
    tr1 = high - low
    tr2 = abs(high - close.shift(1))
    tr3 = abs(low - close.shift(1))
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    
    # +DM, -DM
    plus_dm = high.diff()
    minus_dm = low.diff()
    
    plus_dm = plus_dm.where((plus_dm > minus_dm) & (plus_dm > 0), 0)
    minus_dm = minus_dm.where((minus_dm > plus_dm) & (minus_dm < 0), 0).abs()
    
    # Smooth
    atr = tr.rolling(period).mean()
    plus_di = 100 * (plus_dm.rolling(period).mean() / atr)
    minus_di = 100 * (minus_dm.rolling(period).mean() / atr)
    
    # DX and ADX
    dx = (abs(plus_di - minus_di) / (plus_di + minus_di)) * 100
    adx = dx.rolling(period).mean()
    
    return adx


def calculate_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    """计算 RSI"""
    delta = close.diff()
    
    gain = delta.where(delta > 0, 0)
    loss = (-delta).where(delta < 0, 0)
    
    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    
    return rsi


def calculate_macd(
    close: pd.Series,
    fast: int = 12,
    slow: int = 26,
    signal: int = 9
) -> Dict[str, pd.Series]:
    """
    计算 MACD
    
    Returns:
        dict with 'macd', 'signal', 'histogram'
    """
    ema_fast = close.ewm(span=fast, adjust=False).mean()
    ema_slow = close.ewm(span=slow, adjust=False).mean()
    
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    
    return {
        'macd': macd_line,
        'signal': signal_line,
        'histogram': histogram
    }
