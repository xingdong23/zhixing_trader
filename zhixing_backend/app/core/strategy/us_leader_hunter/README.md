# 美股龙头猎手策略 (US Leader Hunter)

## 📚 策略说明

基于热点板块和龙头股识别的短期波段交易策略，适用于美股市场。

### 核心逻辑

```
1. 识别热点板块（热度>=70）
2. 找出龙头股（龙头分>=70）
3. 确认生命周期（加速期最佳）
4. 验证技术形态（强势形态）
5. 生成交易信号
```

## 📦 模块结构

```
us_leader_hunter/
├── __init__.py                 # 模块导出
├── strategy.py                 # 主策略类
├── sector_analyzer.py          # 板块分析器
├── leader_identifier.py        # 龙头识别器
├── lifecycle_tracker.py        # 生命周期跟踪器
├── pattern_detector.py         # 技术形态检测器
└── README.md                   # 本文档
```

## 🚀 快速使用

### 1. 基础使用

```python
from zhixing_backend.app.core.strategy.us_leader_hunter import USLeaderHunterStrategy

# 创建策略实例
config = {
    "parameters": {
        "sector_heat_threshold": 70.0,
        "leader_score_threshold": 70.0,
        "stop_loss_pct": 0.08,
    }
}

strategy = USLeaderHunterStrategy(config)

# 分析股票
result = strategy.analyze(
    code="TSLA",
    klines=klines_data,
    context={
        "sector_info": {
            "sector_name": "Electric Vehicles",
            "sector_return_1d": 5.2,
            "relative_strength": 3.5,
            "volume_ratio": 2.3,
            "big_movers_count": 4,
            "consecutive_up_days": 2,
            "sector_age": 3,
            "sector_rank": 1,
            "catalyst_type": "Earnings_Beat",
            "market_cap": 800,  # 亿美元
        },
        "market_env": {"spy_return": 0.5},
    }
)

# 查看结果
if result["signal"] == "buy":
    print(f"买入信号!")
    print(f"分数: {result['score']}")
    print(f"仓位: {result['position_ratio']:.1%}")
    print(f"止损: {result['stop_loss']}")
    print(f"原因: {result['reason']}")
```

### 2. 信号结果结构

```python
{
    "code": "TSLA",
    "signal": "buy",                    # buy/sell/hold/watch
    "action": "strong_buy",
    "score": 88.5,
    "confidence": "high",
    
    # 信号强度
    "signal_strength": "Priority_2",    # Priority_1-4
    "priority": 2,
    
    # 价格信息
    "current_price": 250.00,
    "entry_price_low": 245.00,
    "entry_price_high": 255.00,
    
    # 仓位
    "position_ratio": 0.70,
    
    # 止损止盈
    "stop_loss": 230.00,
    "stop_loss_pct": 0.08,
    "take_profit_levels": [
        {
            "price": 287.50,
            "close_ratio": 0.40,
            "trailing_stop_pct": 0.05,
            "description": "目标1: +15%"
        },
        {
            "price": 325.00,
            "close_ratio": 0.30,
            "trailing_stop_pct": 0.15,
            "description": "目标2: +30%"
        },
        {
            "price": 375.00,
            "close_ratio": 0.30,
            "trailing_stop_pct": 0.10,
            "description": "目标3: +50%"
        }
    ],
    "risk_reward_ratio": 1.88,
    
    # 分析详情
    "sector_heat_score": 85.0,
    "leader_score": 82.0,
    "lifecycle": {
        "stage": "Growth",
        "days": 3,
        "description": "连续大涨，最佳买入期",
        "confidence": "high"
    },
    "tech_pattern": {
        "primary_pattern": "连续大阳线",
        "score": 38,
        "patterns": ["连续大阳线"],
        "description": "连续2-3天大阳线，涨幅>8%"
    },
    
    # 信号原因
    "reason": "板块热度: 85.0 | 龙头分数: 82.0 | 生命周期: Growth | 技术形态: 连续大阳线",
    "key_points": [...],
    
    # 风险等级
    "risk_level": "low",
    
    # 时间戳
    "signal_time": "2025-10-17T15:30:00"
}
```

## 📊 评分系统

### 板块热度评分（0-100）

```
= 板块涨跌幅(30%) + 相对强度(25%) + 成交量放大(20%) + 
  领涨股数量(15%) + 持续性(10%)

>= 70: 强热点（重点关注）
>= 50: 一般热点（次要关注）
< 50: 非热点（忽略）
```

