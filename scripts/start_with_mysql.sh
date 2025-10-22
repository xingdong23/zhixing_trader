#!/bin/bash

# 智行交易系统启动脚本 - 强制使用MySQL
# 确保系统不会使用SQLite，避免内存问题

echo "🚀 启动智行交易系统..."

# 强制设置MySQL环境变量
export DATABASE_URL="mysql+pymysql://root:shuzhongren@101.42.14.209:3306/zhixing_trader"

echo "📊 数据库配置: $DATABASE_URL"

# 验证MySQL连接（可选）
echo "🔍 验证MySQL连接..."
python3 -c "
import sys
sys.path.append('./zhixing_backend')
from app.config import settings, validate_config

print(f'当前数据库URL: {settings.database_url}')

try:
    validate_config()
    print('✅ 配置验证通过 - MySQL配置正确')
except Exception as e:
    print(f'❌ 配置验证失败: {e}')
    exit(1)
"

if [ $? -ne 0 ]; then
    echo "❌ MySQL配置验证失败，请检查数据库配置"
    exit 1
fi

echo "✅ MySQL配置验证成功"
echo "🎯 系统已杜绝SQLite使用，强制使用MySQL"

# 启动后端服务
echo "🔧 启动后端服务..."
cd zhixing_backend
python run.py &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.dev.pid

# 启动前端服务
echo "🎨 启动前端服务..."
cd ../zhixing_fronted
npm run dev &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../frontend.dev.pid

echo "🎉 智行交易系统启动完成！"
echo "📊 后端服务: http://localhost:8000"
echo "🎨 前端服务: http://localhost:3000"
echo "💾 数据库: MySQL (已强制禁用SQLite)"

# 等待用户中断
wait
