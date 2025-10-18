# 🇺🇸 美股热点龙头捕捉策略 - 完整文档

## 一、策略概述

### 策略定位
```
名称：US Market Leader Hunter（美股龙头猎手）
目标：捕捉美股热点板块的领涨股
周期：2-15天（短期波段）
风格：题材驱动 + 动量交易
适用：中小盘成长股、概念股
胜率：40-50%
盈亏比：1:3以上
```

### 核心理念

```
市场资金永远追逐热点
热点中的龙头享受最大溢价
龙头有生命周期，要识别阶段
情绪驱动 > 基本面（短期）
```

---

## 二、美股 vs A股差异调整

| 特征 | A股 | 美股 | 策略调整 |
|------|-----|------|---------|
| **涨跌幅限制** | ±10%涨跌停 | 无限制 | 用涨幅>10%代替涨停 |
| **交易机制** | T+1 | T+0 | 可当日反复交易 |
| **盘前盘后** | 无 | 有 | 需监控盘前异动 |
| **成交量** | 看换手率 | 看相对成交量 | Volume > Avg×2 |
| **做空** | 受限 | 容易 | 需防范做空风险 |
| **催化剂** | 政策、题材 | 财报、FDA、产品 | 更看重基本面催化 |
| **市值** | 10-60亿 | $500M-$5B | 小盘更容易爆发 |

---

## 三、热点板块识别

### 3.1 板块分类体系

```python
板块分类：
1. GICS行业分类（传统）
   - Technology (科技)
   - Healthcare (医疗)
   - Energy (能源)
   - Financials (金融)
   等11大类

2. 主题/概念板块（重点！）
   - AI人工智能
   - 新能源/电动车
   - 生物科技/基因治疗
   - 云计算/SaaS
   - 加密货币相关
   - 大麻股
   - 太空探索
   - 元宇宙/VR

3. ETF板块追踪
   - ARKK（创新）
   - XLK（科技）
   - IBB（生物科技）
   - ICLN（清洁能源）
```

### 3.2 热点评分算法

```python
sector_heat_score = (
    板块涨跌幅(30%) +           # 板块平均涨幅
    相对强度(25%) +             # 相对大盘的表现
    成交量放大(20%) +           # 板块成交量倍数
    领涨股数量(15%) +           # 涨幅>5%的股票数
    持续性(10%)                 # 连续上涨天数
)

满分100分：
>= 70: 强热点（重点关注）
>= 50: 一般热点（次要关注）
< 50: 非热点（忽略）
```

### 3.3 催化剂类型（优先级）

```python
1. FDA批准/临床数据（生物医药）⭐⭐⭐⭐⭐
   - Phase 3结果
   - FDA批准
   - 紧急使用授权

2. 财报超预期 ⭐⭐⭐⭐
   - EPS beat > 10%
   - Revenue beat > 5%
   - Guidance上调

3. 产品发布/订单 ⭐⭐⭐⭐
   - 新产品发布
   - 大额合同/订单
   - 市场份额提升

4. 分析师大幅上调 ⭐⭐⭐
   - 目标价上调 > 20%
   - 评级上调
   - 华尔街巨头背书

5. 收购/合作 ⭐⭐⭐
   - 被收购传闻
   - 战略合作
   - 授权协议

6. 概念炒作 ⭐⭐
   - 蹭热点
   - 业务转型
```

---

## 四、龙头股识别

### 4.1 龙头股10大特征

```python
1. 板块内最先启动 ✅
2. 涨幅最大（板块前3）✅
3. 与板块直接相关 ✅
4. 市值适中（$500M-$5B）✅
5. 股价不太高（<$100）✅
6. 成交量活跃（>500万股/日）✅
7. 有强催化剂 ✅
8. 技术形态强势 ✅
9. 机构持仓增加 ✅
10. 连续大涨 ✅
```

### 4.2 龙头评分系统

```python
leader_score = (
    板块地位(25分) +    # 排名、首发
    涨幅表现(20分) +    # 累计涨幅
    催化剂(20分) +      # 催化剂强度
    技术形态(15分) +    # 形态评分
    成交量(10分) +      # 量能配合
    市值流通(10分)      # 市值合理性
)

>= 70: 确认龙头（重点关注）
>= 60: 潜在龙头（观察）
< 60: 非龙头（忽略）
```

---

