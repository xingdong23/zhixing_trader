"""
[Alpha V2 - Mining 模块] 波动率挖掘机 (Volatility Miner)
------------------------------------------------
功能说明：
    这个脚本用于挖掘 "即将发生大波动" (Big Move) 的信号。
    它使用机器学习 (Random Forest) 来寻找技术指标与未来波动率之间的关系。

    [Update V2]: 实现了 "无偏差挖掘" (Unbiased Mining)。
    它会计算所有 50+ 个指标的重要性，并筛选出 Top-K 因子保存到 `best_features.json`。
"""

import os
import sys
import pandas as pd
import numpy as np
import joblib
import json
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
import logging

# 添加项目根目录到路径
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from alpha.mining.feature_factory import FeatureFactory

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class VolatilityMiner:
    def __init__(self, symbol='DOGEUSDT', timeframe='15m', prediction_horizon=4, threshold=0.025):
        self.symbol = symbol
        self.timeframe = timeframe
        self.prediction_horizon = prediction_horizon
        self.threshold = threshold
        self.model = None
        self.feature_factory = FeatureFactory()
        
        self.model_dir = os.path.join(os.path.dirname(__file__), '../model')
        self.model_path = os.path.join(self.model_dir, f'volatility_model_{symbol}.joblib')
        self.feature_path = os.path.join(self.model_dir, f'best_features_{symbol}.json')
        os.makedirs(self.model_dir, exist_ok=True)

    def load_data(self):
        """
        加载数据 (Mock 或文件)
        """
        data_path = f"data/raw/DOGEUSDT_15m_MASTER_2022_2024.csv"
        
        if os.path.exists(data_path):
            logger.info(f"Loading data from {data_path}...")
            df = pd.read_csv(data_path)
            if 'open_time' in df.columns:
                # 过滤掉可能的非数字行 (例如被误读的 Header)
                df = df[pd.to_numeric(df['open_time'], errors='coerce').notna()]
                df['open_time'] = pd.to_datetime(df['open_time'], unit='ms')
                df = df.sort_values('open_time')
            
            # Rename 'vol' to 'volume' if necessary
            if 'vol' in df.columns and 'volume' not in df.columns:
                df = df.rename(columns={'vol': 'volume'})
            
            # Ensure numeric columns
            numeric_cols = ['open', 'high', 'low', 'close', 'volume']
            for col in numeric_cols:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
            
            df = df.dropna() # Remove any rows that failed conversion
            
            return df
        else:
            logger.warning(f"Data file {data_path} not found. Using MOCK data for demonstration.")
            # 模拟更真实的数据 (Random Walk)
            np.random.seed(42)
            dates = pd.date_range(start='2023-01-01', periods=5000, freq='15min')
            returns = np.random.normal(0, 0.005, 5000) # 0.5% 波动
            price_curve = 100 * np.cumprod(1 + returns)
            
            data = {
                'open_time': dates,
                'close': price_curve,
                'open': price_curve * (1 + np.random.normal(0, 0.001, 5000)),
                'high': price_curve * (1 + np.abs(np.random.normal(0, 0.002, 5000))),
                'low': price_curve * (1 - np.abs(np.random.normal(0, 0.002, 5000))),
                'volume': np.random.randint(1000, 50000, 5000) * (1 + np.abs(np.random.normal(0, 0.5, 5000)))
            }
            return pd.DataFrame(data)

    def prepare_dataset(self, df):
        """
        准备训练集：特征 + 标签
        """
        logger.info("Generating comprehensive features...")
        df_features = self.feature_factory.generate_features(df)
        
        # 目标：未来 N 个周期内的最大涨跌幅
        future_high = df['high'].rolling(window=self.prediction_horizon).max().shift(-self.prediction_horizon)
        future_low = df['low'].rolling(window=self.prediction_horizon).min().shift(-self.prediction_horizon)
        current_close = df['close']
        
        max_up = (future_high - current_close) / current_close
        max_down = (future_low - current_close) / current_close
        
        # Label: 0=Neutral, 1=Long (Up > Thresh), 2=Short (Down > Thresh)
        target = pd.Series(0, index=df_features.index)
        
        # 优先标记大幅上涨
        target[max_up > self.threshold] = 1
        
        # 标记大幅下跌 (注意 max_down 是负数，例如 -0.05)
        # 如果同时满足，这里后标记的会覆盖前标记。通常这没事，或者可以加严谨逻辑。
        # 用 abs() 比较更直观
        target[max_down.abs() > self.threshold] = 2
        
        # 对齐索引
        df_features['target'] = target
        df_features = df_features.dropna()
        
        return df_features

    def train(self):
        """
        训练模型并进行特征选择
        """
        df = self.load_data()
        dataset = self.prepare_dataset(df)
        
        X = dataset.drop(columns=['target'])
        y = dataset['target']
        
        logger.info(f"Dataset shape: {X.shape}, Positive Samples: {y.sum()} ({y.mean():.2%})")
        
        if len(X) < 100:
            logger.error("Not enough data to train.")
            return

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)
        
        # 随机森林 - 增加树的数量以获得更稳定的特征重要性
        self.model = RandomForestClassifier(
            n_estimators=200,
            max_depth=6,
            min_samples_leaf=20,
            n_jobs=-1,
            random_state=42,
            class_weight='balanced'
        )
        
        logger.info("Mining Alpha Factors (Training Model)...")
        self.model.fit(X_train, y_train)
        
        # 评估
        y_prob = self.model.predict_proba(X_test)
        # multi_class='ovr' required for ROC AUC with >2 classes
        try:
            auc = roc_auc_score(y_test, y_prob, multi_class='ovr')
            logger.info(f"Model AUC Score (Multi-class): {auc:.4f}")
        except Exception as e:
            logger.warning(f"Could not calc AUC: {e}")
        
        # --- 特征重要性分析 (Feature Selection) ---
        importances = pd.Series(self.model.feature_importances_, index=X.columns).sort_values(ascending=False)
        
        # 选出 Top 10
        top_features = importances.head(10)
        logger.info("\n=== Top 10 DISCOVERED Alpha Factors ===")
        for name, score in top_features.items():
            logger.info(f"{name:<20}: {score:.4f}")
            
        # 保存 Top Features 列表
        best_features = top_features.index.tolist()
        with open(self.feature_path, 'w') as f:
            json.dump(best_features, f, indent=4)
        logger.info(f"Top 10 features saved to {self.feature_path}")
        
        # 保存模型
        joblib.dump(self.model, self.model_path)
        logger.info(f"Model saved to {self.model_path}")

if __name__ == "__main__":
    miner = VolatilityMiner(symbol='DOGEUSDT', timeframe='15m')
    miner.train()
