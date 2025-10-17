"""
Bitcoin Trader - 主应用入口
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.api.v1 import trading, market, strategy, backtest
from app.core.exchanges.exchange_manager import ExchangeManager

# 配置日志
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时执行
    logger.info("🚀 Bitcoin Trader 启动中...")
    
    # 初始化交易所管理器
    exchange_manager = ExchangeManager()
    app.state.exchange_manager = exchange_manager
    
    logger.info("✅ Bitcoin Trader 启动成功")
    
    yield
    
    # 关闭时执行
    logger.info("🛑 Bitcoin Trader 关闭中...")
    await exchange_manager.close_all()
    logger.info("✅ Bitcoin Trader 已关闭")


# 创建FastAPI应用
app = FastAPI(
    title="Bitcoin Trader API",
    description="比特币量化交易系统API",
    version="0.1.0",
    lifespan=lifespan
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境需要配置具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(
    trading.router,
    prefix="/api/v1/trading",
    tags=["交易"]
)

app.include_router(
    market.router,
    prefix="/api/v1/market",
    tags=["行情"]
)

app.include_router(
    strategy.router,
    prefix="/api/v1/strategy",
    tags=["策略"]
)

app.include_router(
    backtest.router,
    prefix="/api/v1/backtest",
    tags=["回测"]
)


@app.get("/")
async def root():
    """健康检查"""
    return {
        "status": "ok",
        "service": "Bitcoin Trader",
        "version": "0.1.0",
        "environment": settings.APP_ENV
    }


@app.get("/health")
async def health_check():
    """健康检查详情"""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: 实际检查数据库连接
        "redis": "connected",     # TODO: 实际检查Redis连接
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.API_PORT,
        reload=settings.DEBUG
    )

