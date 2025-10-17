"""
Quant Trading API Server
股票量化交易主服务
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import sys

from .config import settings
from .database import DatabaseService
from .api.v1.api import api_router


# 配置日志
logger.remove()
logger.add(
    sys.stderr,
    level=settings.log_level,
    format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动
    logger.info("🚀 Starting Quant Trading API Server...")
    
    # 初始化数据库
    db_service = DatabaseService()
    db_service.init_database()
    
    logger.info("✅ Quant Trading API Server started successfully")
    
    yield
    
    # 关闭
    logger.info("🛑 Shutting down Quant Trading API Server...")
    db_service.close()
    logger.info("✅ Quant Trading API Server shutdown completed")


# 创建FastAPI应用
app = FastAPI(
    title="Quant Trading API",
    description="股票量化交易系统 - 策略开发、回测和实盘交易",
    version=settings.app_version,
    lifespan=lifespan
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/")
def root():
    """根路径"""
    return {
        "service": "Quant Trading API",
        "version": settings.app_version,
        "status": "running"
    }


@app.get("/health")
def health_check():
    """健康检查"""
    return {"status": "healthy"}

