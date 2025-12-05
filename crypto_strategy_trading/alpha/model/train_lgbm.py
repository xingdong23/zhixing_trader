"""
[Alpha V2 - Model 模块] LightGBM 决策模型训练
-------------------------------------------
功能说明：
    这个文件属于 "Model (大脑)" 环节。
    它的作用是训练一个人工智能模型 (LightGBM)，让它学习如何根据
    "Mining" 环节生产的指标来预测未来的价格涨跌。

    同时，它也是一个 "因子挖掘机"。通过查看模型认为哪些特征最重要
    (Feature Importance)，我们可以发现哪些指标是真正有效的 Alpha 因子。

工作流程：
    1. 加载数据 (Load Data)
    2. 生成特征 (Generate Features - 调用 FeatureFactory)
    3. 标记目标 (Labeling): 比如 "未来1小时涨幅 > 1%" 记为 1，否则为 0。
    4. 训练模型 (Training): 让 AI 学习特征与目标之间的关系。
    5. 输出结果: 保存模型文件，并打印出最重要的 Top 10 因子。
"""
import os
import sys
import pandas as pd
import numpy as np
import logging
import json

# 尝试导入 lightgbm
try:
    import lightgbm as lgb
except ImportError:
    print("❌ 错误: 缺少 'lightgbm' 库。")
    print("请运行: pip install lightgbm")
    sys.exit(1)

# 添加项目根目录到路径
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

from alphaV2.mining.feature_factory import FeatureFactory
from alphaV2.optimization.optuna_martingale import load_data # 复用数据加载函数

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def train_model(symbol, data_dir):
    print(f"\n🧠 开始训练决策模型 (Symbol: {symbol})...")
    
    # 1. 加载数据
    df = load_data(symbol, data_dir)
    if df is None:
        print("未找到数据。")
        return

    # 2. 生成特征 (X)
    print("正在生成技术指标特征...")
    ff = FeatureFactory()
    df_features = ff.generate_features(df)
    
    # 3. 创建预测目标 (y)
    # 目标: 预测未来 12 个周期 (例如 5分钟K线 * 12 = 1小时) 的收益率
    prediction_horizon = 12 
    future_ret = df['close'].shift(-prediction_horizon) / df['close'] - 1
    
    # 分类目标: 如果未来涨幅 > 1%，标记为 1 (买入机会)，否则为 0
    # 这是一个 "狙击手" 逻辑: 只有高概率大涨时才出手
    threshold = 0.01
    df_features['target'] = (future_ret > threshold).astype(int)
    
    # 删除包含 NaN 的行 (主要是最后几行没有未来数据)
    df_features = df_features.dropna()
    
    # 分离特征 (X) 和 目标 (y)
    # 排除非特征列
    X = df_features.drop(columns=['target', 'open', 'high', 'low', 'close', 'volume', 'timestamp'], errors='ignore')
    y = df_features['target']
    
    # 划分训练集和测试集 (按时间顺序划分，前 80% 训练，后 20% 测试)
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    print(f"训练集大小: {len(X_train)}, 测试集大小: {len(X_test)}")
    print(f"训练集中正样本比例 (买入机会): {y_train.mean():.2%}")
    
    # 4. 训练 LightGBM 模型
    print("开始训练 LightGBM...")
    train_data = lgb.Dataset(X_train, label=y_train)
    test_data = lgb.Dataset(X_test, label=y_test, reference=train_data)
    
    params = {
        'objective': 'binary',       # 二分类问题
        'metric': 'auc',             # 评估指标: AUC
        'boosting_type': 'gbdt',     # 梯度提升树
        'num_leaves': 31,            # 树的复杂度
        'learning_rate': 0.05,       # 学习率
        'feature_fraction': 0.9      # 每次分裂只随机选 90% 的特征 (防止过拟合)
    }
    
    bst = lgb.train(
        params,
        train_data,
        num_boost_round=100,
        valid_sets=[test_data],
        callbacks=[lgb.early_stopping(stopping_rounds=10), lgb.log_evaluation(10)]
    )
    
    # 5. 特征重要性 (挖掘结果)
    print("\n💎 Top 10 最有效的 Alpha 因子 (特征重要性):")
    importance = bst.feature_importance(importance_type='gain')
    feature_names = X.columns.tolist()
    
    # 创建 DataFrame 展示结果
    imp_df = pd.DataFrame({'feature': feature_names, 'importance': importance})
    imp_df = imp_df.sort_values('importance', ascending=False)
    
    print(imp_df.head(10))
    
    # 保存模型
    model_path = os.path.join(os.path.dirname(__file__), f'lgbm_model_{symbol}.txt')
    bst.save_model(model_path)
    print(f"\n模型已保存至: {model_path}")
    
    return imp_df

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    data_dir = os.path.join(base_dir, 'backtest', 'data')
    
    # 默认测试 PEPE
    train_model('1000PEPEUSDT', data_dir)
