# 数据库表结构改进总结

## 🎯 核心改进

### 1. 删除 quotes 表 ❌

**原因**:
- 功能与K线表重复
- 数据快速膨胀需要定期清理
- 实时行情应从最新K线获取

**替代方案**: 从日线K线表 `klines_daily` 获取最新价格

---

### 2. 删除 stocks 表的 group_id/group_name 字段 ❌

**原因**:
- 已有完善的分类系统 (`categories` + `category_stock_relations`)
- 不支持股票属于多个分组
- 数据冗余

**替代方案**: 使用多级分类系统

```sql
-- 获取股票的分类
SELECT c.* FROM categories c
JOIN category_stock_relations r ON c.category_id = r.category_id
WHERE r.stock_code = 'AAPL';
```

---

### 3. K线表添加外键约束 ✅

**好处**:
- 保证数据完整性
- 删除股票时自动级联删除K线数据
- 防止孤立数据

```python
code = Column(
    String(20), 
    ForeignKey('stocks.code', ondelete='CASCADE'),
    nullable=False
)
```

---

### 4. K线表添加唯一索引 ✅

**好处**:
- 防止重复数据
- 提升查询性能

```python
__table_args__ = (
    Index('idx_daily_code_key', 'code', 'time_key', unique=True),
)
```

---

## 📊 优化后的表结构

### stocks 表 (优化后)
```sql
CREATE TABLE stocks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(20) UNIQUE NOT NULL COMMENT '股票代码',
    name VARCHAR(100) NOT NULL COMMENT '股票名称',
    market VARCHAR(10) NOT NULL COMMENT '市场: US, HK, CN',
    lot_size INT DEFAULT 100 COMMENT '交易单位',
    sec_type VARCHAR(20) DEFAULT 'STOCK' COMMENT '证券类型',
    market_cap VARCHAR(20) COMMENT '市值级别',
    watch_level VARCHAR(20) COMMENT '关注等级',
    notes TEXT COMMENT '用户备注',
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_stock_code (code),
    INDEX idx_stock_market (market),
    INDEX idx_stock_active (is_active)
);
```

### klines_daily 表 (示例)
```sql
CREATE TABLE klines_daily (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(20) NOT NULL COMMENT '股票代码',
    time_key VARCHAR(20) NOT NULL COMMENT '时间键',
    trade_time DATETIME NOT NULL COMMENT '交易时间',
    open_price FLOAT NOT NULL COMMENT '开盘价',
    close_price FLOAT NOT NULL COMMENT '收盘价',
    high_price FLOAT NOT NULL COMMENT '最高价',
    low_price FLOAT NOT NULL COMMENT '最低价',
    volume INT COMMENT '成交量',
    turnover FLOAT COMMENT '成交额',
    change_rate FLOAT COMMENT '涨跌幅',
    amplitude FLOAT COMMENT '振幅',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外键约束
    CONSTRAINT fk_klines_daily_stocks 
        FOREIGN KEY (code) REFERENCES stocks(code) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_daily_code_time (code, trade_time),
    UNIQUE INDEX idx_daily_code_key (code, time_key)
);
```

---

## 🔄 API 变化

### 股票列表 API 返回格式变化

**优化前**:
```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "group_id": "tech",        // ❌ 已删除
  "group_name": "科技股",    // ❌ 已删除
  "market": "US"
}
```

**优化后**:
```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "market": "US",
  "market_cap": "large",
  "watch_level": "high"
}
```

### 获取股票分类的新方式

**使用分类API**:
```
GET /api/v1/categories/tree  // 获取分类树
GET /api/v1/categories/{category_id}/stocks  // 获取分类下的股票
```

---

## 🚀 执行迁移

### 步骤 1: 备份数据库
```bash
mysqldump -u root -p zhixing_trader > backup_$(date +%Y%m%d).sql
```

### 步骤 2: 执行迁移脚本
```bash
cd zhixing_backend
python scripts/migrate_database_schema.py
```

### 步骤 3: 验证结果
```bash
# 检查 quotes 表是否已删除
mysql -u root -p zhixing_trader -e "SHOW TABLES LIKE 'quotes';"

# 检查 stocks 表结构
mysql -u root -p zhixing_trader -e "DESCRIBE stocks;"

# 检查外键约束
mysql -u root -p zhixing_trader -e "
SELECT 
    TABLE_NAME, 
    CONSTRAINT_NAME, 
    REFERENCED_TABLE_NAME 
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'zhixing_trader' 
AND REFERENCED_TABLE_NAME = 'stocks';
"
```

---

## 📝 代码修改要点

### 不再使用的方法

```python
# ❌ 已删除
db_service.save_quote(quote_data)
db_service.get_latest_quotes(codes)
db_service.cleanup_old_quotes()
db_service.get_stocks_by_group(group_id)

# ❌ 参数变化
db_service.upsert_stock(stock_info, group_id, group_name)  # 旧
db_service.upsert_stock(stock_info)  # 新
```

### 获取最新价格的新方式

```python
# 从K线表获取最新价格
from app.repositories.kline_repository import KLineRepository

kline_repo = KLineRepository()
latest_prices = await kline_repo.get_latest_price_data(stock_codes)

# 返回格式
{
    'AAPL': {
        'price': 150.25,
        'change_percent': 2.5,
        'last_update': '2025-10-17 15:30:00'
    }
}
```

---

## ✅ 优化效果对比

| 指标 | 优化前 | 优化后 | 改进 |
|------|--------|--------|------|
| 数据表数量 | 28个 | 27个 | 删除1个冗余表 |
| stocks字段数 | 13个 | 11个 | 删除2个冗余字段 |
| 外键约束 | 0个 | 10个 | 保证数据完整性 |
| 唯一约束 | 有缺失 | 完善 | 防止重复数据 |
| 存储空间 | 较大 | 较小 | 删除历史快照 |
| 查询性能 | 一般 | 提升 | 索引优化 |

---

## ⚠️ 重要说明

1. **无兼容逻辑**: 按照用户要求，直接删除不合理设计，不保留兼容代码
2. **数据迁移**: 如有重要的 quotes 历史数据，需在迁移前导出
3. **API调整**: 前端需要适配新的返回格式

---

## 📚 相关文档

- 详细优化报告: `DATABASE_OPTIMIZATION.md`
- 迁移脚本: `scripts/migrate_database_schema.py`
- 数据模型: `app/models.py`

