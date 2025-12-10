---
description: 实盘部署一个策略的完整流程
---

# 实盘部署工作流

本文档定义了将策略部署到实盘的标准化流程。

## 📁 相关目录

```
freqtrade_bot/
├── my_strategies/{strategy_name}/
│   ├── strategy.py                 # 策略代码
│   ├── bot.py                      # 实盘 Bot
│   └── config.json                 # 配置文件
│
├── configs/                        # 通用配置
│   └── config_okx.json             # 交易所配置
│
└── logs/                           # 运行日志（运行时创建）
```

---

## 前置条件

1. ✅ 回测结果满意（收益正、回撤可控）
2. ✅ API密钥已配置
3. ✅ 参数优化完成

---

## 步骤 1: 配置环境变量

设置 API 密钥：

```bash
# 方式1: 环境变量
export BYBIT_API_KEY=your_api_key
export BYBIT_API_SECRET=your_secret

# 方式2: 在 bot.py 中读取 .env 文件
```

---

## 步骤 2: 调整策略配置

编辑策略配置，使用保守参数：

```python
# 实盘初期配置建议
INITIAL_CAPITAL = 100.0   # 小资金测试
LEVERAGE = 2              # 降低杠杆
```

---

## 步骤 3: 运行实盘 Bot

```bash
# 在 freqtrade_bot 目录下操作
cd freqtrade_bot

# 运行 Blowup 策略实盘
python my_strategies/blowup/bot.py
```

---

## 步骤 4: 监控运行

```bash
# 查看日志
tail -f blowup_bot.log

# 查看进程
ps aux | grep bot.py
```

---

## ⚠️ 风险警告

1. **小资金起步**: 初期使用 100-300 USDT
2. **设置止损**: 严格执行风控规则
3. **API安全**: 设置IP白名单，定期更换密钥
4. **定期检查**: 每天查看日志和交易记录
