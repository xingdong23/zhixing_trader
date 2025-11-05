#!/usr/bin/env python3
"""
Quant Trading 启动脚本
"""
import os
import sys
import uvicorn


def main():
    # 使用当前目录作为工作目录
    current_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(current_dir)
    if current_dir not in sys.path:
        sys.path.insert(0, current_dir)
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8002,  # quant_trading使用8002端口
        reload=False,
        log_level="info",
    )


if __name__ == "__main__":
    main()

