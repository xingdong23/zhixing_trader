# Market Data Service 集成指南

如何在其他项目中集成和使用Market Data Service模块。

## 🎯 集成方式

### 方式1: 作为Python包（推荐）

在你的项目中直接导入使用。

#### 步骤1: 添加到Python路径

```python
# 在你的项目代码中
import sys
from pathlib import Path

# 添加market_data_service到路径
market_data_path = Path(__file__).parent.parent / 'market_data_service'
sys.path.insert(0, str(market_data_path))
```

#### 步骤2: 导入和使用

```python
from market_data import MultiProviderStrategy
from config import settings

# 创建数据服务实例
data_service = MultiProviderStrategy()

# 使用
async def get_stock_data(symbol: str):
    return await data_service.get_stock_data(symbol, period="1mo")
```

---

### 方式2: 作为Git Submodule

将market_data_service作为子模块添加到你的项目。

```bash
cd your_project
git submodule add https://github.com/your/market_data_service.git
git submodule update --init --recursive
```

---

### 方式3: 创建独立的数据服务API

将market_data_service部署为独立的微服务。

#### 创建FastAPI服务

```python
# market_data_service/api_server.py
from fastapi import FastAPI, HTTPException
from market_data import MultiProviderStrategy
from typing import Optional

app = FastAPI(title="Market Data Service")
strategy = MultiProviderStrategy()

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/v1/kline/{symbol}")
async def get_kline(
    symbol: str,
    period: str = "1mo",
    interval: str = "1d"
):
    try:
        data = await strategy.get_stock_data(symbol, period, interval)
        return {"symbol": symbol, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/quote/{symbol}")
async def get_quote(symbol: str):
    try:
        data = await strategy.get_quote(symbol)
        return {"symbol": symbol, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/info/{symbol}")
async def get_stock_info(symbol: str):
    try:
        data = await strategy.get_stock_info(symbol)
        return {"symbol": symbol, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

#### 在客户端调用

```python
import requests

BASE_URL = "http://localhost:8001"

def get_stock_data(symbol: str):
    response = requests.get(f"{BASE_URL}/api/v1/kline/{symbol}")
    return response.json()
```

---

## 🔧 在zhixing_backend中集成

### 当前目录结构

```
zhixing_trader/
├── market_data_service/        # 独立的数据服务模块
│   ├── market_data/
│   ├── config.py
│   ├── requirements.txt
│   └── README.md
├── zhixing_backend/            # 主后端服务
│   ├── app/
│   │   ├── core/
│   │   │   └── (market_data已删除)
│   │   └── ...
│   └── ...
└── zhixing_fronted/
```

### 修改zhixing_backend中的导入

#### 原代码（旧）

```python
# zhixing_backend/app/某个文件.py
from app.core.market_data import YahooFinanceProvider
from app.core.market_data import MultiProviderStrategy
```

#### 新代码（修改后）

```python
# zhixing_backend/app/某个文件.py
import sys
from pathlib import Path

# 添加market_data_service到路径
market_data_service_path = Path(__file__).parent.parent.parent / 'market_data_service'
sys.path.insert(0, str(market_data_service_path))

from market_data import YahooFinanceProvider
from market_data import MultiProviderStrategy
```

#### 或者创建一个统一的导入辅助文件

```python
# zhixing_backend/app/utils/market_data_helper.py
import sys
from pathlib import Path

# 添加market_data_service到路径
_market_data_path = Path(__file__).parent.parent.parent.parent / 'market_data_service'
if str(_market_data_path) not in sys.path:
    sys.path.insert(0, str(_market_data_path))

# 重新导出
from market_data import (
    YahooFinanceProvider,
    AlphaVantageProvider,
    FinnhubProvider,
    TwelveDataProvider,
    MultiProviderStrategy,
    MultiAccountProvider,
    HybridProvider,
    ScenarioRouter,
)

