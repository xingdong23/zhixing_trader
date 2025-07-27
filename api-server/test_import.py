#!/usr/bin/env python3
"""
测试导入和启动
"""
import sys
import os

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """测试所有导入"""
    try:
        print("🔍 测试基础导入...")
        import fastapi
        import uvicorn
        import loguru
        print("✅ 基础库导入成功")
        
        print("🔍 测试应用导入...")
        from app.config import settings
        print("✅ 配置导入成功")
        
        from app.database import db_service
        print("✅ 数据库导入成功")
        
        from app.models import ApiResponse
        print("✅ 模型导入成功")
        
        from app.core.container import container
        print("✅ 容器导入成功")
        
        from app.api.v1.api import api_router
        print("✅ API路由导入成功")
        
        from app.main import app
        print("✅ 主应用导入成功")
        
        print("🎉 所有导入测试通过！")
        return True
        
    except Exception as e:
        print(f"❌ 导入失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_container():
    """测试依赖注入容器"""
    try:
        print("🔍 测试依赖注入容器...")
        from app.core.container import container
        
        container.initialize()
        print("✅ 容器初始化成功")
        
        # 测试获取服务
        market_data_provider = container.get_market_data_provider()
        print("✅ 市场数据提供者获取成功")
        
        stock_repository = container.get_stock_repository()
        print("✅ 股票仓库获取成功")
        
        strategy_service = container.get_strategy_service()
        print("✅ 策略服务获取成功")
        
        market_data_service = container.get_market_data_service()
        print("✅ 市场数据服务获取成功")
        
        print("🎉 容器测试通过！")
        return True
        
    except Exception as e:
        print(f"❌ 容器测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """主函数"""
    print("🎯 知行交易后端导入测试")
    print("=" * 50)
    
    # 测试导入
    if not test_imports():
        sys.exit(1)
    
    print()
    
    # 测试容器
    if not test_container():
        sys.exit(1)
    
    print()
    print("🚀 准备启动服务器...")
    
    try:
        import uvicorn
        from app.main import app
        
        print("✅ 启动FastAPI服务器...")
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True
        )
        
    except KeyboardInterrupt:
        print("\n🛑 服务器已停止")
    except Exception as e:
        print(f"❌ 服务器启动失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