### 龙头股评分（0-100）

```
= 板块地位(25分) + 涨幅表现(20分) + 催化剂(20分) + 
  技术形态(15分) + 成交量(10分) + 市值流通(10分)

>= 70: 确认龙头（重点关注）
>= 60: 潜在龙头（观察）
< 60: 非龙头（忽略）
```

### 技术形态评分

```
突破新高: 40分
连续大阳线: 38分
Gap Up突破: 35分
回踩支撑: 35分
...
放量滞涨: -20分（卖出信号）
破位下跌: -40分（止损信号）
```

## 🎯 生命周期

| 阶段 | 特征 | 操作 |
|------|------|------|
| Birth（初生期） | 首次大涨，板块刚启动 | 观察或小仓位试探（10-20%） |
| Growth（加速期） | 连续大涨，成交量放大 | ✅ 重仓买入（30-50%） |
| Consolidation（休整期） | 横盘整理3-10天 | 持股观望或减仓 |
| Decline（衰退期） | 放量下跌，跌破支撑 | ❌ 立即清仓 |

## ⚠️ 风险控制

### 止损机制

1. 固定止损：-8%
2. 技术止损：跌破20日均线
3. 生命周期止损：进入衰退期立即清仓
4. 盘前止损：盘前跌幅 > -15%
5. 时间止损：持仓15天无新高

### 止盈机制

1. 目标1（+15%）：减仓40%，止损移至成本+5%
2. 目标2（+30%）：再减仓30%，止损移至成本+15%
3. 目标3（+50%+）：剩余30%追踪止损（最高价-10%）

## 📈 信号优先级

| 优先级 | 条件 | 仓位 |
|--------|------|------|
| Priority_1 | 龙头+加速期+突破新高+FDA催化 | 90% |
| Priority_2 | 龙头+加速期+连续大阳+财报催化 | 70% |
| Priority_3 | 龙头+加速期+Gap Up+一般催化 | 50% |
| Priority_4 | 潜在龙头+初生期 | 20% |

## 🔧 配置参数

### 默认参数

```python
{
    # 板块条件
    "sector_heat_threshold": 70.0,
    "sector_min_days": 2,
    "sector_max_days": 5,
    
    # 龙头条件
    "leader_score_threshold": 70.0,
    "leader_rank_limit": 3,
    
    # 技术形态
    "pattern_score_threshold": 35.0,
    "volume_ratio_min": 2.0,
    
    # 市值条件
    "market_cap_min": 500,      # 5亿美元
    "market_cap_max": 5000,     # 50亿美元
    "stock_price_max": 100.0,
    
    # 仓位管理
    "max_single_position": 0.50,
    "max_sector_position": 0.70,
    
    # 止损止盈
    "stop_loss_pct": 0.08,
    "premarket_stop_loss": -0.15,
    "max_hold_days": 15,
}
```

## 📝 使用注意事项

1. **必需的上下文数据**：
   - 必须提供 `sector_info` 包含板块信息
   - 建议提供 `market_env` 包含市场环境

2. **数据要求**：
   - 至少需要60根K线数据
   - K线数据格式符合 `KLineData` 接口

3. **适用市场**：
   - 主要针对美股市场
   - 适合中小盘成长股、概念股
   - 不适合大盘蓝筹股

4. **风险提示**：
   - 短期波段策略，不适合长期投资
   - 胜率约40-50%，盈亏比1:3以上
   - 需要严格执行止损

## 📚 相关文档

- [完整策略文档](../US_LEADER_STRATEGY.md)
- [数据库设计](../US_LEADER_STRATEGY.md#十数据库设计)

## 🤝 扩展开发

### 自定义板块分析器

```python
from zhixing_backend.app.core.strategy.us_leader_hunter import SectorAnalyzer

class CustomSectorAnalyzer(SectorAnalyzer):
    def calculate_heat_score(self, sector_info):
        # 自定义逻辑
        score = super().calculate_heat_score(sector_info)
        # 添加自己的评分逻辑
        return score
```

### 自定义形态检测器

```python
from zhixing_backend.app.core.strategy.us_leader_hunter import PatternDetector

class CustomPatternDetector(PatternDetector):
    def detect_pattern(self, klines):
        result = super().detect_pattern(klines)
        # 添加自己的形态识别
        return result
```

## 📞 问题反馈

如有问题，请查看：
- 策略文档：`US_LEADER_STRATEGY.md`
- 代码注释：各模块文件中的详细注释

