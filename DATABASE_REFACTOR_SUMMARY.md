# 数据库表结构重构总结

## 📋 改进概览

本次重构大胆改进了 `zhixing_backend` 的数据库设计，删除了不合理的表和字段，**没有任何兼容逻辑**。

---

## 🔍 发现的问题及解决方案

### 问题 1: quotes 和 stocks 表职责不清

**问题分析**:
- `quotes` 表: 存储实时行情快照，每次更新都插入新记录
- `stocks` 表: 存储股票基本信息
- K线表: 已经包含 open/close/high/low/volume 等价格信息

**问题**: 
- `quotes` 表功能与K线表**完全重复**
- 数据快速膨胀，需要 `cleanup_old_quotes()` 定期清理
- 实时行情应该从最新K线获取，不需要单独的快照表

**解决方案**: 
✅ **删除 quotes 表**，统一使用K线表管理价格数据

---

### 问题 2: stocks 表的 group_id/group_name 设计不合理

**问题分析**:
```python
# stocks 表
group_id = Column(String(50))      # ❌ 冗余
group_name = Column(String(100))   # ❌ 冗余

# 同时存在完善的分类系统
CategoryDB                         # ✅ 多级分类树
CategoryStockRelationDB           # ✅ 股票-分类关联表
```

**问题**:
- 功能重复：已有 `categories` + `category_stock_relations` 分类系统
- 功能受限：不支持股票属于多个分组
- 数据冗余：`group_name` 存储在每个股票记录中
- 扩展性差：无法支持多级分类

**解决方案**:
✅ **删除 group_id/group_name 字段**，使用统一的分类系统

---

### 问题 3: K线表缺少外键约束

**问题分析**:
```python
# 优化前 - 没有外键
code = Column(String(20), index=True, nullable=False)
```

**问题**:
- 无法保证数据完整性
- 删除股票后，K线数据变成孤立记录
- 可能插入不存在股票的K线数据

**解决方案**:
✅ **添加外键约束，级联删除**
```python
code = Column(
    String(20), 
    ForeignKey('stocks.code', ondelete='CASCADE'),
    nullable=False
)
```

---

### 问题 4: K线表缺少唯一约束

**问题分析**:
```python
# 优化前 - 可能重复插入
Index('idx_daily_code_key', 'code', 'time_key')  # ❌ 非唯一
```

**问题**:
- 同一股票的同一时间可能插入多条K线数据
- 数据质量无法保证

**解决方案**:
✅ **添加唯一约束**
```python
Index('idx_daily_code_key', 'code', 'time_key', unique=True)  # ✅ 唯一
```

---

## 📝 详细修改清单

### 1. app/models.py

#### 删除的类
```python
class QuoteDB(Base):  # ❌ 完全删除
    """行情数据表"""
    __tablename__ = "quotes"
    ...

class QuoteData(BaseModel):  # ❌ 完全删除
    """行情数据 Pydantic 模型"""
    ...
```

#### StockDB 优化
```python
# 优化前
class StockDB(Base):
    code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    market = Column(String(10), nullable=False)
    group_id = Column(String(50))        # ❌ 删除
    group_name = Column(String(100))     # ❌ 删除
    ...

# 优化后
class StockDB(Base):
    """股票信息表 - 股票基本信息"""
    code = Column(String(20), unique=True, index=True, nullable=False, comment="股票代码")
    name = Column(String(100), nullable=False, comment="股票名称")
    market = Column(String(10), nullable=False, comment="市场: US, HK, CN")
    # 删除 group_id/group_name，使用分类系统代替
    
    __table_args__ = (
        Index('idx_stock_code', 'code'),
        Index('idx_stock_market', 'market'),
        Index('idx_stock_active', 'is_active'),
    )
```

#### K线表优化 (10个表全部优化)
```python
# 优化前
class KLineDailyDB(Base):
    code = Column(String(20), index=True, nullable=False)  # ❌ 无外键
    ...
    __table_args__ = (
        Index('idx_daily_code_key', 'code', 'time_key'),  # ❌ 非唯一
    )

# 优化后
class KLineDailyDB(Base):
    code = Column(
        String(20), 
        ForeignKey('stocks.code', ondelete='CASCADE'),  # ✅ 外键
        index=True, 
        nullable=False, 
        comment="股票代码"
    )
    ...
    __table_args__ = (
        Index('idx_daily_code_time', 'code', 'trade_time'),
        Index('idx_daily_code_key', 'code', 'time_key', unique=True),  # ✅ 唯一
    )
```

---

### 2. app/database.py

#### 删除的 imports
```python
from .models import (
    Base, StockDB, QuoteDB,  # ❌ 删除 QuoteDB
    QuoteData,  # ❌ 删除 QuoteData
    ...
)
```

#### 删除的方法
```python
def save_quote(self, quote_data: QuoteData) -> bool:  # ❌ 完全删除
    """保存行情数据"""
    ...

def get_latest_quotes(self, codes: Optional[List[str]] = None) -> List[QuoteDB]:  # ❌ 完全删除
    """获取最新行情数据"""
    ...

def cleanup_old_quotes(self, days_to_keep: int = 7) -> int:  # ❌ 完全删除
    """清理旧的行情数据"""
    ...

def get_stocks_by_group(self, group_id: str) -> List[StockDB]:  # ❌ 完全删除
    """根据分组获取股票"""
    ...
```

