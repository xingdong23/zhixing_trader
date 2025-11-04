# Bitcoin Trader - 阿里云部署 Dockerfile
FROM python:3.10-slim

# 设置工作目录
WORKDIR /app

# 设置时区为上海
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY app/requirements.txt /app/requirements.txt

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/

# 复制项目文件
COPY app/ /app/app/
COPY backtest/ /app/backtest/
COPY data/ /app/data/

# 创建日志目录
RUN mkdir -p /app/logs

# 设置Python路径
ENV PYTHONPATH=/app

# 暴露端口（如果需要API服务）
EXPOSE 8001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import sys; sys.exit(0)"

# 默认运行高频交易策略（模拟盘）
CMD ["python", "-u", "app/run/high_frequency.py", "--mode", "paper"]
