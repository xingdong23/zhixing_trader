#!/usr/bin/env python3
"""
简化启动脚本
"""
import uvicorn

if __name__ == "__main__":
    print("🚀 启动知行交易后端服务...")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
