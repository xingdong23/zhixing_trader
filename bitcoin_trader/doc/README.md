# 比特币高频交易策略

## 简介
这是一个基于OKX交易所的比特币高频短线交易策略。

## 目录结构
```
bitcoin_trader/
├── run/                           # 运行脚本目录
│   ├── high_frequency.py          # 高频策略运行脚本
│   └── start_high_frequency.sh    # 高频策略快速启动
├── strategies/                    # 策略目录
│   └── high_frequency/            # 高频策略
│       ├── strategy.py            # 策略核心逻辑
│       └── risk_manager.py        # 风险管理
├── config/                        # 配置目录
│   └── high_frequency.json        # 高频策略配置
└── .env                           # API密钥配置
```

## 快速开始

### 1. 配置API密钥
复制 `.env.example` 为 `.env`，填入你的OKX API密钥：
```bash
OKX_API_KEY=your_api_key
OKX_API_SECRET=your_api_secret
OKX_PASSPHRASE=your_passphrase
```

**重要说明：**
- **模拟盘模式**：使用OKX模拟盘API Key，会真实调用OKX API下单，但使用的是模拟资金
- **实盘模式**：使用OKX实盘API Key，会真实调用OKX API下单，使用的是真实资金

两种模式都会真实调用OKX的API，区别只是API Key不同（模拟盘Key vs 实盘Key）

### 2. 安装依赖
```bash
pip install -r requirements.txt
```

### 3. 运行策略

**方式1：使用快速启动脚本**
```bash
./run/start_high_frequency.sh
```

**方式2：直接运行Python脚本**
```bash
# 模拟盘
python run/high_frequency.py --mode paper

# 实盘
python run/high_frequency.py --mode live
```

## 策略说明

### 核心逻辑
- **时间框架**: 5分钟K线
- **持仓时间**: 5分钟-2小时
- **杠杆**: 3倍
- **每日目标**: 3-5%收益

### 入场条件（做多）
1. 5分钟EMA8上穿EMA21
2. 成交量突增（>前5根均值1.5倍）
3. RSI(14)从低于45区域向上突破
4. 价格突破前15分钟高点

### 入场条件（做空）
1. 5分钟EMA8下穿EMA21
2. 成交量突增（>前5根均值1.5倍）
3. RSI(14)从高于55区域向下跌破
4. 价格跌破前15分钟低点

### 风险控制
- **止损**: 0.8%-1.2%
- **止盈**: 1.5%-2.5%
- **盈亏比**: 1.5:1 - 2:1
- **单日最大亏损**: 8%
- **连续亏损2单停止交易**

## 日志
运行日志保存在 `logs/` 目录下，按日期命名。

## 注意事项
⚠️ **风险提示**：
- 加密货币交易存在高风险
- 建议先在模拟盘充分测试
- 实盘交易请谨慎，做好风险控制
- 不要投入超过你能承受损失的资金
