#!/usr/bin/env python3
"""
知行交易 API 服务启动脚本
"""
import sys
import os

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import start_server

if __name__ == "__main__":
    start_server()
