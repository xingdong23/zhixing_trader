"""
[Alpha V2 - Mining 模块] 特征工厂 (Feature Factory)
------------------------------------------------
功能说明：
    这个文件属于 "Mining (矿场)" 环节。
    它的作用是将原始的 K 线数据（Open, High, Low, Close, Volume）
    加工成机器学习模型可以理解的 "技术指标" (Features)。

    就像从矿石中提炼金属一样，这里生成的每一个指标（如 RSI, MACD）
    都是后续 "决策模型" 用来判断市场状态的原材料。

包含指标：
    1. 趋势类 (Trend): 移动平均线 (MA), MACD
    2. 动量类 (Momentum): 相对强弱指数 (RSI), 变动率 (ROC)
    3. 波动率 (Volatility): 布林带 (Bollinger Bands), ATR
    4. 成交量 (Volume): 量价关系, VWAP
"""
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

class FeatureFactory:
    def __init__(self):
        pass
        
    def generate_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        生成技术指标特征
        输入: 包含 open, high, low, close, volume 的 DataFrame
        输出: 包含几十个技术指标的 DataFrame
        """
        df = df.copy()
        
        # 确保数据是数值型
        for col in ['open', 'high', 'low', 'close', 'volume']:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            
        # 1. 趋势指标 (Trend Indicators)
        # 移动平均线 (Moving Averages)
        for window in [7, 14, 30, 60, 90]:
            df[f'ma_{window}'] = df['close'].rolling(window).mean()
            df[f'ma_{window}_ratio'] = df['close'] / df[f'ma_{window}']
            
        # MACD (异同移动平均线)
        ema12 = df['close'].ewm(span=12).mean()
        ema26 = df['close'].ewm(span=26).mean()
        df['macd'] = ema12 - ema26
        df['macd_signal'] = df['macd'].ewm(span=9).mean()
        df['macd_hist'] = df['macd'] - df['macd_signal']
        
        # 2. 动量指标 (Momentum Indicators)
        # RSI (相对强弱指数)
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rs = gain / loss
        df['rsi_14'] = 100 - (100 / (1 + rs))
        
        # ROC (变动率)
        df['roc_12'] = df['close'].pct_change(12)
        
        # 3. 波动率指标 (Volatility Indicators)
        # 布林带 (Bollinger Bands)
        window = 20
        std = df['close'].rolling(window).std()
        df['bb_upper'] = df[f'ma_{window}'] + (std * 2)
        df['bb_lower'] = df[f'ma_{window}'] - (std * 2)
        df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df[f'ma_{window}']
        df['bb_pos'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
        
        # ATR (平均真实波幅)
        high_low = df['high'] - df['low']
        high_close = (df['high'] - df['close'].shift()).abs()
        low_close = (df['low'] - df['close'].shift()).abs()
        ranges = pd.concat([high_low, high_close, low_close], axis=1)
        true_range = ranges.max(axis=1)
        df['atr_14'] = true_range.rolling(14).mean()
        df['atr_ratio'] = df['atr_14'] / df['close']
        
        # 4. 成交量指标 (Volume Indicators)
        # 量比
        df['vol_ma_20'] = df['volume'].rolling(20).mean()
        df['vol_ratio'] = df['volume'] / df['vol_ma_20']
        
        # VWAP (成交量加权平均价 - 近似值)
        df['typical_price'] = (df['high'] + df['low'] + df['close']) / 3
        df['vwap_roll'] = (df['typical_price'] * df['volume']).rolling(24).sum() / df['volume'].rolling(24).sum()
        df['price_vs_vwap'] = df['close'] / df['vwap_roll']
        
        # 5. 滞后收益率 (作为参考或特征)
        for lag in [1, 3, 6, 12, 24]:
            df[f'ret_lag_{lag}'] = df['close'].pct_change(lag)
            
        # 删除因计算窗口产生的 NaN 值
        df = df.dropna()
        
        # 只返回特征列 (排除原始的时间戳等)
        feature_cols = [c for c in df.columns if c not in ['timestamp', 'open_time', 'date']]
        
        return df[feature_cols]

if __name__ == "__main__":
    # 测试代码
    print("Feature Factory Test...")
    # 生成模拟数据
    data = {
        'close': np.random.rand(100) * 100,
        'open': np.random.rand(100) * 100,
        'high': np.random.rand(100) * 100,
        'low': np.random.rand(100) * 100,
        'volume': np.random.rand(100) * 1000
    }
    df = pd.DataFrame(data)
    ff = FeatureFactory()
    features = ff.generate_features(df)
    print(f"Generated {features.shape[1]} features.")
    print(features.columns.tolist())
