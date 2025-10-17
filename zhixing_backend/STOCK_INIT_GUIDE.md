# 📘 股票池初始化指南

## 🎯 目标

完整地初始化美股股票池，包括：
1. **stocks** - 股票基本信息
2. **categories** - 分类树（Sector → Industry）
3. **category_stock_relations** - 股票与分类的关联

## 🚀 快速开始

### 方案1：使用种子文件（推荐）⭐⭐⭐⭐⭐

**优势**：
- ✅ 最快速（已有257只精选股票）
- ✅ 离线运行
- ✅ 数据质量有保证

**步骤**：

```bash
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader/zhixing_backend

# 直接运行（使用现有的257只股票）
python scripts/init_stock_universe_with_categories.py
```

**预期结果**：
- 获取257只股票的详细信息
- 自动创建10-15个Sector分类
- 自动创建50-100个Industry子分类
- 建立500+条关联关系
- 耗时：约5-10分钟

---

### 方案2：从Wikipedia获取（更多股票）⭐⭐⭐⭐

**优势**：
- ✅ 获得更多股票（600-800只）
- ✅ 全自动化

**步骤**：

```bash
# 1. 清空种子文件（让脚本自动从Wikipedia获取）
echo "" > data/us_stock_symbols.txt

# 2. 运行脚本
python scripts/init_stock_universe_with_categories.py
```

**预期结果**：
- 从S&P 600、NASDAQ 100获取股票列表
- 筛选出600-800只符合条件的股票
- 自动创建完整的分类树
- 耗时：约20-30分钟

---

## 📊 脚本功能说明

### 主要功能

```python
# scripts/init_stock_universe_with_categories.py
```

**1. 获取股票代码**
- 优先从种子文件 `data/us_stock_symbols.txt`
- 备用方案：从Wikipedia爬取

**2. 获取详细信息**
- 使用 yfinance 获取每只股票的：
  - 基本信息（代码、名称、价格）
  - 市值、成交量
  - **Sector（板块）** ⭐
  - **Industry（行业）** ⭐
  - 交易所、国家等

**3. 自动创建分类树**

```
Healthcare (Sector)
├── Biotechnology (Industry)
├── Drug Manufacturers (Industry)
└── Medical Devices (Industry)

Technology (Sector)
├── Software - Application (Industry)
├── Semiconductors (Industry)
└── Computer Hardware (Industry)

... 更多
```

**4. 建立关联关系**
- 每只股票关联到其 Sector（次要分类）
- 每只股票关联到其 Industry（主要分类）

**5. 保存数据**
- 保存到数据库（stocks、categories、category_stock_relations）
- 备份到JSON文件（data/目录）

---

## 📋 表结构说明

### 1. stocks 表

| 字段 | 类型 | 说明 |
|------|------|------|
| code | String(20) | 股票代码（唯一） |
| name | String(100) | 股票名称 |
| market | String(10) | 市场（US） |
| market_cap | String(20) | 市值级别 |
| is_active | Boolean | 是否有效 |
| added_at | DateTime | 添加时间 |
| updated_at | DateTime | 更新时间 |

### 2. categories 表

| 字段 | 类型 | 说明 |
|------|------|------|
| category_id | String(50) | 分类唯一标识（如：healthcare） |
| name | String(100) | 分类名称（如：Healthcare） |
| parent_id | String(50) | 父分类ID（NULL表示根节点） |
| path | String(500) | 路径（如：/healthcare/biotechnology） |
| level | Integer | 层级（0=Sector, 1=Industry） |
| icon | String(50) | 图标（如：🏥） |
| color | String(20) | 颜色（如：#48bb78） |
| stock_count | Integer | 直接关联的股票数 |
| is_active | Boolean | 是否有效 |

**分类层级**：
- Level 0: **Sector** (板块) - 如 Healthcare, Technology
- Level 1: **Industry** (行业) - 如 Biotechnology, Software

### 3. category_stock_relations 表

| 字段 | 类型 | 说明 |
|------|------|------|
| category_id | String(50) | 分类ID |
| stock_code | String(20) | 股票代码 |
| weight | Float | 权重（默认1.0） |
| is_primary | Boolean | 是否为主要分类 |
| notes | Text | 备注 |

**关联规则**：
- 每只股票关联到其 Sector（is_primary=False）
- 每只股票关联到其 Industry（is_primary=True）
- 唯一约束：(category_id, stock_code) 不重复

---

## 🎨 分类颜色和图标

