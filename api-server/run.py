#!/usr/bin/env python3
import os
import sys
import uvicorn


def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    api_dir = os.path.join(repo_root, "api-server")
    app_dir = os.path.join(api_dir, "app")
    os.chdir(api_dir)
    if api_dir not in sys.path:
        sys.path.insert(0, api_dir)
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )


if __name__ == "__main__":
    main()
