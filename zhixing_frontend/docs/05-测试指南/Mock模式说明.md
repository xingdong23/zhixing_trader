# Mock模式说明 - 前端独立运行

## 📋 概述

为了方便前端开发和演示,我们为以下组件添加了**完全Mock模式**,不依赖后端API即可正常运行:

1. **分类管理** (`CategoriesView.tsx`)
2. **数据同步按钮** (`DataSyncButton.tsx`)

## 🎯 Mock模式特性

### ✅ 核心功能
- **完全本地运行**: 不发起任何后端API请求
- **完整功能模拟**: 支持所有CRUD操作(创建、读取、更新、删除)
- **实时反馈**: 提供Toast提示,标注Mock模式
- **数据持久化**: 操作在当前会话保持(刷新后恢复Mock初始数据)
- **视觉提示**: UI上显示"🎭 Mock模式"标识

### 🔄 自动降级机制
虽然现在是完全Mock模式,但代码保留了真实API调用逻辑:
```typescript
if (USE_MOCK_DATA) {
  // Mock模式: 本地操作
  // ...
  return;
}

// 真实API调用 (当USE_MOCK_DATA = false时)
// ...
```

## 📦 组件详情

### 1. 分类管理 (CategoriesView)

**Mock数据**:
```typescript
const mockCategories: Category[] = [
  {
    id: 1,
    category_id: 'cat_1',
    name: '行业板块',
    children: [
      { name: '科技股', icon: '💻', ... },
      { name: '能源', icon: '⚡', ... }
    ]
  },
  {
    id: 4,
    category_id: 'cat_4',
    name: '交易策略',
    children: [
      { name: '长线持有', icon: '📈', ... }
    ]
  }
]
```

**支持的操作**:
- ✅ 获取分类列表 (Mock数据)
- ✅ 创建顶级分类
- ✅ 创建子分类
- ✅ 编辑分类信息
- ✅ 删除分类(包括子分类)
- ✅ 展开/收起树形结构

**用户体验**:
- 点击"创建分类" → 弹出表单 → 填写后保存 → Toast提示"✅ 分类创建成功 (Mock模式)"
- 点击"编辑" → 修改内容 → 保存 → Toast提示"✅ 分类更新成功 (Mock模式)"
- 点击"删除" → 确认 → Toast提示"✅ 分类删除成功 (Mock模式)"

### 2. 数据同步按钮 (DataSyncButton)

**Mock数据**:
```typescript
const mockLastTask: SyncTask = {
  task_id: 'mock_task_123',
  status: 'completed',
  progress: 100,
  total_stocks: 150,
  processed_stocks: 150,
  success_stocks: 148,
  failed_stocks: 2,
  duration_seconds: 60,
  ...
}
```

**支持的操作**:
- ✅ 显示上次同步记录 (Mock数据)
- ✅ 触发增量同步 (Mock动画)
- ✅ 触发全量同步 (Mock动画)
- ✅ 实时进度显示 (每300ms增加10%)
- ✅ 取消同步任务

**用户体验**:
1. 点击"增量同步" → Toast提示"🔄 开始增量同步 (Mock模式)"
2. 显示进度条: 0% → 10% → 20% → ... → 100%
3. 显示实时统计: "成功: 148, 失败: 2"
4. 完成后Toast提示: "✅ 同步完成! 成功: 148, 失败: 2"

## 🔧 配置说明

### 启用/禁用Mock模式

在文件顶部找到配置常量:

**CategoriesView.tsx**:
```typescript
// ========== Mock模式配置 ==========
const USE_MOCK_DATA = true; // 启用Mock模式,不调用后端API
```

**DataSyncButton.tsx**:
```typescript
// ========== Mock模式配置 ==========
const USE_MOCK_DATA = true; // 启用Mock模式,不调用后端API
```

**修改为 `false` 即可切换到真实API调用模式**。

## 🎨 UI识别

### Mock模式标识

**分类管理页面**:
```
分类管理
管理股票分类,支持多级嵌套 🎭 Mock模式 - 不调用后端API
```

**数据同步按钮**:
```
[增量同步] [全量同步]
上次同步: 5月19日 14:30
🎭 Mock模式 - 不调用后端API
```

**Toast提示**:
- "✅ 分类创建成功 (Mock模式)"
- "✅ 分类更新成功 (Mock模式)"
- "✅ 分类删除成功 (Mock模式)"
- "🔄 开始增量同步 (Mock模式)"

## 🚀 使用场景

### 适合Mock模式的场景
1. **前端开发**: 不依赖后端即可开发和测试UI
2. **功能演示**: 向产品经理/用户展示功能流程
3. **UI设计验证**: 快速迭代界面设计
4. **集成测试前**: 先验证前端逻辑是否正确

### 何时切换到真实API
1. **后端API就绪**: 后端开发完成并可用
2. **集成测试**: 需要测试前后端联调
3. **生产部署**: 正式上线前切换到真实API

## 📝 开发建议

### 添加新的Mock组件
参考 `CategoriesView.tsx` 的实现模式:

```typescript
// 1. 定义Mock模式开关
const USE_MOCK_DATA = true;

// 2. 准备Mock数据
const mockData = [...];

// 3. 在API函数中添加条件判断
const fetchData = async () => {
  if (USE_MOCK_DATA) {
    // Mock逻辑
    setData(mockData);
    return;
  }
  
  // 真实API调用
  const response = await fetch(API_URL);
  // ...
};

// 4. 在UI上添加Mock标识
{USE_MOCK_DATA && <span>🎭 Mock模式</span>}
```

## ⚠️ 注意事项

1. **数据不持久**: Mock模式的数据修改在页面刷新后会丢失
2. **功能限制**: 某些复杂功能(如文件上传、实时通知)可能需要简化
3. **性能差异**: Mock模式响应速度极快,真实API会有网络延迟
4. **边界情况**: Mock模式可能未覆盖所有错误场景

## 📊 Mock vs 真实API对比

| 特性 | Mock模式 | 真实API |
|------|----------|---------|
| 后端依赖 | ❌ 不需要 | ✅ 需要 |
| 数据持久化 | ❌ 会话级 | ✅ 数据库级 |
| 响应速度 | ⚡ 极快 | 🐢 网络延迟 |
| 功能完整性 | 🟡 模拟 | 🟢 完整 |
| 错误处理 | 🟡 简化 | 🟢 完整 |
| 适用阶段 | 开发/演示 | 测试/生产 |

## 🔄 切换步骤

### 从Mock模式切换到真实API

1. 修改配置常量:
   ```typescript
   const USE_MOCK_DATA = false; // 禁用Mock模式
   ```

2. 确保后端API正常运行:
   ```bash
   # 示例: 测试API是否可访问
   curl http://localhost:8000/api/v1/categories/
   ```

3. 重启前端开发服务器:
   ```bash
   npm run dev
   ```

4. 验证功能:
   - 检查是否有"🎭 Mock模式"标识(应该消失)
   - 测试CRUD操作是否正常
   - 检查数据是否持久化到数据库

## 📞 技术支持

如果遇到问题:
1. 检查浏览器控制台是否有错误
2. 确认 `USE_MOCK_DATA` 配置是否正确
3. 验证Mock数据格式是否与真实API一致
4. 查看Toast提示是否包含"Mock模式"字样

---

**最后更新**: 2025-10-19
**版本**: v1.0
**状态**: ✅ 已实现并测试

