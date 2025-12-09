# Freqtrade AI 策略模块使用指南

本模块集成了 Freqtrade 框架与 FreqAI 机器学习能力，旨在复用现有特征工程 (`FeatureFactory`) 并构建 AI 驱动的交易策略。

## 目录结构

*   `user_data/strategies/`: 存放策略文件
    *   `martingale_ft.py`: 移植版马丁策略
    *   `freqai_strategy.py`: **AI 核心策略**，定义了如何使用预测结果开平仓
*   `user_data/freqaimodels/`: 自定义模型
    *   `CustomLGBM.py`: 基于 LightGBM 的自定义预测模型
*   `configs/`: 配置文件
    *   `config_okx.json`: 交易所、交易对、资金管理配置
    *   `config_freqai.json`: **AI 模型参数**、特征参数、训练窗口配置
*   `feature_bridge/`: 特征桥接
    *   `feature_adapter.py`: 将 `FeatureFactory` 指标转换为 FreqAI 格式
*   `scripts/`: 快捷运行脚本

---

## AI 策略完整工作流程 (Workflow)

FreqAI 的工作流程与传统策略不同，它包含**训练 (Training)** 和 **推理 (Inference)** 两个阶段。

### 1. 数据准备 (Data Preparation)

*   **做什么**: 下载历史 K 线数据。AI 模型需要大量历史数据进行训练。
*   **怎么做**:
    ```bash
    sh scripts/run_download.sh 30  # 下载最近 30 天数据
    ```

### 2. 特征工程 (Feature Engineering)

*   **原理**: `FreqAIStrategy` 会调用 `FeatureAdapter`，利用现有的 `FeatureFactory` 生成 50+ 种技术指标（RSI, MACD, OBV 等）。
*   **自动处理**: FreqAI 会自动处理数据标准化、归一化和数据集划分（训练集/测试集）。

### 3. 模型训练 (Model Training)

*   **做什么**: 使用历史数据训练 `CustomLGBM` 模型，学习 "特征 -> 未来收益率" 的映射关系。
*   **触发方式**: 在回测或实盘启动时自动触发。
*   **滚动训练**: FreqAI 支持滚动训练（例如每 7 天由于新数据产生，自动重训模型），适应市场变化。

### 4. 策略回测 (Backtesting)

*   **做什么**: 验证 AI 模型在历史数据上的表现。
*   **流程**:
    1.  划分训练集/测试集。
    2.  在训练集上训练模型。
    3.  在测试集上预测，并根据策略逻辑（如 `预测收益 > 1%`）模拟交易。
    4.  输出回测报告（胜率、盈亏比、最大回撤）。
*   **怎么做**:
    ```bash
    sh scripts/run_freqai_backtest.sh 30
    ```

### 5. 模拟/实盘交易 (Live/Dry-Run)

*   **做什么**: 在实时市场中运行。
*   **流程**:
    1.  **启动**: 加载配置和历史数据。
    2.  **初始训练**: 立即训练一个最新模型。
    3.  **循环**:
        *   获取实时 K 线。
        *   生成特征 -> 输入模型 -> 获取预测值 (如 `&-s_return_mean`)。
        *   策略判断: `if prediction > threshold: buy()`.
        *   **定期重训**: 根据 `config_freqai.json` 中的设置，后台定期重训模型。
*   **怎么做 (模拟)**:
    ```bash
    sh scripts/run_freqai_live.sh dry-run
    ```
*   **怎么做 (实盘 - 慎用)**:
    1.  修改 `configs/config_okx.json`: 填入真实 API Key, `dry_run: false`.
    2.  运行: `sh scripts/run_freqai_live.sh live`

---

## 关键配置修改

若要调整 AI 行为，请修改 `configs/config_freqai.json`:

*   `train_period_days`: 训练数据长度（如 30 天）。
*   `label_period_candles`: 预测未来多少根 K 线（如 predict 4 candles ahead）。
*   `indicator_periods_candles`:各种指标的参数周期。
*   `model_training_parameters`: LightGBM 的参数（树的数量、学习率等）。

## 常见问题

*   **回测很慢?** AI 训练非常消耗 CPU，第一次运行会很慢，后续会有缓存。
*   **没有交易?** 检查 `FreqAIStrategy.py` 中的开仓阈值 (`populate_entry_trend`)。如果模型预测值都很小，可能需要降低阈值或优化模型。