## 五、生命周期识别

### 5.1 四个生命周期

```python
1. 初生期（Birth）
   特征：
   - 首次大涨（>10%）
   - 板块刚启动（<=3天）
   - 开始获得关注
   
   操作：观察，可小仓位试探（10-20%）

2. 加速期（Growth）🔥 - 最佳买入期
   特征：
   - 连续大涨（2天+涨幅>10%）
   - 成交量持续放大
   - 不断创新高
   
   操作：✅ 重仓买入（30-50%）

3. 休整期（Consolidation）⚠️
   特征：
   - 横盘整理3-10天
   - 成交量萎缩
   - 等待方向选择
   
   操作：持股观望，或减仓至20-30%

4. 衰退期（Decline）❌
   特征：
   - 5日无大涨
   - 放量下跌
   - 跌破关键支撑
   
   操作：立即全部清仓
```

### 5.2 生命周期转换

```
初生期 ─┬─> 加速期（成功）✅
        └─> 衰退期（失败）❌

加速期 ─┬─> 休整期（正常）
        └─> 衰退期（见顶）❌

休整期 ─┬─> 加速期（二次启动）✅
        ├─> 继续休整
        └─> 衰退期（破位）❌

衰退期 ─> 游戏结束
```

---

## 六、技术形态识别

### 6.1 买入形态

```python
1. 突破新高形态（最强）🔥🔥🔥
   - 突破52周新高
   - 放量突破（Volume > Avg × 2）
   - 涨幅 > 10%
   评分：40分

2. 连续大阳线形态 🔥🔥🔥
   - 连续2-3天大阳线
   - 每天涨幅 > 8%
   - 成交量递增
   评分：38分

3. Gap Up突破 🔥🔥
   - 高开 > 5%
   - 不回补缺口
   - 全天强势
   评分：35分

4. 回踩支撑 🔥🔥
   - 大涨后回调3-8%
   - 回踩20日均线
   - 再次放量拉升
   评分：35分

5. 盘前异动 🔥
   - 盘前涨幅 > 20%
   - 重大利好
   评分：30分
```

### 6.2 卖出形态

```python
1. 放量滞涨 🚨
   - 成交量巨大（> Avg × 3）
   - 涨幅很小（< 3%）
   - 长上影线
   评分：-20分

2. 破位下跌 ❌
   - 跌破20日均线
   - 放量下跌（> 5%）
   - 连续阴线
   评分：-40分
```

---

## 七、交易策略

### 7.1 买入条件（全部满足）

```python
1. 板块条件
   ✅ 热度分数 >= 70
   ✅ 持续时间 2-5天

2. 龙头条件
   ✅ 龙头分数 >= 70
   ✅ 生命周期 = "加速期"
   ✅ 板块排名 <= 3

3. 技术形态条件
   ✅ 形态分数 >= 35
   ✅ 量价配合良好
   ✅ 在关键均线之上

4. 催化剂条件
   ✅ 有明确催化剂
   ✅ 催化剂强度 >= 中

5. 市值条件
   ✅ 市值 $500M - $5B
   ✅ 股价 < $100
```

### 7.2 仓位管理

```python
信号强度 → 仓位比例：

满仓信号（Priority 1）: 90%
- 龙头 + 加速期 + 突破新高 + FDA催化

重仓信号（Priority 2）: 70%
- 龙头 + 加速期 + 连续大阳 + 财报催化

半仓信号（Priority 3）: 50%
- 龙头 + 加速期 + Gap Up + 一般催化

试探信号（Priority 4）: 20%
- 潜在龙头 + 初生期

限制：
- 单股最大仓位：50%
- 同板块最大仓位：70%
```

### 7.3 止损策略

```python
多重止损机制：

1. 固定止损：-8%（基础）

2. 技术止损：
   - 跌破20日均线
   - 跌破关键支撑位
   - 放量破位（>5%）

3. 生命周期止损：
   - 进入衰退期立即清仓

4. 板块止损：
   - 板块热度 < 40
   - 板块连续3日下跌

5. 盘前止损（美股特色）：
   - 盘前跌幅 > -15%

6. 时间止损：
   - 持仓15天无新高

执行优先级：
盘前暴跌 > 生命周期衰退 > 破位下跌 > 固定止损
```

### 7.4 止盈策略

