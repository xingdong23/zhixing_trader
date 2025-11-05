# 🚀 阿里云部署指南

> **服务器**: 101.42.14.209  
> **用户**: root  
> **部署目录**: /opt/zhixing_trader

---

## 📋 部署流程

### 步骤1: 本地提交代码 ✅

```bash
# 检查状态
git status

# 添加所有更改
git add .

# 提交
git commit -m "修复前端构建错误并完成项目整理"

# 推送到远程
git push origin main
```

### 步骤2: 连接到阿里云服务器

```bash
# SSH连接（第一次连接）
ssh root@101.42.14.209

# 为了避免频繁输入密码，配置SSH密钥（推荐）
# 在本地生成密钥（如果还没有）
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 复制公钥到服务器
ssh-copy-id root@101.42.14.209

# 之后就不需要输入密码了
```

### 步骤3: 在服务器上拉取代码

```bash
# 切换到/opt目录
cd /opt

# 如果是第一次部署，克隆仓库
git clone <你的仓库地址> zhixing_trader

# 如果已经存在，拉取最新代码
cd /opt/zhixing_trader
git pull origin main
```

### 步骤4: 部署前端模块

```bash
# 进入前端目录
cd /opt/zhixing_trader/zhixing_frontend

# 安装依赖（使用pnpm）
# 如果没有pnpm，先安装
npm install -g pnpm

# 安装项目依赖
pnpm install

# 构建生产版本
pnpm run build

# 启动生产服务（使用PM2管理）
# 如果没有PM2，先安装
npm install -g pm2

# 启动前端
pm2 start npm --name "zhixing-frontend" -- start

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup
```

---

## 🔧 一键部署脚本

创建部署脚本 `/opt/deploy.sh`:

```bash
#!/bin/bash

echo "🚀 开始部署智行交易系统前端..."

# 进入项目目录
cd /opt/zhixing_trader

# 拉取最新代码
echo "📦 拉取最新代码..."
git pull origin main

# 进入前端目录
cd zhixing_frontend

# 安装依赖
echo "📥 安装依赖..."
pnpm install

# 构建项目
echo "🔨 构建项目..."
pnpm run build

# 重启服务
echo "🔄 重启服务..."
pm2 restart zhixing-frontend || pm2 start npm --name "zhixing-frontend" -- start

echo "✅ 部署完成！"
echo "🌐 访问地址: http://101.42.14.209:3000"
```

### 使用部署脚本

```bash
# 赋予执行权限
chmod +x /opt/deploy.sh

# 执行部署
/opt/deploy.sh
```

---

## 🌐 Nginx配置（可选）

如果要通过80端口访问，配置Nginx反向代理：

```nginx
# /etc/nginx/conf.d/zhixing.conf

server {
    listen 80;
    server_name 101.42.14.209;  # 或者你的域名

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

重启Nginx:
```bash
nginx -t  # 测试配置
nginx -s reload  # 重新加载
```

---

## 📝 常用命令

### PM2管理

```bash
# 查看所有进程
pm2 list

# 查看日志
pm2 logs zhixing-frontend

# 重启服务
pm2 restart zhixing-frontend

# 停止服务
pm2 stop zhixing-frontend

# 删除服务
pm2 delete zhixing-frontend

# 监控
pm2 monit
```

### Git操作

```bash
# 查看状态
git status

# 拉取最新
git pull

# 查看日志
git log --oneline -10

# 回退版本
git reset --hard <commit-id>
```

---

## ⚠️ 注意事项

1. **环境变量**: 确保服务器上配置了必要的环境变量（`.env`文件）
2. **端口开放**: 确保阿里云安全组开放了3000端口（或80端口）
3. **Node版本**: 确保服务器Node版本 >= 18
4. **内存**: Next.js构建需要较多内存，建议至少2GB
5. **定期备份**: 定期备份数据库和重要文件

---

## 🔍 故障排查

### 问题1: 端口被占用
```bash
# 查看端口占用
lsof -i :3000
# 杀死进程
kill -9 <PID>
```

### 问题2: 构建失败
```bash
# 清理缓存
rm -rf .next
rm -rf node_modules
pnpm install
pnpm run build
```

### 问题3: 内存不足
```bash
# 增加Node内存限制
NODE_OPTIONS="--max-old-space-size=4096" pnpm run build
```

---

## 📞 快速联系

**服务器信息**:
- IP: 101.42.14.209
- 用户: root
- 项目目录: /opt/zhixing_trader
- 前端端口: 3000

**访问地址**:
- 开发环境: http://localhost:3000
- 生产环境: http://101.42.14.209:3000

---

**部署完成后，访问 http://101.42.14.209:3000 查看效果！** 🎉