### Sector图标映射

| Sector | 图标 | 颜色 |
|--------|------|------|
| Technology | 💻 | #4299e1（蓝色） |
| Healthcare | 🏥 | #48bb78（绿色） |
| Financial Services | 💰 | #ed8936（橙色） |
| Consumer Cyclical | 🛒 | #9f7aea（紫色） |
| Energy | ⚡ | #f56565（红色） |
| Industrials | 🏭 | #667eea（靛蓝） |
| Real Estate | 🏠 | #ed64a6（粉色） |
| Basic Materials | ⛏️ | #a0aec0（灰色） |

---

## 🔄 数据流程图

```
1. 获取股票代码
   ├── 种子文件 (data/us_stock_symbols.txt)
   └── Wikipedia (S&P 600, NASDAQ 100)
         ↓
2. 获取详细信息 (yfinance)
   - code, name, price, market_cap
   - sector, industry ⭐
         ↓
3. 构建分类树
   - 收集所有 Sector
   - 收集每个 Sector 下的 Industry
   - 创建层级关系
         ↓
4. 建立关联
   - Stock → Sector (secondary)
   - Stock → Industry (primary)
         ↓
5. 保存数据库
   - INSERT INTO stocks
   - INSERT INTO categories
   - INSERT INTO category_stock_relations
   - UPDATE categories SET stock_count
         ↓
6. 备份JSON
   - data/us_stocks.json
   - data/us_categories.json
   - data/us_category_relations.json
```

---

## 📊 预期数据量

### 使用种子文件（257只股票）

```
股票：257只
├── Sectors: ~10个
├── Industries: ~50个
└── 关联关系: ~500条

板块分布（示例）：
- Healthcare: ~60只
- Technology: ~50只
- Consumer: ~40只
- Energy: ~30只
- Industrials: ~25只
- 其他: ~52只
```

### 使用Wikipedia（600-800只股票）

```
股票：600-800只
├── Sectors: ~11个
├── Industries: ~80-100个
└── 关联关系: ~1200-1600条

板块分布：
- Healthcare/Biotechnology: ~200只
- Technology: ~150只
- Consumer: ~120只
- Energy: ~80只
- Industrials: ~70只
- 其他: ~180-380只
```

---

## 🔍 验证数据

### 查询示例

```sql
-- 1. 查看股票总数
SELECT COUNT(*) FROM stocks WHERE market = 'US';

-- 2. 查看分类总数
SELECT level, COUNT(*) FROM categories GROUP BY level;

-- 3. 查看关联总数
SELECT COUNT(*) FROM category_stock_relations;

-- 4. 查看各板块的股票数
SELECT 
    c.name,
    c.stock_count,
    c.icon
FROM categories c
WHERE c.level = 0
ORDER BY c.stock_count DESC;

-- 5. 查看某个板块的子分类
SELECT 
    c.name,
    c.stock_count
FROM categories c
WHERE c.parent_id = 'healthcare'
ORDER BY c.stock_count DESC;

-- 6. 查看某只股票的所有分类
SELECT 
    c.name,
    c.level,
    r.is_primary
FROM category_stock_relations r
JOIN categories c ON r.category_id = c.category_id
WHERE r.stock_code = 'AAPL';
```

---

## 📝 JSON备份文件

### data/us_stocks.json

```json
[
  {
    "code": "AAPL",
    "name": "Apple Inc.",
    "market": "US",
    "sector": "Technology",
    "industry": "Consumer Electronics",
    "market_cap": 2890123.45,
    "current_price": 178.23
  },
  ...
]
```

### data/us_categories.json

```json
[
  {
    "category_id": "technology",
    "name": "Technology",
    "parent_id": null,
    "level": 0,
    "path": "/technology",
    "icon": "💻",
    "color": "#4299e1"
  },
  {
    "category_id": "technology_consumer_electronics",
    "name": "Consumer Electronics",
    "parent_id": "technology",
    "level": 1,
    "path": "/technology/technology_consumer_electronics",
    "icon": "📊"
  },
  ...
]
```

### data/us_category_relations.json

```json
[
  {
    "category_id": "technology",
    "stock_code": "AAPL",
    "weight": 1.0,
    "is_primary": false,
    "notes": "Sector: Technology"
  },
  {
    "category_id": "technology_consumer_electronics",
    "stock_code": "AAPL",
    "weight": 1.0,
    "is_primary": true,
    "notes": "Industry: Consumer Electronics"
  },
  ...
]
```