```python
金字塔止盈：

目标1：+15%
- 减仓40%
- 止损移至成本+5%

目标2：+30%
- 再减仓30%
- 止损移至成本+15%

目标3：+50%+
- 剩余30%追踪止损
- 追踪止损：最高价-10%

生命周期止盈：
- 加速期：持有，追踪止损
- 休整期：减仓50%
- 衰退期：立即清仓
```

---

## 八、风险控制

### 8.1 风险等级评估

```python
风险评分 = 
  涨幅风险(30分) +      # 已涨幅过大
  市值风险(20分) +      # 市值太小
  催化剂风险(20分) +    # 概念炒作
  板块持续性风险(20分) + # 炒作时间过长
  技术风险(10分)        # 极高位

>= 60: 高风险 → 小仓位或不参与
>= 30: 中风险 → 正常仓位
< 30: 低风险 → 可重仓
```

### 8.2 美股特有风险

```python
1. 做空风险 ⚠️
   - 关注做空比例（Short Interest）
   - 如果>30%，小心逼空或崩盘

2. 盘前盘后风险 ⚠️
   - 流动性差，波动大
   - 避免盘前盘后追高
   - 盘前暴跌立即止损

3. 财报风险 ⚠️
   - 财报前减仓
   - 除非极度确定，不持仓过财报

4. FDA风险（生物医药）⚠️
   - 拒绝可能暴跌-50%+
   - 分散持仓

5. 监管风险 ⚠️
   - SEC调查
   - 反垄断审查
```

---

## 九、策略执行流程

```python
时间安排（美东时间EST）：

盘前（6:00-9:30）
├─ 扫描盘前大涨股票（>10%）
├─ 识别重大催化剂
├─ 确认所属板块
├─ 生成盘前信号
└─ 设置开盘买入计划

开盘（9:30-10:30）
├─ 确认盘前信号有效性
├─ 检查Gap Up是否回补
├─ 计算买入仓位
├─ 执行限价单/市价单
└─ 设置止损止盈单

盘中（10:30-16:00）- 每15分钟
├─ 更新持仓盈亏
├─ 检查止损止盈条件
├─ 监控龙头地位变化
├─ 监控板块热度变化
└─ 调整追踪止损

盘后（16:00-20:00）
├─ 更新板块数据
├─ 扫描龙头股
├─ 生成交易信号
├─ 发送通知
└─ 统计分析
```

---

## 十、数据库设计

### 10.1 美股热点板块表

