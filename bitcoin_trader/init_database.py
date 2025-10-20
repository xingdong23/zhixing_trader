#!/usr/bin/env python3
"""
数据库初始化脚本
创建所有必要的表
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine
from app.models import Base
from app.config import settings

def init_database():
    """初始化数据库"""
    print("=" * 80)
    print("🗄️  Bitcoin Trader - 数据库初始化")
    print("=" * 80)
    
    # 创建数据库引擎
    print(f"\n连接数据库: {settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}")
    engine = create_engine(settings.database_url, echo=True)
    
    try:
        # 创建所有表
        print("\n创建数据表...")
        Base.metadata.create_all(engine)
        
        print("\n" + "=" * 80)
        print("✅ 数据库初始化成功!")
        print("=" * 80)
        
        # 显示创建的表
        print("\n已创建的表:")
        for table in Base.metadata.sorted_tables:
            print(f"  - {table.name}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ 数据库初始化失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        engine.dispose()

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)
