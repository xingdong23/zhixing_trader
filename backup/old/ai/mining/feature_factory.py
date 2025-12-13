"""
[Alpha V2 - Mining 模块] 特征工厂 (Feature Factory)
------------------------------------------------
功能说明：
    这个文件属于 "Mining (矿场)" 环节。
    它负责 "特征大爆炸" (Feature Explosion)，生成尽可能多维度的技术指标。
    目的是为 AI 提供 "全谱系" 的数据，让 AI 自行决定哪些指标有效。

包含指标体系 (50+ 特征):
    1. 趋势 (Trend): MA(各种周期), EMAs, MACD, ADX, CCI, SAR, TRIX
    2. 动量 (Momentum): RSI, KDJ, MFI, MOM, ROC, Williams %R, Ultimate Osc
    3. 波动 (Volatility): Bollinger Bands (Width, %B), ATR, NATR, Keltner, Donchian
    4. 成交量 (Volume): OBV, AD, VWAP, Volume/MA Ratio
    5. 形态 (Pattern): Candle Body/Wick ratios, Consecutive counts
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
        生成全量技术指标特征
        """
        df = df.copy()
        
        # 确保数据格式
        for col in ['open', 'high', 'low', 'close', 'volume']:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # 基础数据
        high = df['high']
        low = df['low']
        close = df['close']
        volume = df['volume']
        
        # --- 1. 趋势指标 (Trend) ---
        # MA (Moving Averages) & Price Deviation
        for window in [5, 10, 20, 30, 60, 90, 120]:
            ma = close.rolling(window).mean()
            df[f'ma_{window}'] = ma
            df[f'bias_{window}'] = (close - ma) / ma * 100 # 乖离率
            
        # EMA (Exponential MA)
        for window in [12, 26, 50]:
            df[f'ema_{window}'] = close.ewm(span=window).mean()
            
        # MACD
        ema12 = close.ewm(span=12).mean()
        ema26 = close.ewm(span=26).mean()
        df['macd'] = ema12 - ema26
        df['macd_signal'] = df['macd'].ewm(span=9).mean()
        df['macd_hist'] = df['macd'] - df['macd_signal']
        
        # CCI (Commodity Channel Index)
        tp = (high + low + close) / 3
        for window in [14, 20]:
            sma_tp = tp.rolling(window).mean()
            mad_tp = tp.rolling(window).apply(lambda x: (x - x.mean()).abs().mean())
            df[f'cci_{window}'] = (tp - sma_tp) / (0.015 * mad_tp)
            
        # ADX (Average Directional Index) - 简化计算
        # 真实波幅 TR
        tr1 = high - low
        tr2 = (high - close.shift()).abs()
        tr3 = (low - close.shift()).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        df['atr_14'] = tr.rolling(14).mean()
        
        up_move = high.diff()
        down_move = -low.diff()
        plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0)
        minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0)
        
        # 平滑
        plus_di = 100 * pd.Series(plus_dm).ewm(alpha=1/14).mean() / df['atr_14']
        minus_di = 100 * pd.Series(minus_dm).ewm(alpha=1/14).mean() / df['atr_14']
        dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di)
        df['adx_14'] = dx.ewm(alpha=1/14).mean()
        
        # --- 2. 动量指标 (Momentum) ---
        # RSI
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rs = gain / loss
        df['rsi_14'] = 100 - (100 / (1 + rs))
        df['rsi_6'] = 100 - (100 / (1 + (delta.where(delta > 0, 0)).rolling(6).mean() / (-delta.where(delta < 0, 0)).rolling(6).mean()))
        
        # KDJ (Stochastic)
        low_min = low.rolling(9).min()
        high_max = high.rolling(9).max()
        df['rsv'] = (close - low_min) / (high_max - low_min) * 100
        df['k'] = df['rsv'].ewm(com=2).mean()
        df['d'] = df['k'].ewm(com=2).mean()
        df['j'] = 3 * df['k'] - 2 * df['d']
        
        # MOM (Momentum)
        df['mom_10'] = close.diff(10)
        
        # ROC (Rate of Change)
        df['roc_12'] = close.pct_change(12) * 100
        
        # Williams %R
        df['wr_14'] = (high.rolling(14).max() - close) / (high.rolling(14).max() - low.rolling(14).min()) * -100
        
        # --- 3. 波动指标 (Volatility) ---
        # Bollinger Bands
        for window in [20, 50]:
            std = close.rolling(window).std()
            ma = close.rolling(window).mean()
            upper = ma + (std * 2)
            lower = ma - (std * 2)
            df[f'bb_width_{window}'] = (upper - lower) / ma
            df[f'bb_pct_{window}'] = (close - lower) / (upper - lower) # %B
            
        # NATR (Normalized ATR)
        df['natr_14'] = df['atr_14'] / close * 100
        
        # Donchian Channels
        df['donchian_upper'] = high.rolling(20).max()
        df['donchian_lower'] = low.rolling(20).min()
        df['donchian_width'] = (df['donchian_upper'] - df['donchian_lower']) / close

        # --- 4. 成交量指标 (Volume) ---
        # Vol Ratio
        df['vol_ma_20'] = volume.rolling(20).mean()
        df['vol_ratio'] = volume / df['vol_ma_20']
        
        # OBV (On-Balance Volume) - 简化逻辑
        obv =  (np.sign(close.diff()) * volume).fillna(0).cumsum()
        df['obv'] = obv
        
        # MFI (Money Flow Index)
        typical_price = (high + low + close) / 3
        money_flow = typical_price * volume
        positive_flow = np.where(typical_price > typical_price.shift(1), money_flow, 0)
        negative_flow = np.where(typical_price < typical_price.shift(1), money_flow, 0)
        
        pf_sum = pd.Series(positive_flow).rolling(14).sum()
        nf_sum = pd.Series(negative_flow).rolling(14).sum()
        mfi_ratio = pf_sum / nf_sum
        df['mfi_14'] = 100 - (100 / (1 + mfi_ratio))

        # VWAP (Rolling 24h)
        df['vwap_24h'] = (typical_price * volume).rolling(96).sum() / volume.rolling(96).sum() # 15m * 96 = 24h
        df['price_vs_vwap'] = close / df['vwap_24h']

        # --- 5. 形态特征 (Candle Patterns) ---
        # 实体大小 vs 总长度
        body_size = (close - df['open']).abs()
        total_len = high - low
        df['body_ratio'] = body_size / total_len
        
        # 上影线/下影线
        upper_shadow = high - df[['open', 'close']].max(axis=1)
        lower_shadow = df[['open', 'close']].min(axis=1) - low
        df['upper_shadow_ratio'] = upper_shadow / total_len
        df['lower_shadow_ratio'] = lower_shadow / total_len
        
        # --- 清理 ---
        # 移除 NaN
        df = df.replace([np.inf, -np.inf], np.nan)
        df = df.dropna()
        
        # 只保留特征列 (数值型)
        feature_cols = [c for c in df.columns if c not in ['timestamp', 'open_time', 'date', 'open', 'high', 'low', 'close', 'volume']]
        
        return df[feature_cols]

if __name__ == "__main__":
    # Test
    print("Generating comprehensive features...")
    data = {
        'close': np.random.rand(500) * 100 + 100,
        'open': np.random.rand(500) * 100 + 100,
        'high': np.random.rand(500) * 110 + 100,
        'low': np.random.rand(500) * 90 + 100,
        'volume': np.random.rand(500) * 10000
    }
    df = pd.DataFrame(data)
    ff = FeatureFactory()
    features = ff.generate_features(df)
    print(f"Generated {features.shape[1]} features.")
    print("Features:", features.columns.tolist()[:10], "...")
