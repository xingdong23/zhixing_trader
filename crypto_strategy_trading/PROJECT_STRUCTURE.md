# 📁 项目结构说明

## 目录结构

```
bitcoin_trader/
├── strategies/          # 【核心】交易策略库
├── backtest/            # 【核心】回测系统
├── live_trading/        # 【核心】实盘交易
├── deployment/          # 部署配置
├── docs/                # 项目文档
├── scripts/             # 辅助脚本
├── utils/               # 通用工具
├── data/                # 数据目录（gitignore）
└── logs/                # 日志目录（gitignore）
```

---

## 详细说明

### 1. strategies/ - 策略库

所有交易策略的实现代码。

```
strategies/
├── ema_simple_trend/          # EMA趋势策略（主力）
│   ├── strategy_multiframe.py # 策略实现
│   ├── config_multiframe.json # 策略配置
│   ├── backtest_multiframe_2years.json  # 回测配置
│   └── README.md              # 策略文档
│
├── high_frequency/            # 高频交易策略
│   ├── strategy.py
│   ├── risk_manager.py
│   └── position_storage.py
│
└── ...                        # 其他策略
```

**如何添加新策略**:
1. 在 `strategies/` 下创建新目录
2. 实现策略类（包含 `analyze()` 方法）
3. 创建配置文件
4. 创建回测配置
5. 运行回测验证

### 2. backtest/ - 回测系统

完整的历史数据回测功能。

```
backtest/
├── core/                      # 回测引擎核心
│   ├── backtest_engine.py    # 回测引擎
│   ├── data_loader.py        # 数据加载器
│   └── performance_analyzer.py # 性能分析
│
├── run_backtest.py            # 回测运行脚本
├── download_binance_data.py   # 数据下载工具
└── results/                   # 回测结果（JSON格式）
```

**使用方法**:
```bash
# 回测指定策略
python backtest/run_backtest.py --config strategies/ema_simple_trend/backtest_multiframe_2years.json

# 下载历史数据
python backtest/download_binance_data.py
```

### 3. live_trading/ - 实盘交易

实盘和模拟盘交易运行器。

```
live_trading/
├── ema_simple_trend.py        # EMA策略运行器
├── high_frequency.py          # 高频策略运行器
├── start_high_frequency.sh    # 启动脚本
└── config/                    # 实盘配置
    └── high_frequency.json
```

**使用方法**:
```bash
# 模拟盘
python live_trading/ema_simple_trend.py --mode paper

# 实盘（谨慎！）
python live_trading/ema_simple_trend.py --mode live
```

### 4. deployment/ - 部署配置

Docker和云服务器部署配置。

```
deployment/
├── Dockerfile                 # Docker镜像配置
├── docker-compose.yml         # Docker编排
├── .dockerignore             # Docker忽略文件
├── README.md                 # 部署文档
└── aliyun/                   # 阿里云部署
    ├── aliyun_deploy.md      # 详细部署指南
    └── quick_deploy.sh       # 一键部署脚本
```

**使用方法**:
```bash
# Docker部署
cd deployment
docker-compose up -d

# 阿里云部署
bash deployment/aliyun/quick_deploy.sh
```

### 5. docs/ - 项目文档

策略分析、开发指南等文档。

```
docs/
├── EMA_STRATEGY_COMPARISON.md    # EMA策略对比
├── EMA_PRODUCTION_GUIDE.md       # 生产环境指南
├── FINAL_SUMMARY.md              # 项目总结
└── archive/                      # 历史文档归档
```

### 6. scripts/ - 辅助脚本

部署、监控、清理等辅助脚本。

```
scripts/
├── deploy.sh                  # 部署脚本
├── monitor.sh                 # 监控脚本
└── cleanup.sh                 # 清理脚本
```

### 7. utils/ - 通用工具

日志管理、交易所连接等通用工具。

```
utils/
├── __init__.py
└── logger.py                  # 统一日志管理
```

---

## 工作流程

### 开发新策略

1. **创建策略目录**
   ```bash
   mkdir strategies/my_strategy
   ```

2. **实现策略**
   ```python
   # strategies/my_strategy/strategy.py
   class MyStrategy:
       def analyze(self, df):
           return {"signal": "hold", "reason": "..."}
   ```

3. **配置文件**
   ```json
   // strategies/my_strategy/config.json
   {
     "total_capital": 300.0,
     "leverage": 2.0
   }
   ```

4. **回测验证**
   ```bash
   python backtest/run_backtest.py --config strategies/my_strategy/backtest_config.json
   ```

5. **实盘测试**
   ```bash
   python live_trading/my_strategy.py --mode paper
   ```

### 部署到生产

1. **本地测试**
   ```bash
   python live_trading/ema_simple_trend.py --mode paper
   ```

2. **提交代码**
   ```bash
   git add .
   git commit -m "feat: 添加新策略"
   git push origin main
   ```

3. **部署到服务器**
   ```bash
   ssh root@server_ip
   cd /opt/zhixing_trader
   git pull origin main
   python live_trading/ema_simple_trend.py --mode paper
   ```

---

## 配置文件

### .env - 环境变量

```bash
# OKX API配置
OKX_API_KEY=your_api_key
OKX_API_SECRET=your_api_secret
OKX_PASSPHRASE=your_passphrase
OKX_TESTNET=True  # True=模拟盘, False=实盘
```

### .gitignore - Git忽略

```
# 数据和日志
data/
logs/
*.log

# 环境配置
.env
.env.local

# Python
__pycache__/
*.pyc
venv/
```

---

## 最佳实践

1. **策略开发**
   - 先在回测中验证策略
   - 使用模拟盘测试至少1-2周
   - 实盘初期使用小额资金

2. **代码管理**
   - 本地修改后提交Git
   - 服务器通过git pull更新
   - 不要直接在服务器修改代码

3. **配置管理**
   - 敏感配置（API密钥）放在.env
   - 策略参数放在config.json
   - 使用.env.example作为模板

4. **日志管理**
   - 所有日志统一存放在logs/
   - 按日期和策略分类
   - 定期清理旧日志

---

**最后更新**: 2025-11-04  
**版本**: v2.0
