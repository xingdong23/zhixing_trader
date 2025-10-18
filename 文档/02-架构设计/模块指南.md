# 模块开发指南

本文档说明如何在智行交易系统中开发新模块。

## 模块化设计理念

智行交易系统采用**模块化单体仓库(Modular Monorepo)**架构：

- ✅ 所有模块在同一个根目录下
- ✅ 每个模块独立开发和部署
- ✅ 模块间通过API通信，松耦合
- ✅ 共享开发规范和工具链

## 现有模块

| 模块名称 | 端口 | 功能 | 状态 |
|---------|------|------|------|
| zhixing_backend | 8000 | 股票量化交易 | ✅ 运行中 |
| bitcoin_trader | 8001 | 加密货币交易 | ✅ 新建 |
| zhixing_fronted | 3000 | 前端界面 | ✅ 运行中 |
| sentiment_monitor | 8002 | 舆情监控 | 📋 规划中 |

## 创建新模块步骤

### 1. 创建模块目录

```bash
cd zhixing_trader
mkdir your_module_name
cd your_module_name
```

### 2. 按照标准结构创建文件

```
your_module_name/
├── app/                      # 应用代码
│   ├── __init__.py
│   ├── main.py              # FastAPI应用入口
│   ├── config.py            # 配置管理
│   ├── models.py            # 数据模型
│   │
│   ├── api/                 # API路由
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── endpoint1.py
│   │       └── endpoint2.py
│   │
│   ├── core/                # 核心业务逻辑
│   │   ├── __init__.py
│   │   └── business_logic.py
│   │
│   ├── services/            # 业务服务层
│   │   ├── __init__.py
│   │   └── service.py
│   │
│   └── repositories/        # 数据访问层
│       ├── __init__.py
│       └── repository.py
│
├── scripts/                 # 工具脚本
│   ├── init_database.py
│   └── migrate.py
│
├── tests/                   # 测试代码
│   ├── __init__.py
│   ├── test_api.py
│   └── test_services.py
│
├── docs/                    # 模块文档
│   ├── README.md
│   ├── API.md
│   └── ARCHITECTURE.md
│
├── .env.example            # 环境变量示例
├── .gitignore              # Git忽略文件
├── requirements.txt        # Python依赖
├── pytest.ini              # 测试配置
├── README.md               # 模块说明
└── run.py                  # 启动脚本
```

### 3. 实现核心文件

#### 3.1 `app/main.py` - 应用入口

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.v1 import router_v1

