# API配置重构说明

## 🎯 重构目标

解决原有API路由文件中硬编码后端地址的问题，实现统一的API配置管理。

## ❌ 重构前的问题

### 硬编码问题
每个 `route.ts` 文件都包含硬编码的后端地址：
```typescript
const BACKEND_API_BASE = 'http://localhost:8000/api/v1';
```

### 维护困难
- 后端端口变更时需要修改所有文件
- 部署到不同环境时需要手动修改每个文件
- 容易遗漏某些文件导致配置不一致
- 代码重复，违反DRY原则

## ✅ 重构后的改进

### 1. 统一配置管理
创建了 `src/config/api.ts` 文件，集中管理所有API配置：

```typescript
export const BACKEND_API_CONFIG = {
  BASE_URL: process.env.BACKEND_API_BASE_URL || 'http://localhost:8000/api/v1',
  TIMEOUT: 30000,
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
} as const;
```

### 2. 环境变量支持
在 `.env.local` 中添加了后端API配置：
```bash
# 后端API基础URL（用于API路由代理）
BACKEND_API_BASE_URL=http://localhost:8000/api/v1
```

### 3. 工具函数
提供了便捷的工具函数：

```typescript
// 获取完整API URL
getBackendApiUrl('concepts/') // → http://localhost:8000/api/v1/concepts/

// 创建标准fetch配置
createFetchConfig('GET') // → { method: 'GET', headers: {...} }
createFetchConfig('POST', data) // → { method: 'POST', headers: {...}, body: JSON.stringify(data) }
```

### 4. 代码简化

**重构前：**
```typescript
const BACKEND_API_BASE = 'http://localhost:8000/api/v1';

const response = await fetch(`${BACKEND_API_BASE}/concepts/`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});
```

**重构后：**
```typescript
import { getBackendApiUrl, createFetchConfig } from '../../../config/api';

const response = await fetch(
  getBackendApiUrl('concepts/'),
  createFetchConfig('POST', body)
);
```

## 🔧 使用方法

### 开发环境
1. 确保 `.env.local` 中配置了正确的后端地址
2. 启动后端服务（默认端口8000）
3. 启动前端服务，API代理会自动工作

### 生产环境
1. 设置环境变量 `BACKEND_API_BASE_URL`
2. 或者修改 `.env.local` 中的配置

### 更改后端端口
只需要修改一个地方：
```bash
# .env.local
BACKEND_API_BASE_URL=http://localhost:9000/api/v1
```

## 📁 影响的文件

重构涉及以下文件：

### 新增文件
- `src/config/api.ts` - API配置文件
- `scripts/refactor-api-routes.js` - 重构脚本
- `docs/API_REFACTOR.md` - 本文档

### 修改文件
- `.env.local` - 添加后端API配置
- 所有 `src/app/api/**/route.ts` 文件（共12个）

### 重构统计
- 📄 处理文件: 13个
- ✅ 修改文件: 12个
- ⏭️ 跳过文件: 1个（已经重构过）

## 🚀 自动化重构

使用了自动化脚本进行批量重构：
```bash
node scripts/refactor-api-routes.js
```

脚本功能：
- 自动扫描所有route.ts文件
- 智能识别后端API
- 替换硬编码配置为统一配置
- 生成重构统计报告

## 🎉 重构收益

1. **维护性提升**：只需修改一个配置文件即可更改所有API地址
2. **环境适配**：通过环境变量轻松适配不同部署环境
3. **代码质量**：消除重复代码，提高代码一致性
4. **开发效率**：减少配置错误，提高开发体验
5. **扩展性**：为未来添加更多API配置选项奠定基础

## 🔮 未来扩展

可以进一步扩展的功能：
- 添加API请求重试机制
- 统一错误处理
- 请求/响应拦截器
- API性能监控
- 缓存策略