---

## 🔧 高级使用

### 筛选条件自定义

修改脚本中的筛选条件：

```python
# 在 fetch_stock_details() 函数中修改
if 500_000_000 <= market_cap <= 10_000_000_000:  # 5亿-100亿
    if 5 <= current_price <= 150:  # $5-$150
```

### 添加自定义分类

```python
# 可以在 build_category_tree() 函数中添加自定义分类
categories.append({
    'category_id': 'my_custom_category',
    'name': 'My Custom Category',
    'parent_id': None,
    'level': 0,
    'icon': '⭐',
    'color': '#ff0000',
})
```

---

## ⚠️ 注意事项

### 1. 数据库准备

**运行前确保**：
- ✅ MySQL服务已启动
- ✅ 数据库 `zhixing_trader` 已创建
- ✅ 表结构已创建（stocks, categories, category_stock_relations）

**如果表不存在，先运行**：
```bash
python scripts/create_multi_kline_tables.py  # 创建表结构
```

### 2. 数据覆盖策略

**当前脚本使用 `if_exists='append'`**：
- 不会删除现有数据
- 如果股票代码重复，会报错（违反unique约束）

**如果想重新初始化（清空现有数据）**：

```sql
-- 先手动清空表
TRUNCATE TABLE category_stock_relations;
TRUNCATE TABLE categories;
DELETE FROM stocks WHERE market = 'US';
```

然后再运行脚本。

### 3. 耗时说明

- 种子文件（257只）：约5-10分钟
- Wikipedia（600-800只）：约20-30分钟

**为什么这么慢？**
- yfinance 需要逐个获取股票信息
- 添加了限流（避免被封IP）
- 需要处理大量数据

### 4. 错误处理

**如果某些股票获取失败**：
- 脚本会跳过并继续
- 最终只保存成功获取的股票

**常见错误**：
- 网络问题：重试即可
- API限流：等待几分钟后重试
- 股票已退市：会自动跳过

---

## 🎯 下一步

### 完成初始化后，你可以：

**1. 查看前端分类树**
```
访问：http://localhost:3000/categories
```

**2. 测试策略扫描**
```bash
python -m app.core.strategy.us_leader_hunter.strategy
```

**3. 定期更新**
```bash
# 每月运行一次，更新股票池
python scripts/init_stock_universe_with_categories.py
```

**4. 查看数据统计**
```bash
# 运行完成后会自动显示统计信息
# 也可以查看JSON文件
cat data/us_stocks.json | jq '.[] | {code, name, sector}'
```

---

## 💡 常见问题

### Q1: 为什么用两级分类（Sector → Industry）？

**A**: 符合金融行业标准分类方法：
- **Sector**（板块）：大类，如 Technology, Healthcare
- **Industry**（行业）：细分，如 Software, Biotechnology

这样可以：
- 粗略分析：看整个板块的表现
- 精细分析：看某个具体行业的龙头

### Q2: 可以添加更多层级吗？

**A**: 可以！`categories` 表支持多级：
- Level 0: Sector
- Level 1: Industry
- Level 2: Sub-Industry（可自行扩展）

只需在 `build_category_tree()` 中添加更多层级即可。

### Q3: 如何更新已有股票的分类？

**A**: 有两种方式：

**方式1**：重新运行整个脚本（清空后重建）

**方式2**：增量更新（编写更新脚本）
```python
# 更新某只股票的分类
UPDATE category_stock_relations 
SET category_id = 'new_category' 
WHERE stock_code = 'AAPL';
```

### Q4: Sector和Industry信息准确吗？

**A**: 来自Yahoo Finance的官方分类：
- ✅ 大部分准确（90%+）
- ⚠️ 少数可能过时或分类争议
- 💡 可以手动调整不准确的分类

### Q5: 如何添加自定义股票？

**A**: 编辑种子文件：
```bash
echo "TSLA,NVDA,AMD" >> data/us_stock_symbols.txt
python scripts/init_stock_universe_with_categories.py
```

---

## 📚 相关文档

- 股票池准备方案：`app/core/strategy/us_leader_hunter/STOCK_UNIVERSE_SETUP.md`
- 数据源配置：`FINAL_DATA_SOURCE_CONFIG.md`
- 策略文档：`app/core/strategy/us_leader_hunter/README.md`

---

**准备开始吧！** 🚀

```bash
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader/zhixing_backend
python scripts/init_stock_universe_with_categories.py
```

