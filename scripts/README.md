# 项目脚本目录

本目录包含项目级别的通用脚本和工具。

## 脚本说明

### 数据源配置

- **setup_alphavantage.sh** - Alpha Vantage 数据源配置脚本
  - 用途：配置 Alpha Vantage API 密钥和相关设置
  - 使用：`./scripts/setup_alphavantage.sh`

### 服务启动

- **start_with_mysql.sh** - 带 MySQL 检查的启动脚本
  - 用途：启动服务前检查 MySQL 连接
  - 使用：`./scripts/start_with_mysql.sh`

## 模块专用脚本

各模块的专用脚本在各自的模块目录下：

- **股票交易模块**: `zhixing_backend/scripts/`
- **比特币交易模块**: `bitcoin_trader/scripts/`

## 使用方法

1. 给脚本添加执行权限：
   ```bash
   chmod +x scripts/*.sh
   ```

2. 执行脚本：
   ```bash
   ./scripts/script_name.sh
   ```

## 添加新脚本

新增项目级别的脚本时：
1. 将脚本放在本目录
2. 添加执行权限
3. 更新本 README
4. 添加必要的注释说明

## 注意事项

- 脚本应该有良好的错误处理
- 添加必要的帮助信息
- 使用相对路径或环境变量
- 不要硬编码敏感信息

