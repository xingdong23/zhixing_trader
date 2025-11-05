# 📊 股票池初始化总结

## ✅ 当前状态

**后台任务**：完整版脚本（257只股票）正在运行
- 📂 日志文件：`/tmp/stock_init_full.log`
- ⏱️ 预计耗时：约53分钟（使用3个Alpha Vantage账户）
- 🔄 进度：可通过日志查看

## 🚀 推荐使用方案

### 方案1：快速测试（5分钟）⭐⭐⭐⭐⭐

```bash
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader/zhixing_backend
python scripts/init_stock_universe_quick.py
```

**特点**：
- ✅ 只处理前20只股票
- ✅ 5分钟内完成
- ✅ 验证所有功能
- ✅ 快速查看结果

**适合**：
- 首次使用，验证功能
- 快速测试数据源
- 调试问题

---

### 方案2：完整初始化（53分钟）

```bash
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader/zhixing_backend

# 前台运行（可看进度）
python scripts/init_stock_universe_with_data_sources.py

# 或后台运行
nohup python scripts/init_stock_universe_with_data_sources.py > stock_init.log 2>&1 &
```

**特点**：
- ✅ 处理全部257只股票
- ✅ 自动使用3个Alpha Vantage账户轮换
- ✅ 自动筛选（市值5亿-100亿）
- ⏱️ 耗时约53分钟

**适合**：
- 生产环境
- 需要完整股票池
- 有耐心等待

---

## 📋 脚本对比

| 特性 | 快速测试版 | 完整版 |
|------|-----------|--------|
| 文件名 | `init_stock_universe_quick.py` | `init_stock_universe_with_data_sources.py` |
| 股票数量 | 20只 | 257只 |
| 耗时 | ~5分钟 | ~53分钟 |
| 数据源 | 3个Alpha Vantage账户 | 3个Alpha Vantage账户 |
| 功能完整性 | ✅ 100% | ✅ 100% |
| 适用场景 | 测试验证 | 生产环境 |

---

## 🔍 查看后台任务进度

```bash
# 查看最新100行日志
tail -100 /tmp/stock_init_full.log

# 实时监控日志
tail -f /tmp/stock_init_full.log

# 查看已获取的股票数
grep "✅.*:" /tmp/stock_init_full.log | wc -l

# 查看跳过的股票数
grep "跳过" /tmp/stock_init_full.log | wc -l
```

---

## 📊 预期结果

### 快速测试版（20只）

```
预期结果：
- 股票：3-8只（符合市值条件）
- 分类：5-10个
- 关联关系：6-16条

示例板块分布：
- Technology: 2-3只
- Healthcare: 1-2只
- Consumer: 1只
- 其他: 1-2只
```

### 完整版（257只）

```
预期结果：
- 股票：60-120只（符合市值条件）
- 分类：50-80个
  - Sectors (Level 0): 10-12个
  - Industries (Level 1): 40-68个
- 关联关系：120-240条

板块分布（预估）：
- Technology: 20-30只
- Healthcare: 15-25只
- Consumer: 10-15只
- Energy: 8-12只
- Financial: 8-12只
- Industrials: 5-10只
- 其他: 14-26只
```

---

## ⚙️ 数据源配置

### 使用的数据源

```
Alpha Vantage #1: AU1SKLJOOD36YINC  ✅
Alpha Vantage #2: 4VB3Z3TNX6HTKK3O  ✅
Alpha Vantage #3: JT69QSCCNLF6CAOW  ✅

总能力：
- 1,500次/天
- 15次/分钟
- 自动轮换，避免单个账户限流
```

### 为什么不用Twelve Data？

Twelve Data虽然也有800次/天的配额，但：
- ⚠️ 不提供Sector/Industry信息
- ⚠️ OVERVIEW端点不可用

Alpha Vantage的OVERVIEW端点提供：
- ✅ Sector（板块）
- ✅ Industry（行业）
- ✅ MarketCapitalization
- ✅ Exchange, Country等

---

## 📁 生成的文件

### 数据库表

1. **stocks** - 股票基本信息
```sql
SELECT COUNT(*) FROM stocks WHERE market = 'US';
-- 快速版：3-8只
-- 完整版：60-120只
```

