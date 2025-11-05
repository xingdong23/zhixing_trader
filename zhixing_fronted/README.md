# QuantMind Frontend - 智能量化交易系统前端

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/xingdong23s-projects/v0-quant-system-ui)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/mOiX9Ze3YqL)

## Overview

QuantMind Frontend 是智能量化交易系统的前端界面，与 `quantmind-backend` 后端系统配合，为用户提供直观易用的量化交易操作界面。

### 核心功能

- 📈 **自选股票管理** - 智能股票筛选与监控
- 📋 **交易计划制定** - 自动化交易计划创建与管理  
- ⚡ **策略管理** - 多样化交易策略配置
- 🔄 **交易执行** - 多券商对接，实时交易执行
- 🎯 **大佬追踪** - 跟踪投资大师的交易动向
- 🧠 **心态建设** - 交易心理辅导与风险控制
- 📊 **交易复盘** - 详细的交易数据分析与复盘

### 技术特性

- 🚀 基于 Next.js 15 + React 19 构建
- 🎨 使用 Tailwind CSS + shadcn/ui 组件库
- 📱 响应式设计，支持多设备访问
- 🔌 多券商 API 集成（富途、老虎、盈透等）
- ⚡ 实时数据推送与交易执行

## 系统架构

本项目是 **QuantMind 智能量化交易系统** 的前端部分，采用前后端分离架构：

### 📱 前端项目 (quantmind-frontend)
**当前项目** - 用户交互界面
- **技术栈**: Next.js 15 + React 19 + TypeScript
- **UI框架**: Tailwind CSS + shadcn/ui 
- **主要职责**: 
  - 用户界面展示与交互
  - 交易面板与操作界面
  - 数据可视化与图表展示
  - 实时数据展示

### ⚙️ 后端项目 (quantmind-backend)
**配套后端系统** - 业务逻辑与数据处理
- **建议技术栈**: Python FastAPI / Node.js Express / Go Gin
- **主要职责**: 
  - 券商 API 集成与管理
  - 交易策略引擎
  - 实时数据处理与推送
  - 用户认证与权限管理
  - 交易记录与风控系统
  - RESTful API 提供

### 🗄️ 数据层
- **时序数据库**: InfluxDB (存储价格、技术指标等时序数据)
- **关系数据库**: PostgreSQL (用户信息、交易计划、策略配置)
- **缓存**: Redis (实时数据缓存、会话管理)

### 🔄 系统交互
```
Frontend (Next.js) ←→ Backend API ←→ Database
     ↑                    ↓
   用户界面          券商API/数据源
```

## 开发说明

### 前端开发 (本项目)
```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建生产版本
pnpm build
```

### 后端配合
本前端项目需要配合 `quantmind-backend` 后端系统使用：
- 后端 API 地址配置: 环境变量 `NEXT_PUBLIC_API_URL`
- WebSocket 连接: 用于实时数据推送
- 认证集成: JWT token 管理

### API 接口约定
前端与后端通过 RESTful API 通信，主要接口包括：
- `/api/auth/*` - 用户认证
- `/api/stocks/*` - 股票数据
- `/api/plans/*` - 交易计划
- `/api/strategies/*` - 策略管理
- `/api/trading/*` - 交易执行
- `/ws/realtime` - WebSocket 实时数据

## Deployment

Your project is live at:

**[https://vercel.com/xingdong23s-projects/v0-quant-system-ui](https://vercel.com/xingdong23s-projects/v0-quant-system-ui)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/projects/mOiX9Ze3YqL](https://v0.app/chat/projects/mOiX9Ze3YqL)**

## 📚 文档

完整的项目文档已整理到 `docs/` 目录：

- **[快速开始](docs/01-快速开始/)** - 快速上手和测试指南
- **[功能说明](docs/02-功能说明/)** - 各功能模块详细说明
- **[开发记录](docs/03-开发记录/)** - 开发过程和优化记录
- **[交付报告](docs/04-交付报告/)** - 项目交付和完成报告
- **[测试指南](docs/05-测试指南/)** - 测试相关文档

👉 **[查看完整文档导航](docs/README.md)**

---

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository