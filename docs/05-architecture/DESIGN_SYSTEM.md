# 知行交易系统 - 设计系统规范

## 🎨 核心设计原则

### 1. 统一的深色主题
- **主色调**: 深色背景 (#0f172a)
- **辅助色**: 略浅的表面色 (#1e293b)
- **强调色**: 科技蓝 (#00ffd0) 和渐变蓝 (#3b82f6)

### 2. 现代极客金融风格
- **霓虹效果**: 使用 `neon-card` 类创建发光边框
- **玻璃态效果**: 使用半透明和模糊效果
- **科技感**: 强调数据和信息的清晰呈现

## 🎯 颜色系统

### 主色调
```css
:root {
  --background: #0f172a;        /* 主背景色 */
  --surface: #1e293b;          /* 卡片/表面背景 */
  --surface-light: #334155;    /* 更浅的表面色 */
}
```

### 文本颜色
```css
:root {
  --text-primary: #f1f5f9;     /* 主要文本 */
  --text-secondary: #94a3b8;   /* 次要文本 */
  --text-muted: #64748b;       /* 辅助文本 */
  --text-inverse: #0f172a;    /* 反色文本（用于彩色背景） */
}
```

### 功能性颜色
```css
:root {
  --primary: #00ffd0;          /* 主色调 - 科技蓝 */
  --primary-light: #66ffda;    /* 主色调浅色 */
  --primary-dark: #00b8a6;     /* 主色调深色 */
  
  --success: #22c55e;          /* 成功色 */
  --success-light: #4ade80;    /* 成功色浅色 */
  --success-dark: #16a34a;     /* 成功色深色 */
  
  --warning: #f59e0b;          /* 警告色 */
  --warning-light: #fbbf24;    /* 警告色浅色 */
  --warning-dark: #d97706;     /* 警告色深色 */
  
  --danger: #ef4444;           /* 危险色 */
  --danger-light: #f87171;    /* 危险色浅色 */
  --danger-dark: #dc2626;      /* 危险色深色 */
  
  --info: #3b82f6;             /* 信息色 */
  --info-light: #60a5fa;       /* 信息色浅色 */
  --info-dark: #2563eb;        /* 信息色深色 */
  
  --accent: #a855f7;           /* 强调色 */
  --border: #334155;           /* 边框色 */
}
```

## 🏗️ 组件样式规范

### 1. 卡片组件
```css
/* 基础卡片 */
.card {
  @apply bg-surface border border-border rounded-lg;
}

/* 霓虹卡片 - 主要视觉元素 */
.neon-card {
  @apply bg-surface border-2 border-primary/20 rounded-xl;
  box-shadow: 0 0 20px rgba(0, 255, 208, 0.1);
}

/* 霓虹卡片悬停效果 */
.neon-card:hover {
  @apply border-primary/40;
  box-shadow: 0 0 30px rgba(0, 255, 208, 0.2);
}
```

### 2. 按钮组件
```css
/* 主按钮 */
.btn-primary {
  @apply px-4 py-2 bg-primary text-text-inverse rounded-lg 
         hover:bg-primary-light transition-all;
}

/* 次要按钮 */
.btn-secondary {
  @apply px-4 py-2 border border-primary text-primary rounded-lg 
         hover:bg-primary/10 transition-all;
}

/* 危险按钮 */
.btn-danger {
  @apply px-4 py-2 bg-danger text-white rounded-lg 
         hover:bg-danger-dark transition-all;
}
```

### 3. 表单组件
```css
/* 输入框 */
.form-input {
  @apply w-full p-3 border border rounded-lg 
         focus:ring-2 focus:ring-primary focus:border-transparent 
         bg-surface text-text-primary;
}

/* 选择框 */
.form-select {
  @apply w-full p-3 border border rounded-lg 
         focus:ring-2 focus:ring-primary focus:border-transparent 
         bg-surface text-text-primary;
}
```

### 4. 状态标签
```css
/* 成功状态 */
.status-success {
  @apply bg-success/20 text-success px-2 py-1 rounded-full text-xs;
}

/* 警告状态 */
.status-warning {
  @apply bg-warning/20 text-warning px-2 py-1 rounded-full text-xs;
}

/* 错误状态 */
.status-danger {
  @apply bg-danger/20 text-danger px-2 py-1 rounded-full text-xs;
}

/* 信息状态 */
.status-info {
  @apply bg-info/20 text-info px-2 py-1 rounded-full text-xs;
}
```

## 📏 间距和布局

### 间距规范
- **微间距**: 2px (0.125rem)
- **小间距**: 4px (0.25rem)
- **标准间距**: 8px (0.5rem)
- **中等间距**: 16px (1rem)
- **大间距**: 24px (1.5rem)
- **超大间距**: 32px (2rem)

### 布局原则
- **容器最大宽度**: 1200px
- **卡片间距**: 1.5rem (24px)
- **内容内边距**: 1.5rem (24px)
- **响应式断点**: sm (640px), md (768px), lg (1024px), xl (1280px)

## 🔤 字体系统

### 字体大小
```css
.text-xs { font-size: 0.75rem; }    /* 12px */
.text-sm { font-size: 0.875rem; }   /* 14px */
.text-base { font-size: 1rem; }     /* 16px */
.text-lg { font-size: 1.125rem; }   /* 18px */
.text-xl { font-size: 1.25rem; }    /* 20px */
.text-2xl { font-size: 1.5rem; }    /* 24px */
.text-3xl { font-size: 1.875rem; }  /* 30px */
.text-4xl { font-size: 2.25rem; }    /* 36px */
```

### 字体粗细
```css
.font-light { font-weight: 300; }
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
```

## ✨ 动画和交互

### 过渡效果
```css
/* 标准过渡 */
.transition-all {
  transition: all 0.2s ease;
}

/* 颜色过渡 */
.transition-colors {
  transition: color 0.2s ease, background-color 0.2s ease;
}

/* 变换过渡 */
.transition-transform {
  transition: transform 0.2s ease;
}
```

### 悬停效果
```css
/* 按钮悬停 */
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 255, 208, 0.3);
}

/* 卡片悬停 */
.neon-card:hover {
  transform: translateY(-2px);
}
```

## 🎪 特殊效果

### 霓虹发光效果
```css
.neon-glow {
  box-shadow: 0 0 20px rgba(0, 255, 208, 0.3),
              0 0 40px rgba(0, 255, 208, 0.1);
}

.neon-glow:hover {
  box-shadow: 0 0 30px rgba(0, 255, 208, 0.5),
              0 0 60px rgba(0, 255, 208, 0.2);
}
```

### 玻璃态效果
```css
.glass-effect {
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

## 📱 响应式设计

### 断点策略
- **手机**: < 640px - 垂直堆叠，简化布局
- **平板**: 640px - 1024px - 两列布局
- **桌面**: > 1024px - 多列复杂布局

### 移动端优化
- 触摸目标最小尺寸: 44px × 44px
- 字体大小不小于 14px
- 简化交互元素
- 优化表单输入体验

## 🚀 使用规范

### 1. 颜色使用
- **禁止使用** Tailwind 默认灰色类 (bg-gray-*, text-gray-*, border-gray-*)
- **必须使用** CSS 变量系统 (--primary, --text-primary, etc.)
- **保持一致性** 整个应用使用相同的颜色语义

### 2. 组件复用
- **优先使用** 已定义的设计组件
- **避免重复** 创建相似但略有不同的样式
- **继承原则** 通过继承和扩展实现样式变化

### 3. 性能优化
- **避免过度** 使用 box-shadow 和 filter
- **合理使用** CSS 变量减少样式计算
- **优化动画** 使用 transform 和 opacity

## 🔄 维护和更新

### 样式检查清单
- [ ] 是否使用了 CSS 变量而非硬编码颜色
- [ ] 是否保持了视觉一致性
- [ ] 是否考虑了响应式设计
- [ ] 是否符合无障碍访问标准
- [ ] 是否测试了深色模式下的显示效果

### 更新流程
1. **设计评审** 确保新样式符合整体设计语言
2. **CSS 变量更新** 在 globals.css 中定义新的设计token
3. **组件更新** 逐步更新受影响的组件
4. **测试验证** 确保所有场景下的显示效果
5. **文档更新** 同步更新设计系统文档

---

**创建日期**: 2024年
**版本**: 1.0.0
**维护者**: 知行交易开发团队