# EMA 多周期统一多空 + Regime 策略设计文档

基于文件 [`strategy_multiframe.py`](crypto_strategy_trading/strategies/ema_simple_trend/strategy_multiframe.py) 的现有实现，设计一个在同一策略内完成：

- 多周期（1h 执行 + 日线过滤）
- 多空统一（Bull 只做多，Bear 只做空，Neutral 严格过滤）
- 大级别 Regime Filter 可配置（支持多种定义方式）

的统一版本，目标替代“简单 allow_short + 日线 EMA21”的粗糙做空逻辑，使做空只在高置信度熊市中触发，提升整体稳定性。

---

## 1. 设计目标

1. 不拆策略文件，在现有 `EMASimpleTrendMultiframeStrategy` 中完成统一多空逻辑。
2. 使用日线级别数据构建明确的三段市场状态：
   - BULL: 中长期多头趋势，仅允许做多。
   - BEAR: 中长期空头趋势，仅允许做空。
   - NEUTRAL: 趋势不明确或切换阶段，大幅收紧交易或不交易。
3. 对做空部分单独加强风险与过滤逻辑，解决“原策略做空表现差”的问题。
4. 所有规则参数化，可在回测配置中直接调参验证。

---

## 2. Regime 定义方案

策略通过新增 `_get_regime()` 从日线数据中返回当前 Regime：

- 返回值: `"BULL" | "BEAR" | "NEUTRAL"`
- 使用日线 EMA 系列作为信号源，支持三种模式，通过 `regime_mode` 参数选择。

### 2.1 模式一：simple_ema21（简单 EMA21 模式）

逻辑：

- 使用日线 EMA21（沿用当前实现）。
- 定义阈值带，避免 EMA 附近震荡导致频繁切换。

示意：

- 若 `close > ema21 * (1 + band)` → BULL
- 若 `close < ema21 * (1 - band)` → BEAR
- 否则 → NEUTRAL

参数：

- `regime_band_pct`: 默认 0.01（1% 带宽，可调）。

特点：

- 实现简单，直接兼容当前 `trend` 字段（BULLISH / BEARISH）。
- 建议作为基础模式或与混合模式的一部分使用。

### 2.2 模式二：ema50_200（经典长短均线模式）

逻辑：

- 计算日线 EMA50 与 EMA200。
- 采用趋势延迟确认，适合识别大级别牛熊。

示意：

- 若 `ema50 > ema200` 且 `close > ema50` → BULL
- 若 `ema50 < ema200` 且 `close < ema50` → BEAR
- 其他 → NEUTRAL

可选加强：

- `bear_confirm_bars`: BEAR 条件需连续满足 N 日才确认。
- `bull_confirm_bars`: BULL 条件需连续满足 N 日才确认。

特点：

- 更平滑、不易来回震荡。
- 对做空友好：只有在明确 Bear regime 下才允许系统性做空。

### 2.3 模式三：hybrid（默认推荐混合模式）

默认推荐的 Regime 模式，结合上述两种思路：

1. 使用现有日线 EMA21 `trend` 作为第一层判定（快）。
2. 使用 EMA50/EMA200 作为 Bear regime 的“强确认”（慢）。

示意逻辑（可在实现中微调）：

- 若 `trend == 'BULLISH'` 且（可选）`ema50 > ema200`:
  - Regime = BULL
- 若 `trend == 'BEARISH'` 且 `ema50 < ema200` 且满足 `bear_confirm_bars`:
  - Regime = BEAR
- 否则:
  - Regime = NEUTRAL

特点：

- 在牛市部分保持灵活（EMA21 快速跟随）。
- 在熊市部分要求更严格的确认，减少“短期跌破 EMA21 就激进做空”的问题。
- 默认建议：`regime_mode = "hybrid"`。

---

## 3. Regime 控制下的统一多空框架

Regime 只做“允许/禁止/严格限制”决策，不直接改动底层 EMA 入场结构，保持可读性。

主入口：`analyze(klines)` 逻辑调整（伪逻辑）：

1. 数据检查。
2. 获取当前时间 `current_time`。
3. 调用 `_get_regime(current_time)` → `regime in {BULL, BEAR, NEUTRAL}`。
4. 若 `current_position` 存在：
   - 沿用 `_check_exit_conditions`。
   - 可选增加：`regime` 强反转时的平仓逻辑。
5. 若无持仓：
   - 根据 Regime 与参数决定评估哪些方向：

决策表：

- BULL:
  - 允许：多头入场检查（优化版 `_check_long_entry_conditions`）。
  - 禁止：空头（即使 allow_short=True 也被 regime 拦截）。
- BEAR:
  - 允许：空头入场检查（强化版 `_check_short_entry_conditions`）。
  - 禁止：多头。
- NEUTRAL:
  - 根据 `neutral_trade_mode` 参数：
    - `no_trade`: 直接 hold。
    - `long_only_strict`: 仅允许非常强的多头趋势信号。
    - `both_strict`: 多空极严格过滤（高 RR、高趋势强度、高确认度）。

---

## 4. 多头逻辑（BULL Regime）

基于现有 `_check_entry_conditions` 中的多头部分，明确拆为 `_check_long_entry_conditions`：

核心条件（建议默认）：

1. EMA 多头排列：
   - `ema_fast > ema_medium > ema_slow`
2. 价格突破：
   - `prev_price <= prev_ema_medium` 且 `current_price > current_ema_medium`
3. 趋势强度过滤（沿用现有）：
   - 慢 EMA 上升斜率：
     - `ema_slow_slope > ema_slope_threshold`
   - EMA 间距足够：
     - `(ema_medium - ema_slow) / price > ema_band_distance_min`