__all__ = [
    'YahooFinanceProvider',
    'AlphaVantageProvider',
    'FinnhubProvider',
    'TwelveDataProvider',
    'MultiProviderStrategy',
    'MultiAccountProvider',
    'HybridProvider',
    'ScenarioRouter',
]
```

然后在其他文件中：

```python
# zhixing_backend/app/xxx.py
from app.utils.market_data_helper import MultiProviderStrategy
```

---

## 📦 配置管理

### 共享配置

如果zhixing_backend和market_data_service需要共享API Key配置：

#### 选项1: 共享.env文件

```bash
# 在项目根目录创建.env
zhixing_trader/.env

# market_data_service/config.py 从根目录读取
from pathlib import Path
root_env = Path(__file__).parent.parent / '.env'
```

#### 选项2: 环境变量

```bash
# 在系统环境变量中设置
export ALPHA_VANTAGE_API_KEY_1=xxx
export ALPHA_VANTAGE_API_KEY_2=xxx
```

#### 选项3: 配置服务

使用配置中心（如Consul, etcd）统一管理配置。

---

## 🧪 测试

### 测试market_data_service是否正常工作

```bash
cd market_data_service
python examples/quick_start.py
```

### 测试zhixing_backend集成

```bash
cd zhixing_backend
python -c "
from app.utils.market_data_helper import MultiProviderStrategy
import asyncio

async def test():
    strategy = MultiProviderStrategy()
    data = await strategy.get_stock_data('AAPL', period='5d')
    print(f'获取到 {len(data)} 条数据')

asyncio.run(test())
"
```

---

## 🔄 版本管理

### 独立版本控制

market_data_service可以有自己的版本号：

```python
# market_data_service/market_data/__init__.py
__version__ = '1.0.0'
```

### 依赖管理

在zhixing_backend的requirements.txt中：

```bash
# zhixing_backend/requirements.txt

# ... 其他依赖 ...

# Market Data Service依赖
-r ../market_data_service/requirements.txt
```

或者：

```bash
# 单独安装market_data_service的依赖
pip install -r ../market_data_service/requirements.txt
```

---

## 📝 最佳实践

### 1. 依赖隔离

market_data_service只包含数据获取相关的依赖，不依赖zhixing_backend的任何代码。

### 2. 接口稳定

market_data_service提供稳定的接口（IMarketDataProvider），避免频繁修改。

### 3. 错误处理

在zhixing_backend中调用market_data_service时，做好异常处理：

```python
try:
    data = await data_service.get_stock_data(symbol)
    if data:
        # 处理数据
        pass
    else:
        # 记录日志
        logger.warning(f"未能获取{symbol}的数据")
except Exception as e:
    logger.error(f"数据获取异常: {e}")
    # 使用降级策略
```

### 4. 日志管理

market_data_service使用loguru记录日志，可以配置日志输出到不同文件：

```python
# market_data_service/config.py
LOG_FILE = "logs/market_data_service.log"
```

### 5. 缓存策略

利用market_data_service的缓存机制减少API调用：

```python
# 启用缓存
ENABLE_CACHE = True
CACHE_TTL_KLINE = 3600  # K线缓存1小时
```

---

## 🚀 部署建议

### 开发环境

直接作为Python包导入使用。

### 生产环境

#### 选项1: 嵌入式部署

将market_data_service作为zhixing_backend的一部分部署。

#### 选项2: 独立服务

将market_data_service部署为独立的微服务：

```bash
# 启动数据服务API
cd market_data_service
uvicorn api_server:app --host 0.0.0.0 --port 8001

# zhixing_backend通过HTTP调用
```

#### 选项3: Docker部署

```dockerfile
# market_data_service/Dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "8001"]
```

---

## 📞 支持

如有问题，请查看：
- [README.md](README.md) - 基本使用
- [API文档](docs/) - 详细API说明
- 提交Issue到项目仓库

---

**总结**: market_data_service作为独立模块，可以被任何项目灵活集成使用，同时保持代码的清晰和可维护性。


