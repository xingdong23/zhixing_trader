# 动量赌徒 (Momentum Gambler)

**"像买期权一样做交易"**

这是一个基于这种理念的高盈亏比策略：**在波动率极低时进场（便宜的期权费），等待波动率爆发（无限的收益）。**

## 🏆 核心逻辑 (V9 - 最终版)

*   **捕捉对象**: 4小时级别的单边趋势（数天到数周）。
*   **入场信号**:
    1.  **TTM Squeeze**: 布林带 (Bollinger Bands) 变窄并完全进入 Keltner Channels 内部。这代表市场进入了极致的平静期。
    2.  **Breakout**: 价格突破布林上轨。
    3.  **Confirmation**: ADX > 15 且 EMA 趋势向上。
*   **出场**:
    *   **止损**: 8% (配合10x杠杆 = 80% 风险)，给予充分的震荡呼吸空间。
    *   **移动止盈 (Trailing Stop)**: start 10%, offset 15%。一旦趋势启动，就一直持有直到趋势反转。

## ⚙️ 最佳参数 (已调优)

| 参数 | 值 | 说明 |
|---|---|---|
| **Timeframe** | **4h** | 过滤噪音，只吃大鱼身 |
| **Leverage** | **10x** | **切勿贪高**。10x 刚好能抗住 8% 的回撤。高于12x会被震下车。 |
| **Stop Loss** | 0.08 | 8% 宽止损 |
| **Trailing** | 10% / 15% | 让利润奔跑 |

## 💰 资金管理 (三颗子弹)

建议采用 **每月定投 + 以小博大** 的模式：
1.  每月准备 300 U 预算。
2.  分成 3 份 (3颗子弹)，每份 100 U。
3.  每次信号只打一颗子弹。
4.  如果爆仓（损失80%），下个月如果有信号再打。
5.  如果盈利，就让它滚雪球，**不要轻易加仓，也不要轻易止盈。**

## 📊 回测表现 (参考)

*   **DOGE** (Meme币代表): 5年回报 **+4932%** 🚀
*   **PEPE** (新晋土狗): 3个月 **+1200%**
*   **BNB** (主流币): 3年 **+165%**

## 🚀 如何使用

**1. 运行回测**
```bash
# 确保在 freqtrade_bot 目录下
# 必须使用 backtest.py 而不是 freqtrade 命令，因为支持了特殊的 1h/5m 混合数据加载
python my_strategies/momentum_gambler/backtest.py --symbol DOGEUSDT
```

**2. 核心文件**
*   `strategy.py`: 策略逻辑
*   `backtest.py`: 专用回测脚本
*   `live_runner.py`: **实盘机器人** 🤖
*   `config.json`: 实盘配置文件

## 🤖 实盘部署指南 (Live Trading)

**1. 安装依赖**
```bash
pip install ccxt requests pandas numpy scipy
```

**2. 配置**
编辑 `my_strategies/momentum_gambler/config.json`:
*   填入 **Binance API Key** & **Secret** (确保开通合约交易权限)
*   填入 **飞书 Webhook** (用于接收通知)
*   确认 `leverage` (10x) 和 `position_size_usdt` (默认100U，即1000U仓位)

**3. 启动**
建议使用 `nohup` 或 `screen` 后台运行：
```bash
# 确保在 freqtrade_bot 目录下
python my_strategies/momentum_gambler/live_runner.py
```

**4. 运维**
*   查看日志: `tail -f bot.log`
*   状态文件: `bot_state.json` (自动保存持仓状态，请勿随意修改)
