# 项目结构说明

## 目录结构

```
bitcoin_trader/
├── app/                          # 核心应用代码
│   ├── core/                     # 核心模块
│   │   ├── strategies/          # 交易策略
│   │   └── risk_manager.py      # 风险管理
│   ├── models/                   # 数据模型
│   └── utils/                    # 工具函数
│
├── runners/                      # 策略运行脚本
│   ├── run_high_frequency_strategy.py    # 高频策略运行器
│   ├── run_okx_live_demo.py              # OKX实盘演示
│   └── run_okx_paper_trading.py          # OKX模拟盘交易
│
├── scripts/                      # 部署和工具脚本
│   ├── deploy.sh                # 基础部署脚本
│   ├── deploy_to_aliyun.sh      # 阿里云部署
│   ├── start_high_frequency.sh  # 启动高频策略
│   ├── init_database.py         # 数据库初始化
│   └── 一键部署.sh              # 一键部署脚本
│
├── tests/                        # 测试文件
│   └── test_high_frequency_strategy.py
│
├── strategy_configs/             # 策略配置文件
│   └── high_frequency_config.json
│
├── docs/                         # 文档
├── examples/                     # 示例代码
├── logs/                         # 日志文件
│
├── .env                          # 环境变量配置
├── .env.example                  # 环境变量示例
├── requirements.txt              # Python依赖
├── requirements_high_frequency.txt  # 高频策略依赖
├── DEPLOY_MANUAL.md             # 部署手册
└── README.md                     # 项目说明

```

## 快速开始

### 1. 运行高频策略（模拟盘）
```bash
cd runners
python run_high_frequency_strategy.py --mode paper --capital 300
```

### 2. 部署到阿里云
```bash
cd scripts
./deploy_to_aliyun.sh
```

### 3. 运行测试
```bash
cd tests
python test_high_frequency_strategy.py
```

## 主要文件说明

- **runners/run_high_frequency_strategy.py**: 高频短线策略主运行脚本
- **app/core/strategies/high_frequency_scalping_strategy.py**: 高频策略核心实现
- **scripts/start_high_frequency.sh**: 服务器上启动策略的Shell脚本
- **strategy_configs/high_frequency_config.json**: 策略参数配置