2. **categories** - 分类树
```sql
SELECT level, COUNT(*) FROM categories GROUP BY level;
-- Level 0 (Sectors): 10-12个
-- Level 1 (Industries): 40-68个
```

3. **category_stock_relations** - 关联关系
```sql
SELECT 
    is_primary,
    COUNT(*) 
FROM category_stock_relations 
GROUP BY is_primary;
-- is_primary=1 (主要): 股票数
-- is_primary=0 (次要): 股票数
```

### JSON备份文件

```
/Users/chengzheng/workspace/chuangxin/zhixing_trader/zhixing_backend/data/
├── us_stocks.json           - 股票列表
├── us_categories.json       - 分类树
└── us_category_relations.json - 关联关系
```

---

## ✅ 验证数据

运行完成后，验证数据：

```bash
# 方法1：运行验证脚本
python scripts/verify_stock_data.py

# 方法2：SQL查询
mysql -u root -p zhixing_trader -e "
SELECT 
    (SELECT COUNT(*) FROM stocks WHERE market='US') as stocks_count,
    (SELECT COUNT(*) FROM categories) as categories_count,
    (SELECT COUNT(*) FROM category_stock_relations) as relations_count;
"
```

**预期输出**：
```
✅ stocks表：3-8只（快速版）或 60-120只（完整版）
✅ categories表：5-10个（快速版）或 50-80个（完整版）
✅ category_stock_relations表：6-16条（快速版）或 120-240条（完整版）
✅ 所有股票都有分类
✅ 分类的stock_count统计准确
```

---

## 🐛 常见问题

### Q1: 为什么有些股票被跳过？

**A**: 正常情况，原因包括：
- 市值不符合（<$500M 或 >$10B）
- 股票已退市
- Alpha Vantage没有该股票数据
- 数据字段不完整

### Q2: 为什么这么慢？

**A**: Alpha Vantage限流严格：
- 免费版：5次/分钟/账户
- 我们使用3个账户并行，但仍需要约53分钟

**解决方案**：
- 使用快速测试版（20只，5分钟）
- 让完整版在后台运行
- 或升级到Alpha Vantage付费版

### Q3: 如何停止后台任务？

**A**:
```bash
# 查找进程
ps aux | grep init_stock_universe_with_data_sources

# 停止进程
kill <PID>
```

### Q4: 数据已存在，如何重新初始化？

**A**: 先清空数据：
```sql
-- 连接数据库
mysql -u root -p zhixing_trader

-- 清空表
TRUNCATE TABLE category_stock_relations;
TRUNCATE TABLE categories;
DELETE FROM stocks WHERE market = 'US';

-- 退出
exit
```

然后重新运行初始化脚本。

### Q5: 可以增量添加股票吗？

**A**: 可以！编辑种子文件：
```bash
# 添加新股票代码
echo "AAPL,TSLA,NVDA" >> data/us_stock_symbols.txt

# 运行脚本（会自动跳过已存在的）
python scripts/init_stock_universe_with_data_sources.py
```

---

## 💡 下一步

### 完成快速测试后

1. **查看结果**
```bash
python scripts/verify_stock_data.py
```

2. **查看前端分类树**
```
访问：http://localhost:3000/categories
```

3. **运行完整版**（如需要）
```bash
nohup python scripts/init_stock_universe_with_data_sources.py > stock_init.log 2>&1 &
```

4. **测试策略**
```bash
# 短线技术策略
python scripts/test_short_term_strategy.py

# 龙头捕手策略
python -m app.core.strategy.us_leader_hunter.strategy
```

---

## 📚 相关文档

- 详细指南：`STOCK_INIT_GUIDE.md`
- 数据源配置：`FINAL_DATA_SOURCE_CONFIG.md`
- 策略文档：`app/core/strategy/us_leader_hunter/README.md`

---

**选择你的方案，开始吧！** 🚀

```bash
# 推荐：快速测试
python scripts/init_stock_universe_quick.py

# 完整版（后台运行）
nohup python scripts/init_stock_universe_with_data_sources.py > stock_init.log 2>&1 &
```

