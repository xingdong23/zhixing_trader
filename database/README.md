# 数据库Schema说明

本目录包含智行交易系统的所有数据库结构定义。

## 📁 文件说明

### 1. crypto_trading_schema.mysql.sql
**用途**: 加密货币交易模块数据库  
**对应模块**: `crypto_strategy_trading/`  
**主要表**:
- 交易策略配置
- 交易记录
- 回测结果

### 2. stock_strategy_trading_schema.mysql.sql
**用途**: 股票策略交易模块数据库  
**对应模块**: `stock_strategy_trading/`  
**主要表**:
- 策略定义
- 交易计划
- 执行记录
- 绩效统计

### 3. trading_journal_schema.mysql.sql
**用途**: 交易日志模块数据库  
**对应模块**: `stock_trading_journal/`  
**主要表**:
- 股票信息
- 分类管理
- 数据同步状态
- K线数据

## 🚀 使用方法

### 导入所有数据库

```bash
# 导入加密货币交易数据库
mysql -u root -p < database/schema/crypto_trading_schema.mysql.sql

# 导入股票策略交易数据库
mysql -u root -p < database/schema/stock_strategy_trading_schema.mysql.sql

# 导入交易日志数据库
mysql -u root -p < database/schema/trading_journal_schema.mysql.sql
```

### 单独导入

```bash
# 仅导入某个模块
mysql -u root -p database_name < database/schema/xxx_schema.mysql.sql
```

## ⚠️ 注意事项

1. **环境隔离**: 生产环境和开发环境使用不同的数据库名称
2. **备份**: 执行导入前请备份现有数据
3. **版本管理**: Schema文件应与代码版本保持一致
4. **权限**: 确保数据库用户有足够的权限执行DDL语句

## 📝 Schema更新流程

1. 在开发环境测试Schema变更
2. 更新对应的schema文件
3. 提交代码并注明变更内容
4. 在生产环境谨慎执行迁移

---

**最后更新**: 2025-11-05  
**维护人**: chengzheng

