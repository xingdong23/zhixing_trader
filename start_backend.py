#!/usr/bin/env python3
"""
启动知行交易后端服务 - 重构版
"""
import os
import sys
import subprocess
from pathlib import Path

def main():
    """主函数"""
    print("🎯 知行交易后端启动脚本 (重构版)")
    print("=" * 50)

    # 检查Python版本
    if sys.version_info < (3, 8):
        print("❌ 需要Python 3.8或更高版本")
        sys.exit(1)
    print(f"✅ Python版本: {sys.version}")

    # 切换到api-server目录
    api_server_dir = Path("api-server")
    if not api_server_dir.exists():
        print("❌ api-server目录不存在")
        sys.exit(1)

    os.chdir(api_server_dir)

    # 检查虚拟环境
    venv_dir = Path("venv")
    if venv_dir.exists():
        print("✅ 发现虚拟环境")
        if sys.platform == "win32":
            python_exe = venv_dir / "Scripts" / "python.exe"
        else:
            python_exe = venv_dir / "bin" / "python"
    else:
        print("⚠️ 未发现虚拟环境，使用系统Python")
        python_exe = sys.executable

    print("🚀 启动知行交易后端服务...")

    try:
        # 启动FastAPI服务器
        subprocess.run([
            str(python_exe), "-m", "uvicorn",
            "app.main:app",
            "--host", "0.0.0.0",
            "--port", "8000",
            "--reload"
        ], check=True)
    except KeyboardInterrupt:
        print("\n🛑 服务器已停止")
    except subprocess.CalledProcessError as e:
        print(f"❌ 服务器启动失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