#### 修改的方法
```python
# add_stock() - 移除 group 字段
def add_stock(self, stock_data: dict) -> Optional[int]:
    stock = StockDB(
        code=stock_data.get('code'),
        name=stock_data.get('name'),
        # group_id=stock_data.get('group_id'),     # ❌ 删除
        # group_name=stock_data.get('group_name'), # ❌ 删除
        ...
    )

# upsert_stock() - 移除 group 参数
# 优化前
def upsert_stock(self, stock_info: StockInfo, group_id: str = None, group_name: str = None) -> bool:
# 优化后  
def upsert_stock(self, stock_info: StockInfo) -> bool:

# upsert_stocks_batch() - 修改参数类型
# 优化前
def upsert_stocks_batch(self, stocks_data: List[tuple]) -> bool:
    for stock_info, group_id, group_name in stocks_data:  # ❌ 元组包含 group
# 优化后
def upsert_stocks_batch(self, stocks_data: List[StockInfo]) -> bool:
    for stock_info in stocks_data:  # ✅ 只需 StockInfo

# get_stats() - 更新统计字段
# 优化前
stats = {
    "stocks": ...,
    "quotes": session.query(QuoteDB).count(),  # ❌ quotes
    "klines": session.query(KLineDB).count(),
}
# 优化后
stats = {
    "stocks": ...,
    "klines_daily": session.query(KLineDailyDB).count(),  # ✅ 具体表
    "strategies": session.query(StrategyDB).count(),
}
```

---

### 3. app/api/v1/endpoints/stocks.py

#### 删除的 imports
```python
from ....models import StockDB, QuoteDB  # ❌ 删除 QuoteDB
```

#### API 返回格式变化
```python
# 优化前
stock_data = {
    "id": stock.id,
    "symbol": stock.code,
    "name": stock.name,
    "group_id": stock.group_id,        # ❌ 删除
    "group_name": stock.group_name,    # ❌ 删除
    ...
}

# 优化后
stock_data = {
    "id": stock.id,
    "symbol": stock.code,
    "name": stock.name,
    "market": stock.market,
    "market_cap": stock.market_cap,
    "watch_level": stock.watch_level,
    ...
}
```

---

### 4. 新增迁移脚本

**文件**: `scripts/migrate_database_schema.py`

功能:
1. ✅ 删除 quotes 表
2. ✅ 删除 stocks 表的 group_id/group_name 字段
3. ✅ 为所有K线表添加外键约束
4. ✅ 为所有K线表添加唯一索引

---

## 📊 影响的数据库表

### 删除的表
- ❌ `quotes` - 行情数据表

### 修改的表
- ✅ `stocks` - 删除 `group_id` 和 `group_name` 列
- ✅ `klines_1min` - 添加外键和唯一索引
- ✅ `klines_3min` - 添加外键和唯一索引
- ✅ `klines_5min` - 添加外键和唯一索引
- ✅ `klines_15min` - 添加外键和唯一索引
- ✅ `klines_30min` - 添加外键和唯一索引
- ✅ `klines_1hour` - 添加外键和唯一索引
- ✅ `klines_4hour` - 添加外键和唯一索引
- ✅ `klines_daily` - 添加外键和唯一索引
- ✅ `klines_weekly` - 添加外键和唯一索引
- ✅ `klines_monthly` - 添加外键和唯一索引

---

## 🚀 迁移步骤

### 1. 备份数据库
```bash
mysqldump -u root -p zhixing_trader > backup_before_refactor.sql
```

### 2. 执行迁移
```bash
cd zhixing_backend
python scripts/migrate_database_schema.py
```

### 3. 验证结果
```bash
# 验证 quotes 表已删除
mysql -e "USE zhixing_trader; SHOW TABLES LIKE 'quotes';"  # 应该返回空

# 验证 stocks 表结构
mysql -e "USE zhixing_trader; DESCRIBE stocks;" | grep group  # 应该返回空

# 验证外键
mysql -e "
USE zhixing_trader;
SELECT TABLE_NAME, CONSTRAINT_NAME 
FROM information_schema.KEY_COLUMN_USAGE 
WHERE REFERENCED_TABLE_NAME = 'stocks';
"
```

---

## 📈 优化效果

### 存储优化
- 删除 quotes 表，避免历史快照无限堆积
- 减少 stocks 表字段，降低存储开销

### 性能优化
- 唯一索引防止重复数据，提升查询性能
- 外键约束在数据库层面保证完整性

### 架构优化
- 统一使用分类系统，架构更清晰
- 减少代码冗余，降低维护成本

---

## ⚠️ 注意事项

1. **无兼容逻辑**: 严格按照用户要求，不保留任何兼容代码
2. **API变化**: 前端需要适配新的返回格式
3. **数据迁移**: quotes 历史数据需在迁移前导出保存
4. **测试验证**: 迁移后需全面测试系统功能

---

## 📚 相关文档

- 📖 详细优化报告: `DATABASE_OPTIMIZATION.md`
- 📝 快速参考: `DATABASE_CHANGES_SUMMARY.md`
- 🔧 迁移脚本: `scripts/migrate_database_schema.py`

---

**改进完成时间**: 2025-10-17  
**改进类型**: 数据库表结构重构  
**影响范围**: 数据库、后端代码、API接口

