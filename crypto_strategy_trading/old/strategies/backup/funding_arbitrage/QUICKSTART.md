# 🚀 资金费率套利机器人 - 5分钟快速开始

## 第一步：配置API密钥（2分钟）

### 1. 获取OKX API密钥

1. 登录 [OKX官网](https://www.okx.com)
2. 进入 **账户设置 → API管理**
3. 创建新的API密钥
   - 权限：只勾选 **交易**（读取+交易）
   - 备注：资金费率套利机器人
   - IP白名单：建议设置（可选）

### 2. 配置环境变量

在项目根目录创建 `.env` 文件：

```bash
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader/crypto_strategy_trading

# 复制示例文件
cp .env.example .env

# 编辑.env文件
nano .env
```

填入你的API密钥：

```bash
OKX_API_KEY=你的API_Key
OKX_SECRET_KEY=你的Secret_Key
OKX_PASSPHRASE=你的Passphrase
```

---

## 第二步：启动模拟盘测试（1分钟）

```bash
# 确保在项目根目录
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader/crypto_strategy_trading

# 启动模拟盘
bash live_trading/start_funding_arbitrage.sh paper
```

你会看到类似输出：

```
======================================
  OKX资金费率套利机器人启动脚本
======================================
✓ 模拟盘模式
✓ 激活虚拟环境: .venv
🚀 启动资金费率套利机器人...
模式: paper
日志目录: logs/

============================================================
🤖 资金费率套利机器人启动
模式: 🟢 模拟盘
交易对: ETH-USDT
杠杆: 1.8x
检查间隔: 600秒
============================================================
🚀 开始运行，每600秒检查一次
📊 当前价格: $3150.50, 资金费率: 0.0105%, 现货余额: 0.1000
✓ 仓位平衡，资金费率: 0.0105%
```

---

## 第三步：观察运行（2分钟）

### 查看实时日志

打开新终端：

```bash
# 查看最新日志
tail -f logs/funding_arbitrage_paper_*.log
```

### 正常运行的标志

✅ 每10分钟输出一次状态  
✅ 显示当前价格和资金费率  
✅ 没有错误信息  

### 停止机器人

在运行终端按 `Ctrl + C`

---

## 常见问题

### Q1: 提示"未找到模块ccxt"

**解决**：

```bash
# 激活虚拟环境
source .venv/bin/activate

# 安装依赖
pip install ccxt requests python-dotenv
```

### Q2: 提示"API连接失败"

**检查清单**：
- [ ] .env文件是否在项目根目录
- [ ] API密钥是否正确填写
- [ ] API权限是否包含"交易"
- [ ] 网络是否正常

### Q3: 如何切换到实盘？

⚠️ **重要**：请先在模拟盘测试至少48小时！

```bash
# 启动实盘（需要二次确认）
bash live_trading/start_funding_arbitrage.sh live
```

---

## 下一步

### 📊 监控策略

- 查看日志文件：`logs/funding_arbitrage_paper_*.log`
- 观察资金费率变化
- 检查仓位调整情况

### ⚙️ 调整参数

编辑配置文件：`strategies/funding_arbitrage/config.json`

```json
{
  "strategy_params": {
    "leverage": 1.8,        // 调整杠杆（1.5-2.0）
    "target_delta": 0.98,   // 调整超额比例
    "funding_threshold": 0.0001  // 调整费率阈值
  }
}
```

### 🔔 配置通知

参考 [README.md](README.md) 的 "配置Telegram通知" 章节

---

## 需要帮助？

- 📖 详细文档：[README.md](README.md)
- 📝 查看日志：`logs/` 目录
- 🐛 报告问题：提交GitHub Issue

---

**祝你套利愉快！💰**