```sql
CREATE TABLE us_sector_hotspot (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    date DATE NOT NULL,
    sector_name VARCHAR(100),
    sector_type VARCHAR(50),          -- GICS/Concept/ETF
    
    -- 热度评分
    heat_score FLOAT,                 -- 0-100
    heat_rank INT,
    heat_stage VARCHAR(20),           -- 新晋/持续/退潮
    
    -- 板块指标
    sector_return_1d FLOAT,
    sector_return_5d FLOAT,
    relative_strength FLOAT,          -- vs SPY
    volume_ratio FLOAT,
    
    -- 个股统计
    total_stocks INT,
    gainers_count INT,
    big_movers_count INT,             -- >5%
    
    -- 持续性
    consecutive_up_days INT,
    sector_age INT,
    
    -- 催化剂
    main_catalyst VARCHAR(200),
    catalyst_type VARCHAR(50),
    catalyst_strength VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_date_score (date, heat_score DESC),
    UNIQUE KEY uk_date_sector (date, sector_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 10.2 美股龙头股表

```sql
CREATE TABLE us_leading_stocks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    date DATE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(200),
    sector_name VARCHAR(100),
    
    -- 龙头评分
    leader_score FLOAT,               -- 0-100
    sector_rank INT,
    is_confirmed_leader BOOLEAN,
    
    -- 生命周期
    life_cycle VARCHAR(20),           -- Birth/Growth/Consolidation/Decline
    cycle_stage_days INT,
    days_since_sector_start INT,
    
    -- 涨幅表现
    return_1d FLOAT,
    return_5d FLOAT,
    return_since_start FLOAT,
    max_return_since_start FLOAT,
    current_drawdown FLOAT,
    
    -- 技术形态
    tech_pattern VARCHAR(50),
    pattern_score FLOAT,
    support_level FLOAT,
    resistance_level FLOAT,
    
    -- K线数据
    open_price FLOAT,
    high_price FLOAT,
    low_price FLOAT,
    close_price FLOAT,
    volume BIGINT,
    
    -- 成交量指标
    volume_ratio FLOAT,
    avg_volume_20d BIGINT,
    volume_trend VARCHAR(20),
    
    -- 均线
    ma5 FLOAT,
    ma10 FLOAT,
    ma20 FLOAT,
    above_ma20 BOOLEAN,
    
    -- 市值
    market_cap FLOAT,                 -- 亿美元
    
    -- 催化剂
    catalyst_type VARCHAR(50),
    catalyst_detail TEXT,
    catalyst_score FLOAT,
    
    -- 盘前盘后
    premarket_change FLOAT,
    afterhours_change FLOAT,
    
    -- 交易信号
    signal VARCHAR(10),               -- BUY/SELL/HOLD
    signal_strength VARCHAR(20),
    signal_reason TEXT,
    confidence_level FLOAT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_date_symbol (date, symbol),
    INDEX idx_leader_score (leader_score DESC),
    UNIQUE KEY uk_date_symbol (date, symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 10.3 美股交易信号表

```sql
CREATE TABLE us_trading_signals (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    signal_date DATE NOT NULL,
    signal_time DATETIME NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    sector_name VARCHAR(100),
    
    -- 信号类型
    signal_type VARCHAR(10),          -- BUY/SELL
    signal_strength VARCHAR(20),      -- 强/中/弱/试探
    priority INT,                     -- 1-5优先级
    
    -- 信号依据
    sector_heat_score FLOAT,
    leader_score FLOAT,
    life_cycle VARCHAR(20),
    tech_pattern VARCHAR(50),
    catalyst_type VARCHAR(50),
    
    -- 价格信息
    signal_price FLOAT,
    current_price FLOAT,
    entry_price_low FLOAT,
    entry_price_high FLOAT,
    
    -- 风险管理
    stop_loss_price FLOAT,
    stop_loss_pct FLOAT,
    target_price_1 FLOAT,
    target_price_2 FLOAT,
    target_price_3 FLOAT,
    
    -- 仓位建议
    position_ratio FLOAT,
    max_position_size INT,
    
    -- 风险评估
    risk_level VARCHAR(20),
    risk_reward_ratio FLOAT,
    
    -- 信号理由
    reason TEXT,
    key_points JSON,
    
    -- 信号状态
    status VARCHAR(20),               -- active/executed/expired/cancelled
    executed_at DATETIME,
    executed_price FLOAT,
    
    -- 结果跟踪
    max_profit_pct FLOAT,
    final_profit_pct FLOAT,
    hold_days INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_signal_date (signal_date DESC),
    INDEX idx_priority (priority, signal_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 十一、核心要点总结

### 必须记住的数字

```
70 - 热点分数阈值
70 - 龙头分数阈值
-8% - 固定止损
+15% - 第一止盈目标（减仓40%）
+30% - 第二止盈目标（减仓30%）
2-5天 - 板块最佳持续时间
$500M-$5B - 最佳市值区间
```

### 核心流程

```
1. 识别热点板块（热度>=70）
2. 找出龙头股（龙头分>=70）
3. 确认生命周期（加速期最佳）
4. 验证技术形态（强势形态）
5. 评估催化剂（强催化优先）
6. 计算仓位（按优先级分配）
7. 设置止损止盈（严格执行）
8. 持仓监控（生命周期变化）
```

### 禁止行为

```
❌ 追高（涨幅>100%）
❌ 重仓单股（>50%）
❌ 不止损
❌ 持仓过财报（除非确定）
❌ 忽视板块退潮
❌ 不看生命周期
```

---

## 十二、策略优势与劣势

### 优势 ✅

1. 捕捉爆发行情（龙头通常涨幅>30%）
2. 信号明确（生命周期+技术形态）
3. 风险可控（严格止损+分批止盈）
4. 适合美股（利用T+0和盘前盘后）
5. 系统化（可量化、可回测、可优化）

### 劣势 ⚠️

1. 需要盯盘（生命周期变化快）
2. 交易频繁（持仓周期短2-15天）
3. 胜率不高（约40-50%）
4. 依赖催化剂
5. 情绪化风险（题材炒作退潮快）

---

**使用前必读：此策略适合短期波段交易，不适合长期投资！**

