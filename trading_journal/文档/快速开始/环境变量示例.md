# 环境变量配置示例

创建 `.env` 文件并添加以下配置：

```bash
# 数据库配置
DATABASE_URL=mysql+pymysql://root:password@127.0.0.1:3306/zhixing_trader

# Alpha Vantage API配置
# 免费API Key申请地址: https://www.alphavantage.co/support/#api-key
ALPHA_VANTAGE_API_KEY=demo

# 市场数据源配置
# 可选值: yahoo, alphavantage, hybrid
MARKET_DATA_PROVIDER=hybrid

# 主要数据源（hybrid模式下生效）
# 可选值: yahoo, alphavantage
PRIMARY_DATA_SOURCE=yahoo

# API速率限制（秒）
YAHOO_RATE_LIMIT=0.2
ALPHAVANTAGE_RATE_LIMIT=12.0

# 富途OpenAPI配置（可选）
FUTU_HOST=127.0.0.1
FUTU_PORT=11111
FUTU_USERNAME=
FUTU_PASSWORD=

# 服务器配置
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True

# 日志配置
LOG_LEVEL=INFO
LOG_FILE=./logs/api.log
```

## 快速开始

1. **复制示例配置**
   ```bash
   cp ENV_EXAMPLE.md .env
   ```

2. **获取 Alpha Vantage API Key**
   - 访问 https://www.alphavantage.co/support/#api-key
   - 免费注册获取API Key
   - 将API Key填入 `.env` 文件的 `ALPHA_VANTAGE_API_KEY` 字段

3. **配置数据库连接**
   - 修改 `DATABASE_URL` 中的用户名、密码和数据库名

4. **选择数据源策略**
   - `yahoo`: 仅使用雅虎财经（免费、不限额，但可能被限流）
   - `alphavantage`: 仅使用Alpha Vantage（需要API Key，免费版5次/分钟）
   - `hybrid`: 混合模式（推荐）- 优先使用雅虎，失败时自动切换到Alpha Vantage

## 数据源对比

| 特性 | 雅虎财经 | Alpha Vantage | 混合模式 |
|------|---------|---------------|----------|
| 免费额度 | 不限 | 5次/分钟 | - |
| 数据质量 | 高 | 高 | 高 |
| 稳定性 | 中（可能限流） | 高 | 极高 |
| 推荐场景 | 个人测试 | 生产环境 | 生产环境（推荐） |

## 推荐配置

### 个人开发测试
```
MARKET_DATA_PROVIDER=yahoo
```

### 生产环境
```
MARKET_DATA_PROVIDER=hybrid
PRIMARY_DATA_SOURCE=yahoo
ALPHA_VANTAGE_API_KEY=<你的真实API Key>
```

这样配置后，系统会优先使用免费的雅虎财经，只在雅虎限流时才使用Alpha Vantage，最大化利用免费额度。

