"""
知行交易 Python API 服务主应用
"""
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import uvicorn

from .config import settings, validate_config, ensure_directories
from .database import db_service
from .models import ApiResponse
from .api.v1.api import api_router
from .core.container import container


# 简化的后台任务
async def background_tasks():
    """后台定时任务"""
    while True:
        try:
            # 每小时检查一次系统状态
            logger.debug("🔄 系统状态检查")

            # 等待下次检查
            await asyncio.sleep(3600)  # 1小时

        except Exception as e:
            logger.error(f"后台任务错误: {e}")
            await asyncio.sleep(300)  # 出错时等待5分钟再重试


# 应用生命周期管理
@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动和关闭时的处理"""
    # 启动时
    logger.info("🚀 Starting Zhixing Trader API Server...")
    
    try:
        # 验证配置
        validate_config()
        
        # 确保目录存在
        ensure_directories()

        # 初始化依赖注入容器
        container.initialize()

        # 启动后台任务
        task = asyncio.create_task(background_tasks())

        logger.info("✅ API Server started successfully")
        
        yield
        
    except Exception as e:
        logger.error(f"❌ Failed to start server: {e}")
        raise
    
    finally:
        # 关闭时
        logger.info("🛑 Shutting down API Server...")
        
        # 取消后台任务
        if 'task' in locals():
            task.cancel()

        # 关闭数据库连接
        db_service.close()
        
        logger.info("✅ API Server shutdown completed")


# 创建FastAPI应用
app = FastAPI(
    title="知行交易 API 服务",
    description="基于富途OpenAPI的股票数据服务",
    version="1.0.0",
    lifespan=lifespan
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(api_router, prefix="/api/v1")


# 健康检查
@app.get("/api/health", response_model=ApiResponse)
async def health_check():
    """健康检查"""
    return ApiResponse(
        success=True,
        data={
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "futu_connected": futu_client.is_connected,
        },
        message="API server is healthy",
        timestamp=datetime.utcnow().isoformat()
    )


# API状态
@app.get("/api/status", response_model=ApiResponse)
async def get_status():
    """获取API状态"""
    try:
        db_stats = db_service.get_stats()
        futu_status = futu_client.get_status()
        
        status_data = {
            "server": {
                "version": "1.0.0",
                "debug": settings.debug,
            },
            "futu": futu_status,
            "database": db_stats,
        }
        
        return ApiResponse(
            success=True,
            data=status_data,
            message="API status retrieved successfully",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to get API status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve API status: {str(e)}"
        )


# 404处理
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def catch_all(path: str):
    """捕获所有未匹配的路由"""
    raise HTTPException(
        status_code=404,
        detail=f"Route /{path} not found"
    )


# 启动服务器
def start_server():
    """启动服务器"""
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )


if __name__ == "__main__":
    start_server()
