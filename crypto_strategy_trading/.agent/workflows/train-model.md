---
description: 训练一个AI/ML模型的完整流程
---

# 模型训练工作流

本文档定义了训练 AI/ML 模型（如 LightGBM、波动率预测模型等）的标准化流程。

## 📁 相关目录

```
crypto_strategy_trading/
├── ai/
│   ├── mining/                        # 特征工程
│   │   ├── feature_factory.py         # 特征工厂
│   │   └── volatility_miner.py        # 波动率挖掘
│   │
│   ├── model/                         # 模型训练和存储
│   │   ├── train_lgbm.py              # LightGBM训练脚本
│   │   ├── lgbm_model_*.txt           # 模型文件
│   │   ├── best_features_*.json       # 最佳特征配置
│   │   └── volatility_model_*.joblib  # 模型权重
│   │
│   ├── optimization/{strategy}/       # 参数优化
│   └── verification/{strategy}/       # 模型验证
│
└── data/                              # 训练数据
    └── *.csv
```

---

## 步骤 1: 准备训练数据

### 1.1 数据要求

- 至少6个月的历史数据
- 包含 OHLCV 等基础字段
- 数据质量检查（无空值、无异常值）

### 1.2 下载数据

```bash
# 使用数据下载工具
cd backtest/utils

# 下载 DOGEUSDT 5分钟数据
python download_binance_data.py \
    --symbol DOGEUSDT \
    --interval 5m \
    --start 2023-01-01 \
    --end 2024-12-31
```

### 1.3 合并数据

```bash
python backtest/utils/merge_data.py
```

---

## 步骤 2: 特征工程

### 2.1 使用特征工厂

编辑或使用 `ai/mining/feature_factory.py`:

```python
# ai/mining/feature_factory.py
import pandas as pd
import numpy as np

class FeatureFactory:
    """特征工厂 - 生成训练特征"""
    
    def __init__(self, df: pd.DataFrame):
        self.df = df
        
    def add_technical_indicators(self):
        """添加技术指标"""
        # EMA
        for period in [5, 10, 20, 50]:
            self.df[f'ema_{period}'] = self.df['close'].ewm(span=period).mean()
        
        # RSI
        delta = self.df['close'].diff()
        gain = delta.where(delta > 0, 0)
        loss = -delta.where(delta < 0, 0)
        avg_gain = gain.rolling(14).mean()
        avg_loss = loss.rolling(14).mean()
        self.df['rsi'] = 100 - (100 / (1 + avg_gain / avg_loss))
        
        # 波动率
        self.df['volatility'] = self.df['close'].pct_change().rolling(20).std()
        
        # 成交量特征
        self.df['volume_ma'] = self.df['vol'].rolling(20).mean()
        self.df['volume_ratio'] = self.df['vol'] / self.df['volume_ma']
        
        return self
    
    def add_labels(self, horizon=12, threshold=0.01):
        """添加标签（未来收益方向）"""
        future_return = self.df['close'].shift(-horizon) / self.df['close'] - 1
        self.df['label'] = np.where(future_return > threshold, 1,
                                    np.where(future_return < -threshold, -1, 0))
        return self
    
    def get_features(self):
        """获取特征列表"""
        feature_cols = [col for col in self.df.columns 
                       if col not in ['open', 'high', 'low', 'close', 'vol', 
                                      'label', 'open_time']]
        return feature_cols
```

### 2.2 生成特征

```python
# 使用特征工厂
from ai.mining.feature_factory import FeatureFactory
import pandas as pd

df = pd.read_csv("data/DOGEUSDT-5m-merged.csv")
factory = FeatureFactory(df)
factory.add_technical_indicators().add_labels()

features = factory.get_features()
print(f"生成 {len(features)} 个特征")
```

---

## 步骤 3: 训练模型

### 3.1 创建训练脚本

在 `ai/model/train_lgbm.py` 中编写：

