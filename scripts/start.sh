#!/bin/bash

# 知行交易系统启动脚本
# 提供统一的启动入口

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🎯 知行交易系统启动器"
echo "=" * 50

show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  backend     启动后端API服务器"
    echo "  frontend    启动前端开发服务器"
    echo "  both        同时启动前端和后端"
    echo "  help        显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 backend   # 只启动后端"
    echo "  $0 frontend  # 只启动前端"
    echo "  $0 both      # 同时启动前后端"
}

start_backend() {
    echo "🚀 启动后端服务器..."
    cd "$PROJECT_ROOT"
    python3 scripts/start_backend.py
}

start_frontend() {
    echo "🚀 启动前端开发服务器..."
    cd "$PROJECT_ROOT"
    npm run dev
}

start_both() {
    echo "🚀 同时启动前端和后端..."
    echo "注意: 后端将在后台运行，前端在前台运行"
    
    # 启动后端（后台）
    cd "$PROJECT_ROOT"
    python3 scripts/start_backend.py &
    BACKEND_PID=$!
    
    # 等待后端启动
    sleep 3
    
    # 启动前端（前台）
    npm run dev
    
    # 清理后端进程
    kill $BACKEND_PID 2>/dev/null || true
}

case "${1:-help}" in
    backend)
        start_backend
        ;;
    frontend)
        start_frontend
        ;;
    both)
        start_both
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "❌ 未知选项: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
