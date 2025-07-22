#!/bin/bash

# 知行交易 - 富途API集成安装脚本
# 适用于 macOS M4 Pro

set -e

echo "🚀 开始设置富途API集成..."

# 检查系统
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ 此脚本仅支持 macOS 系统"
    exit 1
fi

# 检查架构
ARCH=$(uname -m)
if [[ "$ARCH" != "arm64" ]]; then
    echo "⚠️  警告: 检测到非 ARM64 架构 ($ARCH)，可能需要额外配置"
fi

echo "✅ 系统检查通过: macOS $ARCH"

# 1. 检查 Node.js
echo "📦 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    echo "   推荐使用: brew install node"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低 (当前: $(node -v))，需要 18+"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 2. 安装后端依赖
echo "📦 安装后端API服务依赖..."
cd api-server
npm install
echo "✅ 后端依赖安装完成"

# 3. 创建环境配置
echo "⚙️  创建环境配置..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ 已创建 .env 配置文件"
    echo "📝 请编辑 api-server/.env 文件，配置您的富途账户信息"
else
    echo "⚠️  .env 文件已存在，跳过创建"
fi

# 4. 创建数据目录
echo "📁 创建数据目录..."
mkdir -p data
mkdir -p logs
echo "✅ 数据目录创建完成"

# 5. 构建项目
echo "🔨 构建后端项目..."
npm run build
echo "✅ 后端项目构建完成"

cd ..

# 6. 安装前端依赖（如果需要）
echo "📦 检查前端依赖..."
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
    echo "✅ 前端依赖安装完成"
else
    echo "✅ 前端依赖已存在"
fi

# 7. 创建启动脚本
echo "📝 创建启动脚本..."

# 后端启动脚本
cat > start-api-server.sh << 'EOF'
#!/bin/bash
echo "🚀 启动知行交易API服务器..."
cd api-server
npm run dev
EOF

# 前端启动脚本
cat > start-frontend.sh << 'EOF'
#!/bin/bash
echo "🚀 启动知行交易前端应用..."
npm run dev
EOF

# 完整启动脚本
cat > start-all.sh << 'EOF'
#!/bin/bash
echo "🚀 启动知行交易完整系统..."

# 检查富途OpenD是否运行
if ! nc -z 127.0.0.1 11111 2>/dev/null; then
    echo "❌ 富途OpenD未运行，请先启动富途OpenD"
    echo "   下载地址: https://openapi.futunn.com/futu-api-doc/intro/intro.html"
    exit 1
fi

echo "✅ 富途OpenD连接正常"

# 启动后端API服务器
echo "🔧 启动后端API服务器..."
cd api-server
npm run dev &
API_PID=$!
cd ..

# 等待API服务器启动
echo "⏳ 等待API服务器启动..."
sleep 5

# 检查API服务器是否启动成功
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ API服务器启动成功"
else
    echo "❌ API服务器启动失败"
    kill $API_PID 2>/dev/null
    exit 1
fi

# 启动前端应用
echo "🎨 启动前端应用..."
npm run dev &
FRONTEND_PID=$!

echo "🎉 系统启动完成!"
echo "📊 前端应用: http://localhost:3000"
echo "🔧 API服务器: http://localhost:3001"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap 'echo "🛑 正在停止服务..."; kill $API_PID $FRONTEND_PID 2>/dev/null; exit 0' INT
wait
EOF

chmod +x start-api-server.sh start-frontend.sh start-all.sh

echo "✅ 启动脚本创建完成"

# 8. 创建富途OpenD配置文件模板
echo "📄 创建富途OpenD配置文件模板..."
cat > FutuOpenD.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<FutuOpenD>
    <Common>
        <LocalIP>127.0.0.1</LocalIP>
        <LocalPort>11111</LocalPort>
        <LogLevel>info</LogLevel>
        <LogDir>./logs</LogDir>
    </Common>
    <TradeServer>
        <Enable>true</Enable>
        <IP>openapi.futunn.com</IP>
        <Port>443</Port>
    </TradeServer>
    <QuoteServer>
        <Enable>true</Enable>
        <IP>openapi.futunn.com</IP>
        <Port>443</Port>
    </QuoteServer>
</FutuOpenD>
EOF

echo "✅ 富途OpenD配置文件模板创建完成"

# 9. 显示下一步操作
echo ""
echo "🎉 富途API集成设置完成!"
echo ""
echo "📋 下一步操作:"
echo "1. 下载并安装富途OpenD:"
echo "   https://openapi.futunn.com/futu-api-doc/intro/intro.html"
echo ""
echo "2. 配置富途账户信息:"
echo "   编辑 api-server/.env 文件"
echo "   设置 FUTU_USERNAME 和 FUTU_PASSWORD"
echo ""
echo "3. 启动富途OpenD:"
echo "   ./FutuOpenD -cfg_file=FutuOpenD.xml"
echo ""
echo "4. 启动知行交易系统:"
echo "   ./start-all.sh"
echo ""
echo "🔧 单独启动服务:"
echo "   后端API: ./start-api-server.sh"
echo "   前端应用: ./start-frontend.sh"
echo ""
echo "📚 更多信息请查看:"
echo "   api-server/README.md"
echo ""
echo "✨ 祝您交易愉快!"
