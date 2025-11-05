#!/bin/bash
# 一键修复provider文件的导入问题

echo "=========================================="
echo "修复Market Data Service Provider文件"
echo "=========================================="

cd "$(dirname "$0")"

echo ""
echo "步骤1: 从zhixing_backend重新复制原始文件..."
cp ../zhixing_backend/app/core/market_data/*.py market_data/providers/
echo "✅ 文件复制完成"

echo ""
echo "步骤2: 修复导入语句..."
cd market_data/providers

for file in *.py; do
    if [ -f "$file" ]; then
        # 修复interfaces导入
        sed -i '' 's/from app\.core\.interfaces/from ..interfaces/g' "$file"
        
        # 移除StockInfo导入，添加Dict导入
        sed -i '' 's/from app\.models import StockInfo/# StockInfo removed/g' "$file"
        
        # 确保有Dict导入
        if grep -q "from typing import" "$file"; then
            sed -i '' 's/from typing import \(.*\)/from typing import \1, Dict/g' "$file"
            sed -i '' 's/Dict, Dict/Dict/g' "$file"  # 去重
        fi
        
        echo "✅ 修复: $file"
    fi
done

echo ""
echo "步骤3: 修复StockInfo返回类型..."

# 修复finnhub_provider.py
if [ -f "finnhub_provider.py" ]; then
    sed -i '' 's/Optional\[StockInfo\]/Optional[Dict]/g' "finnhub_provider.py"
    echo "✅ 修复返回类型: finnhub_provider.py"
fi

# 修复twelvedata_provider.py
if [ -f "twelvedata_provider.py" ]; then
    sed -i '' 's/Optional\[StockInfo\]/Optional[Dict]/g' "twelvedata_provider.py"
    echo "✅ 修复返回类型: twelvedata_provider.py"
fi

# 修复multi_provider.py
if [ -f "multi_provider.py" ]; then
    sed -i '' 's/Optional\[StockInfo\]/Optional[Dict]/g' "multi_provider.py"
    echo "✅ 修复返回类型: multi_provider.py"
fi

# 修复multi_account_provider.py
if [ -f "multi_account_provider.py" ]; then
    sed -i '' 's/Optional\[StockInfo\]/Optional[Dict]/g' "multi_account_provider.py"
    echo "✅ 修复返回类型: multi_account_provider.py"
fi

# 修复scenario_router.py
if [ -f "scenario_router.py" ]; then
    sed -i '' 's/Optional\[StockInfo\]/Optional[Dict]/g' "scenario_router.py"
    echo "✅ 修复返回类型: scenario_router.py"
fi

cd ../..

echo ""
echo "步骤4: 清理__pycache__..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
echo "✅ 清理完成"

echo ""
echo "=========================================="
echo "✅ 修复完成！"
echo "=========================================="
echo ""
echo "下一步:"
echo "1. 运行验证脚本:"
echo "   python verify_setup.py"
echo ""
echo "2. 运行示例:"
echo "   python examples/quick_start.py"
echo ""


