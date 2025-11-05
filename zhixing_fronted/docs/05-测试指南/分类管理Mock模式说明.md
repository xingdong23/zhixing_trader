# 🔧 分类管理Mock模式说明

## 问题背景

点击"分类"菜单创建分类时,出现 `Error: Failed to fetch` 错误。

**原因**: 前端尝试调用后端API (`http://localhost:8000/api/v1/categories/`)，但后端服务未启动。

---

## ✅ 解决方案

已修改代码,添加**智能降级机制**:

### 工作流程

1. **首先尝试后端API**
   - 如果后端服务运行,使用真实数据
   - 支持完整的CRUD操作

2. **自动降级到Mock模式**
   - 如果后端未连接,自动使用Mock数据
   - 前端独立运行,无需后端支持
   - 所有功能正常可用(仅限前端演示)

---

## 🎯 Mock模式功能

### 预设Mock数据

初始加载时会看到:

```
📁 行业板块 (0 股票, 50 总计)
  ├── 💻 科技股 (30 股票)
  └── ⚡ 能源 (20 股票)

🎯 交易策略 (0 股票, 15 总计)
  └── 📈 长线持有 (15 股票)
```

### 支持的操作

✅ **创建分类**
- 可以创建顶级分类
- 可以创建子分类
- 实时更新界面
- Toast提示: "✅ 分类创建成功 (Mock模式)"

✅ **编辑分类**
- 修改分类名称
- 更换图标和颜色
- 调整父分类
- Toast提示: "✅ 分类更新成功 (Mock模式)"

✅ **删除分类**
- 删除单个分类
- 自动删除子分类
- Toast提示: "✅ 分类删除成功 (Mock模式)"

✅ **树形展示**
- 展开/折叠子分类
- 实时计数
- 层级缩进

---

## ⚠️ Mock模式限制

### 数据不持久化
- ❌ 刷新页面后,Mock数据恢复初始状态
- ❌ 创建的分类不会保存
- ❌ 数据仅存在于内存中

### 股票关联
- ❌ 无法真正关联股票
- ❌ 股票数量为模拟数据
- ❌ 不影响实际股票筛选

### 与后端同步
- ❌ Mock数据不会同步到后端
- ❌ 后端数据不会影响Mock数据

---

## 🚀 如何切换到真实模式

### 方法1: 启动后端服务

```bash
# 进入后端目录
cd trading_journal

# 启动后端服务
python run.py

# 或者使用uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 方法2: 确认后端运行

```bash
# 测试后端API
curl http://localhost:8000/api/v1/categories/
```

如果返回JSON数据,说明后端正常运行。

### 自动切换

- ✅ 前端会自动检测后端
- ✅ 如果后端可用,自动使用真实数据
- ✅ 如果后端不可用,自动降级到Mock模式
- ✅ 无需手动配置

---

## 💡 识别当前模式

### Toast提示
- **真实模式**: "✅ 分类创建成功"
- **Mock模式**: "✅ 分类创建成功 (Mock模式)"

### 浏览器控制台
- **Mock模式**: 显示 "后端API未连接,使用Mock数据"
- **真实模式**: 无此提示

---

## 📋 Mock数据结构

```typescript
const mockCategories: Category[] = [
  {
    id: 1,
    category_id: 'cat_1',
    name: '行业板块',
    parent_id: null,
    path: '行业板块',
    level: 0,
    icon: '📁',
    color: 'blue',
    stock_count: 0,
    total_stock_count: 50,
    children: [
      {
        id: 2,
        category_id: 'cat_2',
        name: '科技股',
        parent_id: 'cat_1',
        path: '行业板块/科技股',
        level: 1,
        icon: '💻',
        color: 'blue',
        stock_count: 30,
        total_stock_count: 30,
        children: []
      },
      // ... 更多子分类
    ]
  },
  // ... 更多顶级分类
];
```

---

## 🎨 使用建议

### Mock模式适用场景

✅ **前端开发**
- 测试UI交互
- 调试界面布局
- 验证用户体验

✅ **演示展示**
- 无需后端环境
- 快速展示功能
- 客户演示

✅ **原型验证**
- 验证交互流程
- 测试功能逻辑
- 收集用户反馈

### 真实模式适用场景

✅ **生产环境**
- 数据持久化
- 多用户协作
- 与股票系统集成

✅ **测试环境**
- 集成测试
- 端到端测试
- 数据一致性验证

---

## 🔄 数据迁移

### 从Mock到真实

如果在Mock模式下创建了分类,想要迁移到真实环境:

1. **记录分类结构**
   - 截图或记录分类层级
   - 记录图标和颜色配置

2. **启动后端服务**
   - 确保后端正常运行

3. **重新创建**
   - 在真实模式下重新创建分类
   - 按原有层级结构建立

---

## 🐛 故障排除

### 问题1: 一直使用Mock数据
**原因**: 后端未启动或端口不是8000

**解决**:
```bash
# 检查后端是否运行
lsof -i:8000

# 启动后端
cd trading_journal
python run.py
```

### 问题2: Toast一直显示"(Mock模式)"
**原因**: 后端API无法访问

**解决**:
```bash
# 测试后端连接
curl http://localhost:8000/health

# 检查防火墙设置
# 检查后端日志
```

### 问题3: 创建的分类刷新后消失
**原因**: 这是Mock模式的正常行为

**解决**:
- 启动后端服务
- 切换到真实模式
- 数据会持久化到数据库

---

## 📊 技术实现

### 智能降级逻辑

```typescript
const fetchCategories = async () => {
  try {
    // 1. 尝试后端API
    const response = await fetch('http://localhost:8000/api/v1/categories/');
    const result = await response.json();
    
    if (result.success) {
      // 使用真实数据
      setCategories(result.data);
      return;
    }
  } catch (apiError) {
    // 2. API失败,自动降级
    console.log('后端API未连接,使用Mock数据');
  }
  
  // 3. 加载Mock数据
  setCategories(mockCategories);
};
```

### 操作降级

所有CRUD操作都遵循同样的模式:
1. 尝试后端API
2. 失败则使用前端逻辑
3. Toast提示当前模式

---

## 🎓 最佳实践

### 开发阶段
1. 使用Mock模式快速开发UI
2. 完成交互逻辑
3. 最后对接后端API

### 演示阶段
1. Mock模式适合快速演示
2. 无需准备后端环境
3. 专注于展示功能

### 生产阶段
1. 必须使用真实模式
2. 确保后端稳定运行
3. 定期备份数据

---

## 📞 技术支持

如遇问题:
1. 检查浏览器控制台
2. 查看Toast提示判断模式
3. 确认后端服务状态
4. 参考本文档排查

---

**更新时间**: 2025-10-18  
**Mock模式版本**: v1.0  
**文件**: `components/categories/CategoriesView.tsx`

