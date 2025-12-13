---
description: 训练一个AI/ML模型的完整流程
---

# 模型训练工作流

本文档定义了训练 AI/ML 模型的标准化流程。

## 📁 相关目录

```
freqtrade_bot/                   # 工作目录
├── user_data/
│   ├── freqaimodels/           # FreqAI 模型
│   └── models/                 # 训练后的模型文件
├── fine_tuning/                # 模型微调
└── scripts/                    # 运维脚本

crypto_strategy_trading/data/    # 训练数据
```

---

## 步骤 1: 准备训练数据

### 1.1 数据要求

- 至少6个月的历史数据
- 包含 OHLCV 等基础字段

### 1.2 下载数据

### 1.2 下载数据

```bash
# 在 freqtrade_bot 目录下操作
# 示例：下载 DOGEUSDT 5分钟数据 (2020年-2025年)
python scripts/download_binance_data.py --symbol DOGEUSDT --timeframe 5m --start-year 2020
# 数据会保存到 ../data/ 目录
```

---

## 步骤 2: FreqAI 模型训练

FreqAI 会在回测或实盘启动时自动训练模型。

### 2.1 配置模型参数

编辑 `configs/config_freqai.json`:

```json
{
  "freqai": {
    "train_period_days": 30,
    "label_period_candles": 4,
    "model_training_parameters": {
      "n_estimators": 500,
      "learning_rate": 0.05
    }
  }
}
```

### 2.2 运行训练（通过回测触发）

```bash
# 在 freqtrade_bot 目录下操作
cd freqtrade_bot
sh scripts/run_freqai_backtest.sh 30
```

---

## 步骤 3: 自定义模型

在 `user_data/freqaimodels/` 创建自定义模型：

```python
# user_data/freqaimodels/CustomLGBM.py
from freqtrade.freqai.prediction_models.LightGBMRegressor import LightGBMRegressor

class CustomLGBM(LightGBMRegressor):
    """自定义 LightGBM 模型"""
    
    def fit(self, data_dictionary):
        # 自定义训练逻辑
        pass
```

---

## 步骤 4: 验证模型

```bash
# 回测验证
sh scripts/run_freqai_backtest.sh 30

# 查看回测结果
ls user_data/backtest_results/
```

---

## ✅ 训练检查清单

- [ ] 数据准备完成（足够历史数据）
- [ ] 模型参数配置
- [ ] 训练完成
- [ ] 回测验证通过
- [ ] 模型文件已保存

---

## ⚠️ 注意事项

1. **时间泄露**: 确保训练时不使用未来数据
2. **过拟合**: 使用样本外数据验证
3. **模型更新**: FreqAI 支持滚动训练，自动适应市场变化
