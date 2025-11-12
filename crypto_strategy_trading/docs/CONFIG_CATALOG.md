# 配置文件分级与用途总览

目的：解决「配置文件太多，不知道哪些是稳定可用、哪些是实验性质」的问题。

本文件是当前仓库的「配置导航与分级说明」，以后新增/修改配置必须更新这里，保持全局可见性和可维护性。

分级标准（适用于 backtest/configs 和 strategies 内策略参数文件）：

- stable: 稳定配置，验证通过，可直接用于正式回测/决策参考
- candidate: 候选配置，效果较好但仍在观察或样本有限
- experimental: 实验配置，用于探索思路，不保证稳定
- internal: 内部参数集或组合配置，被其他 stable/candidate 配置引用，本身不是直接入口
- deprecated: 不再推荐使用，保留仅为对比或溯源

以下是当前已识别配置的分类（仅覆盖你目录中实际存在的相关文件，后续如有新增，请同步维护）：

---

## 一、回测入口配置（backtest/configs/*.json）

这些是可以直接传给：

```bash
python backtest/run_backtest.py --config <此文件>
```

的入口型配置。

### 1. EMA Simple Trend 多时间框架系列

1) stable - `backtest/configs/backtest_ema_simple_trend_multiframe_optimized.json`

- 用途: EMA Simple Trend 多时间框架优化版的标准回测入口。
- 策略:
  - name: `ema_simple_trend_multiframe`
  - config_file: `strategies/ema_simple_trend/config_multiframe.json`
- 特点:
  - 已修正结构，路径清晰、无语法问题。
  - 推荐作为阅读/复用模板。

2) candidate - `backtest/configs/backtest_ema_mtf_eth_2y.json`

- 用途: 在 ETHUSDT 1h 全样本上验证 MTF 策略高收益参数。
- 策略:
  - name: `ema_simple_trend_multiframe`
  - config_file: `backtest/configs/ema_simple_trend_multiframe_optimized_params_high_return.json`
- 问题/注意:
  - config_file 指向的是 backtest/configs 下参数文件，建议后续迁移到 strategies/ 目录。
  - result_file 命名合理。
- 建议:
  - 暂标记为 candidate，等参数文件位置和结构规范后可升级为 stable。

3) candidate - `backtest/configs/backtest_ema_mtf_btc_2y.json`

- 用途: 在 BTCUSDT 1h 上复用 ETH 高收益参数，检验普适性。
- 策略:
  - name: `ema_simple_trend_multiframe`
  - config_file: `backtest/configs/ema_simple_trend_multiframe_optimized_params_high_return_btc.json`
- 问题/注意:
  - output.result_file 目前沿用 `ema_mtf_eth_2y_high_return_{timestamp}.json`，存在命名不一致。
- 判定:
  - 参数属于跨品种验证，非主线生产配置 → candidate。
  - 后续应修正 result_file 命名并确认表现后再升级。

4) candidate - `backtest/configs/backtest_ema_mtf_bnb_2y.json`

- 用途: 在 BNBUSDT 上测试 ETH 参数普适性。
- 特性:
  - 典型「普适性测试」，本质是研究用。
- 判定:
  - candidate / 偏实验性质，建议仅作参考，不视为生产主线。

5) candidate - `backtest/configs/backtest_ema_mtf_unified_regime_eth_2y.json`

- 用途: EMA MTF Unified Regime（多空 + Regime 引擎）2 年测试。
- 策略:
  - name: `ema_simple_trend_multiframe_unified_regime`
  - config_file: `backtest/configs/ema_mtf_unified_regime_eth_2y_params.json`
- 判定:
  - 新架构验证用，逻辑清晰，但属于「新引擎实验验证」 → candidate。

---

### 2. 组合与多策略配置

1) experimental - `backtest/configs/combined_ema_mtf_with_bear_regime_eth.json`

- 用途:
  - 将 `ema_simple_trend_multiframe` 与 `bear_trend_regime` 组合，在熊市启用增强策略。
- 问题/注意:
  - 格式与当前 BacktestRunner 流程不完全一致（使用 strategies[] 数组，尚未在引擎中完全标准化）。
- 判定:
  - 明确属于实验性组合框架 → experimental。

---

## 二、策略参数配置（被引用的参数集）

这些文件一般不直接作为回测入口，而是被上面的入口配置通过 `"config_file"` 引用。

