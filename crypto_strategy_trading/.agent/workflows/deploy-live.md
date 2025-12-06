---
description: 实盘部署一个策略的完整流程
---

# 实盘部署工作流

本文档定义了将策略部署到实盘的标准化流程。

## 📁 相关目录

```
crypto_strategy_trading/
├── live_trading/
│   ├── common/                        # 公共组件
│   │   ├── base_trader.py             # 交易基类
│   │   ├── db_logger.py               # 数据库日志
│   │   └── utils.py                   # 工具函数
│   │
│   └── {strategy_name}/               # 策略交易实现
│       ├── __init__.py
│       ├── trader.py                  # 交易执行器
│       └── start.sh                   # 启动脚本
│
├── strategies/{strategy_name}/        # 策略代码
│   └── config.json                    # 策略配置（实盘参数）
│
├── run_{strategy_name}.sh             # 根目录启动脚本
├── .env                               # API密钥配置
└── logs/                              # 运行日志
```

---

## 前置条件

1. ✅ 回测结果满意（收益正、回撤可控）
2. ✅ 参数优化完成
3. ✅ 在样本外数据验证通过
4. ✅ API密钥已配置

---

## 步骤 1: 配置环境变量

创建或编辑 `.env` 文件：

```bash
# .env 文件
# OKX API配置
OKX_API_KEY=your_api_key_here
OKX_SECRET_KEY=your_secret_key_here
OKX_PASSPHRASE=your_passphrase_here

# 环境设置（demo=模拟盘, live=实盘）
TRADING_MODE=demo

# Telegram通知（可选）
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# 数据库配置（可选）
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=trading
```

---

## 步骤 2: 调整策略配置

编辑 `strategies/{strategy_name}/config.json`，设置实盘参数：

```json
{
  "strategy_name": "my_strategy",
  "version": "1.0.0",
  
  "trading": {
    "capital": 100.0,          // 实盘初期使用小资金
    "leverage": 2.0,           // 降低杠杆
    "max_position_ratio": 0.3  // 降低仓位比例
  },
  
  "risk_management": {
    "max_daily_loss": 0.05,    // 单日最大亏损5%
    "max_drawdown": 0.10,      // 最大回撤10%
    "max_positions": 1         // 最多持有1个仓位
  },
  
  "notifications": {
    "telegram_enabled": true,
    "notify_on_trade": true,
    "notify_on_error": true
  }
}
```

---

## 步骤 3: 模拟盘测试

### 3.1 启动模拟盘

```bash
# 确保使用模拟盘模式
export TRADING_MODE=demo

# 启动策略
python -m live_trading.my_strategy.trader --mode paper
```

### 3.2 观察运行

```bash
# 查看日志
tail -f logs/my_strategy.log

# 检查交易记录
cat logs/trades.json
```

### 3.3 模拟盘验证周期

- **最少运行时间**: 1-2周
- **检查项**:
  - [ ] 无错误或异常
  - [ ] 交易信号正常触发
  - [ ] 订单正确执行
  - [ ] 日志记录完整
  - [ ] 通知功能正常

---

## 步骤 4: 切换到实盘

### 4.1 最终检查清单

- [ ] 模拟盘测试至少1周
- [ ] 无严重Bug
- [ ] API密钥权限正确（只开启交易权限，设置IP白名单）
- [ ] 资金准备就绪
- [ ] 通知配置正确

### 4.2 启动实盘

```bash
# 切换到实盘模式
export TRADING_MODE=live

# 使用小资金启动
python -m live_trading.my_strategy.trader --capital 100

# 或使用启动脚本
./run_my_strategy.sh
```

---

## 步骤 5: 创建启动脚本

在项目根目录创建 `run_{strategy_name}.sh`:

```bash
#!/bin/bash
# run_my_strategy.sh

# 配置
STRATEGY_NAME="my_strategy"
LOG_DIR="logs"
PID_FILE="${LOG_DIR}/${STRATEGY_NAME}.pid"

# 创建日志目录
mkdir -p ${LOG_DIR}

# 激活虚拟环境
source .venv/bin/activate

# 加载环境变量
source .env

# 检查是否已运行
if [ -f ${PID_FILE} ]; then
    OLD_PID=$(cat ${PID_FILE})
    if ps -p ${OLD_PID} > /dev/null 2>&1; then
        echo "策略已在运行 (PID: ${OLD_PID})"
        exit 1
    fi
fi

# 启动策略
nohup python -m live_trading.${STRATEGY_NAME}.trader \
    --config strategies/${STRATEGY_NAME}/config.json \
    >> ${LOG_DIR}/${STRATEGY_NAME}.log 2>&1 &

# 保存PID
echo $! > ${PID_FILE}
echo "策略已启动 (PID: $!)"
```

---

## 步骤 6: 设置监控

### 6.1 日志监控

```bash
# 实时查看日志
tail -f logs/my_strategy.log

# 查看错误
grep -i error logs/my_strategy.log
```

### 6.2 进程监控（可选）

创建 `watchdog.sh`:

```bash
#!/bin/bash
# watchdog.sh - 监控并自动重启

STRATEGY_NAME="my_strategy"
PID_FILE="logs/${STRATEGY_NAME}.pid"

while true; do
    if [ -f ${PID_FILE} ]; then
        PID=$(cat ${PID_FILE})
        if ! ps -p ${PID} > /dev/null 2>&1; then
            echo "$(date): 策略已停止，正在重启..."
            ./run_${STRATEGY_NAME}.sh
        fi
    else
        echo "$(date): PID文件不存在，正在启动..."
        ./run_${STRATEGY_NAME}.sh
    fi
    sleep 60
done
```

---

## 步骤 7: 日常运维

### 每日检查

- [ ] 查看交易记录
- [ ] 检查账户余额
- [ ] 确认策略运行状态
- [ ] 查看日志是否有异常

### 常用命令

```bash
# 查看运行状态
ps aux | grep my_strategy

# 停止策略
kill $(cat logs/my_strategy.pid)

# 查看最近交易
tail -100 logs/trades.json

# 查看收益统计
python scripts/calculate_pnl.py
```

---

## ⚠️ 风险警告

1. **小资金起步**: 初期使用 100-300 USDT
2. **设置止损**: 严格执行风控规则
3. **API安全**: 设置IP白名单，定期更换密钥
4. **定期检查**: 每天查看日志和交易记录
5. **紧急停止**: 熟悉如何快速停止策略
