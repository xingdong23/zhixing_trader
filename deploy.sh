#!/bin/bash

# 【知行交易】一键部署脚本
# 使用方法：在服务器上运行此脚本

set -e

echo "🚀 开始部署【知行交易】应用..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印彩色信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    print_error "请使用root用户运行此脚本"
    exit 1
fi

print_info "更新系统包..."
apt update && apt upgrade -y

print_info "安装Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    print_success "Node.js 安装完成"
else
    print_success "Node.js 已安装"
fi

print_info "安装PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    print_success "PM2 安装完成"
else
    print_success "PM2 已安装"
fi

print_info "安装Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install nginx -y
    print_success "Nginx 安装完成"
else
    print_success "Nginx 已安装"
fi

print_info "创建应用目录..."
APP_DIR="/root/zhixing-trader"
mkdir -p $APP_DIR
cd $APP_DIR

print_info "创建package.json..."
cat > package.json << 'EOF'
{
  "name": "zhixing-trader",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "next": "15.3.5",
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "eslint": "^8",
    "eslint-config-next": "15.3.5",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4",
    "lucide-react": "^0.460.0"
  }
}
EOF

print_info "安装依赖..."
npm install

print_info "创建Next.js配置..."
cat > next.config.mjs << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
EOF

print_info "创建Tailwind配置..."
cat > tailwind.config.ts << 'EOF'
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
EOF

cat > postcss.config.mjs << 'EOF'
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
EOF

print_info "创建TypeScript配置..."
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

print_info "创建应用目录结构..."
mkdir -p src/app src/components src/hooks src/types src/utils src/data

print_warning "请将您的源代码文件上传到 $APP_DIR/src/ 目录"
print_warning "您可以使用以下命令从本地上传："
echo "scp -r /Users/chengzheng/workspace/chuangxin/zhixing_trader/src/* root@101.42.14.209:$APP_DIR/src/"

print_info "等待源代码上传..."
echo "按任意键继续（确保已上传源代码）..."
read -n 1 -s

print_info "构建应用..."
npm run build

print_info "创建PM2配置..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'zhixing-trader',
    script: 'npm',
    args: 'start',
    cwd: '/root/zhixing-trader',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

print_info "启动应用..."
pm2 delete zhixing-trader 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup

print_info "配置Nginx..."
cat > /etc/nginx/sites-available/zhixing-trader << 'EOF'
server {
    listen 80;
    server_name 101.42.14.209;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 启用站点
ln -sf /etc/nginx/sites-available/zhixing-trader /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试配置并重启Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

print_info "配置防火墙..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

print_success "部署完成！"
print_info "应用访问地址："
echo "  - 直接访问: http://101.42.14.209:3000"
echo "  - 通过Nginx: http://101.42.14.209"

print_info "常用管理命令："
echo "  - 查看应用状态: pm2 status"
echo "  - 查看应用日志: pm2 logs zhixing-trader"
echo "  - 重启应用: pm2 restart zhixing-trader"
echo "  - 查看Nginx状态: systemctl status nginx"

print_info "检查应用状态..."
sleep 3
pm2 status
curl -I http://localhost:3000 || print_warning "应用可能还在启动中..."

print_success "🎉 【知行交易】部署完成！"