### 1. EMA MTF Unified Regime

- 文件: `backtest/configs/ema_mtf_unified_regime_eth_2y_params.json`
- 类型: internal
- 用途:
  - 为 `ema_simple_trend_multiframe_unified_regime` 提供一套完整参数。
- 判定:
  - 仅作为参数集被引用，本身不直接运行 → internal。

### 2. EMA Simple Trend MTF 高收益参数（分币种）

- 文件:
  - `backtest/configs/ema_simple_trend_multiframe_optimized_params_high_return.json`
  - `backtest/configs/ema_simple_trend_multiframe_optimized_params_high_return_btc.json`
  - `backtest/configs/ema_simple_trend_multiframe_optimized_params_high_return_bnb.json`
- 类型: internal / experimental 混合
- 用途:
  - 针对 ETH / BTC / BNB 的高收益参数集，用于 MTF 策略测试。
- 现状问题:
  - 有的文件中仍包含 backtest_name / backtest_settings 等入口信息，与「纯参数文件」角色混杂。
- 建议：
  - 短期标记为 internal（供入口配置引用）。
  - 后续拆分为「纯参数文件」，移动到 `strategies/ema_simple_trend/` 目录。
  - 若经长期验证稳定，可提炼出 1-2 个 stable 参数集，其余标记 experimental。

### 3. 熊市 Regime 参数

- 文件: `backtest/configs/bear_trend_regime_params_eth.json`
- 类型: internal
- 用途:
  - bear_trend_regime 策略参数，用于组合/扩展测试。
- 判定:
  - 作为组合测试依赖，不直接作为入口 → internal。

---

## 三、如何快速判断“能不能直接用”和“是不是实验”

给你一个简单规则（基于当前整理）：

1. 能直接拿来跑回测的（入口型）：
   - 位于 `backtest/configs/` 顶层。
   - 包含：
     - `"backtest_name"`, `"data"`, `"backtest_settings"`, `"output"`.
     - `"strategy": { "name": <在 STRATEGY_REGISTRY 中的 key>, "config_file": "..." }`
   - 当前推荐：
     - stable:
       - `backtest/configs/backtest_ema_simple_trend_multiframe_optimized.json`
     - candidate（验证中但结构清晰，建议保留并继续用）:
       - `backtest/configs/backtest_ema_mtf_eth_2y.json`
       - `backtest/configs/backtest_ema_mtf_btc_2y.json`
       - `backtest/configs/backtest_ema_mtf_bnb_2y.json`
       - `backtest/configs/backtest_ema_mtf_unified_regime_eth_2y.json`

2. 只作为参数/策略内部配置的：
   - 被 `"config_file"` 引用，内部通常只有 parameters / risk_management / indicators 等字段。
   - 当前：
     - 全部视作 internal。
     - 等你确认某套参数表现稳定，再从中挑出「正式生产参数」并升级为 stable（建议移动到 strategies 对应目录）。

3. 实验/组合/框架尝试：
   - 结构与主流入口不完全一致，或注释中有「组合测试」「验证」字样。
   - 当前明确：
     - `backtest/configs/combined_ema_mtf_with_bear_regime_eth.json` → experimental。

---

## 四、下一步执行建议（你只需遵守，不需要记所有细节）

后续新增或整理配置时，按以下约定：

1. 新的“可直接回测”的配置：
   - 放在 `backtest/configs/` 顶层。
   - 命名：`backtest_{strategy_key}_{symbol}_{timeframe}_{tag}.json`
   - 必须：
     - 使用 `strategy.name` = 注册表中的 key。
     - `strategy.config_file` 指向 `strategies/...` 下的参数文件（推荐）。

2. 策略参数文件：
   - 放在对应策略目录：
     - 如 `strategies/ema_simple_trend/config.multiframe.eth.stable.json`
   - 不含 backtest_name/output 等运行级配置。
   - 可在本 Catalog 中挂上 stable/candidate/experimental 标签。

3. 实验/临时配置：
   - 文件名中带 `experimental` / `tmp` / `lab` 等标记。
   - 在本文件中标为 experimental。
   - 用完能删则删，不能删就标清楚用途。

通过本文件，你可以一眼看到：

- 哪些入口是稳定/推荐使用的；
- 哪些参数文件只是内部依赖；
- 哪些是实验性质，避免误用到生产决策。

本 Catalog 将作为后续清理和升级的基准文档。