4. 最小盈亏比：
   - 基于 ATR 止损/止盈或百分比止损/止盈计算 RR：
   - `rr >= min_rr_ratio_long`（默认 2.0）。
5. Regime 约束：
   - Regime 必须是 BULL 或满足 `neutral_trade_mode` 允许的情况。

---

## 5. 做空逻辑（BEAR Regime，重点优化）

新建 `_check_short_entry_conditions`，相比原逻辑大幅收紧：

### 5.1 Regime 必须先给许可

- 必须 `regime == 'BEAR'`。
- 仅 `allow_short == True` 时才进入逻辑。

### 5.2 技术结构要求（1h）

建议默认条件：

1. EMA 空头排列：
   - `ema_fast < ema_medium < ema_slow`
2. 价格向下突破：
   - `prev_price >= prev_ema_medium` 且 `current_price < current_ema_medium`
3. 趋势强度 strong_bear：
   - `ema_slow_slope < -ema_slope_threshold`
   - `(ema_medium - ema_slow) / price < -ema_band_distance_min_abs`（或用绝对值 + 方向）
4. 避免极端追空（位置过滤）：
   - 不在最近 N_bar 的极端低点：
     - `(price - recent_low) / recent_low >= min_distance_from_low`
   - 防止“一根大阴线砸到地板”时盲目继续开空。

### 5.3 风控参数（与多头区分）

建议新增参数：

- `min_rr_ratio_short`: 默认 2.5（做空需要更高 RR）。
- `max_risk_per_trade_short`: 默认为多头的 0.5x ~ 0.7x。
- `leverage_short`: 默认不高于 `leverage` 或单独设置上限。
- `use_short_atr_stop`: 是否对空头强制启用 ATR 止损。

原则：

- 做空只在“确认熊市 + 结构明确 + RR 优势明显”时开仓。
- 相对多头更保守的仓位和更严格的过滤，弥补历史做空策略不稳的问题。

---

## 6. 出场逻辑与 Regime 联动

在 `_check_exit_conditions` 中保持主体逻辑不变，仅增加可选 Regime 平仓规则。

可选增强（通过参数）：

- `exit_on_regime_flip`: 默认 True。
  - 多头持仓时，如果 Regime 从 BULL/NEUTRAL 转为 BEAR，触发保护性平仓。
  - 空头持仓时，如果 Regime 从 BEAR/NEUTRAL 转为 BULL，触发保护性平仓。
- 实现方式：
  - 在已有 daily_trend 检查基础上，改为基于 `_get_regime` 判断。

这样实现：

- 当大级别趋势出现反转，策略不会死扛原方向单。
- 避免在新 Regime 早期继续持有旧方向的趋势单。

---

## 7. 参数与配置结构建议

在 `EMASimpleTrendMultiframeStrategy` 初始化中，新增（或复用）关键参数：

Regime 相关：

- `regime_mode`: `"hybrid"`(默认) / `"simple_ema21"` / `"ema50_200"`
- `regime_band_pct`: 日线 EMA 附近中性带，默认 0.01
- `bull_confirm_bars`: 可选，确认 Bull 的最小天数（默认 0 或 3）
- `bear_confirm_bars`: 确认 Bear 的最小天数（默认 5）

多空开关：

- `allow_long`: bool，默认 True
- `allow_short`: bool，默认 True（但由 Regime 决定是否实质触发）

空头专属：

- `min_rr_ratio_short`
- `max_risk_per_trade_short`
- `leverage_short`
- `min_distance_from_low`（避免极端追空）

中性区行为：

- `neutral_trade_mode`:
  - `"no_trade"`: 不开新仓（推荐默认）
  - `"long_only_strict"`: 只做极强多头信号
  - `"both_strict"`: 多空都允许，但需要大幅抬高过滤门槛

Regime 平仓：

- `exit_on_regime_flip`: bool，默认 True

---

## 8. 与回测引擎和现有结构的对接

保持以下不变：

- `analyze(klines)` 对回测引擎返回的接口结构不变。
- `update_position(signal)` 与 `on_trade(trade)` 的调用方式保持兼容。
- 原有多头逻辑整体思想不变，只是拆分函数与加入 Regime 判断。

新增/调整点：

1. `_load_daily_data` 中增加日线 EMA50/EMA200 与 Regime 辅助字段计算。
2. 新增 `_get_regime(current_time)`，内部根据 `regime_mode` + 缓冲参数返回 Regime。
3. 将 `_check_entry_conditions` 拆为：
   - `_check_long_entry_conditions(current_price, klines, regime)`
   - `_check_short_entry_conditions(current_price, klines, regime)`
4. 在 `_check_exit_conditions` 中引入 `exit_on_regime_flip` 的可选逻辑。

---

## 9. 实现顺序建议（供后续 Code 实现参考）

1. 日线数据扩展：
   - 在现有日线加载逻辑基础上，计算 ema50, ema200，预生成必要字段。
2. Regime 核心函数：
   - 实现 `regime_mode` 三种模式与 `_get_regime`。
3. 入场条件拆分：
   - 将多头逻辑抽出为 `_check_long_entry_conditions`，引入 Regime 检查。
   - 新写 `_check_short_entry_conditions`，实现严格版 BEAR 入场逻辑。
4. 出场联动：
   - 在 `_check_exit_conditions` 增加 regime flip 平仓选项。
5. Backtest 配置：
   - 新增一个 `backtest_unified_ema_mtf_regime_eth.json`（命名示例）来跑 2y/6m 验证效果。

---

本设计文档即为后续实现的规范说明，满足：
- 统一多空
- 显式 Regime 管理
- 做空逻辑可控且可逐步调优
- 与当前代码、配置和回测框架兼容