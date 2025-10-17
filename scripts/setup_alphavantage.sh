#!/bin/bash
# Alpha Vantage 配置助手

echo "================================"
echo "🔧 Alpha Vantage 配置助手"
echo "================================"
echo ""

# 检查 .env 文件是否存在
if [ -f ".env" ]; then
    echo "✅ 找到现有 .env 文件"
    echo "📝 将追加 Alpha Vantage 配置..."
    echo ""
else
    echo "📝 创建新的 .env 文件..."
    echo ""
fi

# 检查是否已经配置过
if grep -q "ALPHA_VANTAGE_API_KEY" .env 2>/dev/null; then
    echo "⚠️  .env 文件中已存在 ALPHA_VANTAGE_API_KEY"
    echo ""
    read -p "是否覆盖? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 已取消"
        exit 1
    fi
    # 删除旧的配置
    sed -i.bak '/ALPHA_VANTAGE_API_KEY/d' .env
    sed -i.bak '/MARKET_DATA_PROVIDER/d' .env
    sed -i.bak '/PRIMARY_DATA_SOURCE/d' .env
    sed -i.bak '/YAHOO_RATE_LIMIT/d' .env
    sed -i.bak '/ALPHAVANTAGE_RATE_LIMIT/d' .env
fi

# 添加配置
cat >> .env << 'EOF'

# ==================== Alpha Vantage 配置 ====================
# API Key (免费申请: https://www.alphavantage.co/support/#api-key)
ALPHA_VANTAGE_API_KEY=AU1SKLJOOD36YINC

# 市场数据源配置
MARKET_DATA_PROVIDER=hybrid          # hybrid (推荐) | yahoo | alphavantage
PRIMARY_DATA_SOURCE=yahoo            # yahoo 优先，限流时切 alphavantage

# API 速率限制（秒）
YAHOO_RATE_LIMIT=0.2                 # 雅虎：0.2秒/次
ALPHAVANTAGE_RATE_LIMIT=12.0         # AV免费版：12秒/次（5次/分钟）
# ============================================================
EOF

echo "✅ 配置已添加到 .env 文件"
echo ""
echo "📝 配置内容："
echo "   ALPHA_VANTAGE_API_KEY=AU1SKLJOOD36YINC"
echo "   MARKET_DATA_PROVIDER=hybrid"
echo "   PRIMARY_DATA_SOURCE=yahoo"
echo ""
echo "🚀 下一步："
echo "   1. 重启后端服务:"
echo "      cd zhixing_backend"
echo "      python -m uvicorn app.main:app --reload --port 8000"
echo ""
echo "   2. 验证配置:"
echo "      curl http://localhost:8000/api/v1/data-sync/data-source/info"
echo ""
echo "✅ 配置完成！"

