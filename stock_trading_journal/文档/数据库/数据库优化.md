# 数据库表结构优化报告

## 📊 优化概述

本次优化大胆改进了数据库表结构,删除了不合理的设计,提升了数据一致性和系统性能。

## 🔍 发现的问题

### 1. **quotes 表设计不合理**
- **问题**: 每次保存行情都新增记录,数据快速膨胀
- **证据**: 
  - 需要 `cleanup_old_quotes()` 方法定期清理
  - 与 K线表功能重复
  - 只需要最新行情,不需要历史快照

### 2. **stocks 表的 group_id/group_name 冗余**
- **问题**: 
  - 已有完善的分类系统 (`CategoryDB` + `CategoryStockRelationDB`)
  - `group_id/group_name` 功能重复
  - 不支持股票属于多个分组
  - 数据冗余,容易不一致

### 3. **缺少外键约束**
- **问题**: 
  - quotes 表、K线表没有外键关联到 stocks 表
  - 数据完整性得不到保障
  - 可能出现孤立数据

### 4. **K线表缺少唯一约束**
- **问题**:
  - code + time_key 没有唯一约束
  - 可能插入重复数据

## ✅ 实施的优化

### 1. 删除 quotes 表

**理由**: 
- K线数据已经包含了所有需要的价格信息
- 实时行情应该从最新的K线数据获取
- 避免数据冗余和存储浪费

**影响的代码**:
- `app/models.py`: 删除 `QuoteDB` 类和 `QuoteData` Pydantic模型
- `app/database.py`: 删除所有 quotes 相关方法
  - `save_quote()`
  - `get_latest_quotes()`
  - `cleanup_old_quotes()`

### 2. 删除 stocks 表的 group_id/group_name 字段

**理由**:
- 使用现有的分类系统 (`categories` + `category_stock_relations`)
- 支持多级分类
- 支持股票属于多个分类
- 数据更规范,避免冗余

**修改**:
```python
# 优化前
class StockDB(Base):
    code = Column(String(20), ...)
    name = Column(String(100), ...)
    group_id = Column(String(50))       # ❌ 删除
    group_name = Column(String(100))    # ❌ 删除
    ...

# 优化后
class StockDB(Base):
    code = Column(String(20), unique=True, index=True, nullable=False, comment="股票代码")
    name = Column(String(100), nullable=False, comment="股票名称")
    market = Column(String(10), nullable=False, comment="市场: US, HK, CN")
    # 使用 CategoryDB + CategoryStockRelationDB 管理分类
    ...
```

**影响的代码**:
- `app/database.py`: 
  - 删除 `get_stocks_by_group()` 方法
  - 修改 `upsert_stock()` 和 `upsert_stocks_batch()` 方法签名
- `app/api/v1/endpoints/stocks.py`: 移除返回数据中的 `group_id` 和 `group_name` 字段

### 3. 为 K线表添加外键约束

**理由**:
- 保证数据完整性
- 删除股票时自动级联删除K线数据
- 符合关系数据库最佳实践

**修改**: 所有10个K线表都添加了外键约束

```python
# 优化前
class KLine1MinDB(Base):
    code = Column(String(20), index=True, nullable=False)  # ❌ 没有外键
    ...

# 优化后
class KLine1MinDB(Base):
    code = Column(
        String(20), 
        ForeignKey('stocks.code', ondelete='CASCADE'),  # ✅ 添加外键
        index=True, 
        nullable=False, 
        comment="股票代码"
    )
    ...
```

**影响的表**:
- `klines_1min`
- `klines_3min`
- `klines_5min`
- `klines_15min`
- `klines_30min`
- `klines_1hour`
- `klines_4hour`
- `klines_daily`
- `klines_weekly`
- `klines_monthly`

### 4. 为 K线表添加唯一索引

**理由**:
- 防止重复插入相同时间的K线数据
- 提升查询性能
- 保证数据质量

**修改**:
```python
# 优化后
__table_args__ = (
    Index('idx_1min_code_time', 'code', 'trade_time'),
    Index('idx_1min_code_key', 'code', 'time_key', unique=True),  # ✅ 唯一约束
)
```

## 📁 修改的文件清单

### 核心文件
1. `app/models.py` - 数据模型定义
   - 删除 `QuoteDB` 类
   - 删除 `QuoteData` Pydantic模型
   - 优化 `StockDB` 表结构
   - 为所有K线表添加外键和唯一索引

2. `app/database.py` - 数据库服务
   - 删除 imports 中的 `QuoteDB` 和 `QuoteData`
   - 删除 `save_quote()` 方法
   - 删除 `get_latest_quotes()` 方法
   - 删除 `cleanup_old_quotes()` 方法
   - 删除 `get_stocks_by_group()` 方法
   - 修改 `add_stock()` - 移除 group_id/group_name
   - 修改 `upsert_stock()` - 移除 group 参数
   - 修改 `upsert_stocks_batch()` - 修改参数类型
   - 修改 `get_stats()` - 更新统计字段

3. `app/api/v1/endpoints/stocks.py` - API端点
   - 删除 imports 中的 `QuoteDB`
   - 移除返回数据中的 `group_id` 和 `group_name` 字段

### 新增文件
4. `scripts/migrate_database_schema.py` - 数据库迁移脚本
   - 自动执行表结构迁移
   - 删除 quotes 表
   - 删除 stocks 表的 group 字段
   - 添加外键约束
   - 添加唯一索引

## 🚀 如何执行迁移

### 1. 备份数据库 (重要!)
```bash
mysqldump -u username -p database_name > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 执行迁移脚本
```bash
cd zhixing_backend
python scripts/migrate_database_schema.py
```

### 3. 验证迁移结果
```bash
# 检查表结构
mysql -u username -p database_name -e "DESCRIBE stocks;"
mysql -u username -p database_name -e "SHOW TABLES;"
mysql -u username -p database_name -e "SHOW CREATE TABLE klines_daily;"
```

## 📈 优化效果

### 性能提升
- ✅ **存储空间减少**: 删除 quotes 表,避免历史行情快照堆积
- ✅ **查询性能提升**: 唯一索引防止重复数据,提升查询效率
- ✅ **数据一致性**: 外键约束保证数据完整性

### 代码质量提升
- ✅ **代码更简洁**: 删除冗余方法和字段
- ✅ **设计更合理**: 使用统一的分类系统
- ✅ **维护更方便**: 减少代码重复,降低维护成本

### 数据管理提升
- ✅ **数据更规范**: 统一使用K线表管理行情数据
- ✅ **分类更灵活**: 支持多级分类和多分类归属
- ✅ **约束更严格**: 外键和唯一约束保证数据质量

## ⚠️ 注意事项

### 1. 不需要兼容逻辑
按照用户要求,本次优化**没有添加任何兼容逻辑**,直接删除了不合理的设计。

### 2. 需要重新导入数据
如果现有数据库中有数据,需要:
1. 导出 quotes 表数据 (如果需要保留)
2. 执行迁移脚本
3. 从 quotes 数据生成K线数据 (如果需要)

### 3. API 返回格式变化
- 股票列表 API 不再返回 `group_id` 和 `group_name`
- 使用分类API (`/categories`) 获取股票分类信息

## 🎯 总结

本次优化大刀阔斧地改进了数据库设计:

1. **删除冗余** - 删除了 quotes 表和 group 字段
2. **添加约束** - 添加了外键和唯一索引
3. **提升性能** - 减少存储,提升查询效率
4. **规范设计** - 使用统一的分类系统

这些改进使数据库结构更加合理,符合关系数据库设计最佳实践!


