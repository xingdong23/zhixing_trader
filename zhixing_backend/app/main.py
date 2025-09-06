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

from .config import settings
from .database import db_service
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

    task = None
    try:
        import os
        os.makedirs("data", exist_ok=True)
        os.makedirs("logs", exist_ok=True)

        container.initialize()

        task = asyncio.create_task(background_tasks())

        logger.info("✅ API Server started successfully")
        yield

    except Exception as e:
        logger.exception(f"❌ Failed to start server: {e}")
        raise

    finally:
        logger.info("🛑 Shutting down API Server...")
        try:
            if task:
                task.cancel()
        except Exception:
            logger.exception("Cancel background task error")
        try:
            db_service.close()
        except Exception:
            logger.exception("DB close error")
        logger.info("✅ API Server shutdown completed")


# 创建FastAPI应用
app = FastAPI(
    title="知行交易 API 服务",
    description="智能股票交易系统API服务",
    version="1.0.0",
    lifespan=lifespan
)

# 配置CORS - 允许前端开发服务器和生产环境
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js 开发服务器
        "http://localhost:3001",  # 可能的其他端口
        "http://localhost:3002",  # 前端配置的端口
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001", 
        "http://127.0.0.1:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(api_router, prefix="/api/v1")


# 健康检查
@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "server_version": "1.0.0"
        },
        "message": "API server is healthy",
        "timestamp": datetime.utcnow().isoformat()
    }


# 调试端点
@app.get("/api/debug/echo")
async def debug_echo():
    import os, sys, socket
    return {
        "success": True,
        "data": {
            "cwd": os.getcwd(),
            "sys_path": sys.path,
            "host_config": settings.api_host,
            "port_config": settings.api_port,
            "hostname": socket.gethostname(),
            "ips": socket.gethostbyname_ex(socket.gethostname())[2],
        },
    }

# API状态
@app.get("/api/status")
async def get_status():
    """获取API状态"""
    try:
        db_stats = db_service.get_stats()

        status_data = {
            "server": {
                "version": "1.0.0",
                "debug": settings.debug,
            },
            "database": db_stats,
        }

        return {
            "success": True,
            "data": status_data,
            "message": "API status retrieved successfully",
            "timestamp": datetime.utcnow().isoformat()
        }
        
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

# 处理OPTIONS请求（确保返回适当的CORS头由中间件添加）
@app.options("/{path:path}")
async def options_handler(path: str):
    return {"ok": True}


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