app = FastAPI(
    title="Your Module Name",
    description="模块描述",
    version="0.1.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(router_v1, prefix="/api/v1")

@app.get("/")
async def root():
    return {"status": "ok", "service": "Your Module"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

#### 3.2 `app/config.py` - 配置管理

```python
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "YourModule"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_PORT: int = 8002  # 使用不同的端口
    
    # 数据库配置
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "your_module_db"
    
    @property
    def database_url(self) -> str:
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

#### 3.3 `run.py` - 启动脚本

```python
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    import uvicorn
    from app.config import settings
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.API_PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
```

#### 3.4 `requirements.txt` - 依赖管理

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
pydantic-settings==2.1.0
sqlalchemy==2.0.23
pymysql==1.1.0
redis==5.0.1
python-dotenv==1.0.0
pytest==7.4.3
```

### 4. 环境变量配置

创建 `.env.example`:

```env
# 应用配置
APP_NAME=YourModule
APP_ENV=development
DEBUG=True
API_PORT=8002

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=your_module_db

# 日志配置
LOG_LEVEL=INFO
LOG_DIR=logs
```

### 5. 编写README

创建模块的 `README.md`，说明：
- 模块功能和特性
- 技术栈
- 快速开始
- API文档
- 配置说明

### 6. 更新根目录文档

在根目录的 `README.md` 中添加新模块说明：

```markdown
### N. your_module_name - 模块名称

**功能特性**:
- 功能1
- 功能2

**端口**: 8002

**快速开始**:
\`\`\`bash
cd your_module_name
pip install -r requirements.txt
python run.py
\`\`\`
```

## 模块开发规范

### API设计规范

1. **RESTful风格**
   - GET: 查询资源
   - POST: 创建资源
   - PUT: 更新资源
   - DELETE: 删除资源

2. **统一响应格式**
   ```json
   {
     "status": "success" | "error",
     "data": {...},
     "message": "操作描述",
     "timestamp": "2025-10-17T00:00:00"
   }
   ```

3. **版本化**
   - API路径包含版本号: `/api/v1/`
   - 向后兼容

4. **错误处理**
   - 使用合适的HTTP状态码
   - 提供详细的错误信息

### 代码规范

1. **Python代码规范**
   - 遵循 PEP 8
   - 使用类型提示
   - 编写docstring

2. **项目结构**
   - 按功能分层(API、Service、Repository)
   - 单一职责原则
   - 依赖注入

3. **测试**
   - 单元测试覆盖核心逻辑
   - API集成测试
   - 使用pytest

### 数据库规范

1. **独立数据库**
   - 每个模块使用独立的数据库或Schema
   - 不直接访问其他模块的数据库

2. **数据模型**
   - 使用SQLAlchemy ORM
   - 定义清晰的表结构
   - 创建必要的索引

3. **迁移管理**
   - 使用Alembic管理数据库迁移
   - 提供初始化脚本

### 配置管理

1. **环境变量**
   - 敏感信息通过环境变量配置
   - 提供 `.env.example` 示例
   - 使用 pydantic-settings 管理配置

2. **配置分层**
   - 开发环境配置
   - 测试环境配置
   - 生产环境配置

### 日志规范

1. **日志级别**
   - DEBUG: 调试信息
   - INFO: 关键流程
   - WARNING: 警告信息
   - ERROR: 错误信息

2. **日志格式**
   ```
   [时间] [级别] [模块] - 日志内容
   ```

## 模块间通信

### HTTP API调用

模块间通过HTTP API通信：

```python
import httpx

async def call_other_module():
    async with httpx.AsyncClient() as client:
        response = await client.get("http://localhost:8000/api/v1/stocks")
        return response.json()
```

### 事件驱动(可选)

使用消息队列进行异步通信：

```python
# 发布事件
await event_bus.publish("stock.updated", data)

# 订阅事件
@event_bus.subscribe("stock.updated")
async def handle_stock_update(data):
    # 处理逻辑
    pass
```

## 部署指南

### 开发环境

```bash
cd your_module
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

### Docker部署

创建 `Dockerfile`:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "run.py"]
```

### docker-compose

在根目录创建或更新 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  your_module:
    build: ./your_module_name
    ports:
      - "8002:8002"
    environment:
      - DB_HOST=mysql
      - REDIS_HOST=redis
    depends_on:
      - mysql
      - redis
```

## 示例模块

参考现有模块的实现：

- **股票交易模块**: `zhixing_backend/`
- **比特币交易模块**: `bitcoin_trader/`

## 常见问题

### Q: 如何选择端口号？
A: 按模块顺序递增：
- 8000: zhixing_backend
- 8001: bitcoin_trader
- 8002: sentiment_monitor
- 8003: 下一个模块

### Q: 是否需要共享代码？
A: 如果有共享代码，可以创建 `common/` 目录存放通用工具和库。

### Q: 如何处理跨模块的数据依赖？
A: 通过API调用，不直接访问其他模块的数据库。

### Q: 测试如何运行？
A: 在模块目录下执行 `pytest`。

## 检查清单

新模块创建完成后，检查：

- [ ] 目录结构完整
- [ ] README.md 文档完善
- [ ] 环境变量示例(.env.example)
- [ ] requirements.txt 依赖清单
- [ ] API文档(自动生成/docs)
- [ ] 单元测试
- [ ] 数据库初始化脚本
- [ ] .gitignore 配置
- [ ] 根目录README更新
- [ ] 端口不冲突
- [ ] 健康检查接口(/health)

## 获取帮助

- 查看现有模块代码
- 阅读项目架构文档 `ARCHITECTURE.md`
- 提出Issue讨论

---

祝开发顺利！🚀