```python
# ai/model/train_lgbm.py
import json
import lightgbm as lgb
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from ai.mining.feature_factory import FeatureFactory


def train_model(symbol: str = "DOGEUSDT"):
    """训练 LightGBM 模型"""
    
    # 1. 加载数据
    data_path = f"data/{symbol}-5m-merged.csv"
    df = pd.read_csv(data_path)
    print(f"加载数据: {len(df)} 行")
    
    # 2. 生成特征
    factory = FeatureFactory(df)
    factory.add_technical_indicators().add_labels()
    features = factory.get_features()
    
    # 3. 准备训练数据
    df_clean = df.dropna()
    X = df_clean[features]
    y = df_clean['label']
    
    # 4. 划分数据集
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, shuffle=False
    )
    
    # 5. 训练模型
    train_data = lgb.Dataset(X_train, label=y_train)
    test_data = lgb.Dataset(X_test, label=y_test, reference=train_data)
    
    params = {
        'objective': 'multiclass',
        'num_class': 3,  # -1, 0, 1
        'metric': 'multi_logloss',
        'learning_rate': 0.05,
        'num_leaves': 31,
        'max_depth': 6,
        'min_data_in_leaf': 50,
        'feature_fraction': 0.8,
        'bagging_fraction': 0.8,
        'bagging_freq': 5,
        'verbose': -1
    }
    
    model = lgb.train(
        params,
        train_data,
        num_boost_round=500,
        valid_sets=[test_data],
        callbacks=[lgb.early_stopping(50)]
    )
    
    # 6. 评估模型
    y_pred = model.predict(X_test).argmax(axis=1)
    y_test_mapped = y_test.map({-1: 0, 0: 1, 1: 2})
    
    accuracy = accuracy_score(y_test_mapped, y_pred)
    f1 = f1_score(y_test_mapped, y_pred, average='weighted')
    print(f"准确率: {accuracy:.4f}, F1: {f1:.4f}")
    
    # 7. 保存模型
    model_path = f"ai/model/lgbm_model_{symbol}.txt"
    model.save_model(model_path)
    print(f"模型已保存: {model_path}")
    
    # 8. 保存最佳特征
    importance = dict(zip(features, model.feature_importance()))
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:20]
    
    features_path = f"ai/model/best_features_{symbol}.json"
    Path(features_path).write_text(json.dumps({
        "features": [f[0] for f in top_features],
        "accuracy": accuracy,
        "f1_score": f1
    }, indent=2))
    print(f"特征配置已保存: {features_path}")
    
    return model, accuracy


if __name__ == "__main__":
    train_model("DOGEUSDT")
```

### 3.2 运行训练

```bash
# 训练模型
python ai/model/train_lgbm.py

# 查看输出
ls ai/model/
# lgbm_model_DOGEUSDT.txt
# best_features_DOGEUSDT.json
```

---

## 步骤 4: 验证模型

### 4.1 在样本外数据验证

```python
# 加载模型
import lightgbm as lgb

model = lgb.Booster(model_file="ai/model/lgbm_model_DOGEUSDT.txt")

# 在新数据上测试
df_test = pd.read_csv("data/DOGEUSDT-5m-2025.csv")
# ... 生成特征并预测
```

### 4.2 回测验证

```bash
# 将模型集成到策略中进行回测
python backtest/run_backtest.py --config backtest/configs/ai_strategy.json
```

---

## 步骤 5: 集成到策略

在策略中使用训练好的模型：

```python
# strategies/ai_strategy/strategy.py
import lightgbm as lgb
import json
from pathlib import Path

class AIStrategy:
    def __init__(self, model_path: str, features_path: str):
        self.model = lgb.Booster(model_file=model_path)
        self.features = json.loads(Path(features_path).read_text())["features"]
    
    def analyze(self, klines):
        # 准备特征
        features = self._prepare_features(klines)
        
        # 预测
        probs = self.model.predict(features)
        prediction = probs.argmax()  # 0=下跌, 1=震荡, 2=上涨
        
        if prediction == 2:
            return {"signal": "buy", "reason": f"AI预测上涨, 概率={probs[2]:.2f}"}
        elif prediction == 0:
            return {"signal": "sell", "reason": f"AI预测下跌, 概率={probs[0]:.2f}"}
        else:
            return {"signal": "hold", "reason": "AI预测震荡"}
```

---

## ✅ 训练检查清单

- [ ] 数据质量检查
- [ ] 特征工程完成
- [ ] 训练集/测试集划分正确
- [ ] 模型训练完成
- [ ] 评估指标满意
- [ ] 样本外验证通过
- [ ] 模型文件已保存
- [ ] 集成到策略测试

---

## ⚠️ 注意事项

1. **时间泄露**: 确保训练时不使用未来数据
2. **过拟合**: 使用交叉验证和正则化
3. **特征选择**: 选择有意义的特征，避免噪声
4. **模型更新**: 定期使用新数据重新训练
5. **回测验证**: 模型效果需要在回测中验证
