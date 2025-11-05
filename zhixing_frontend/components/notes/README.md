# 📝 交易笔记组件

交易笔记功能的前端实现，包含完整的 UI 界面和交互逻辑。

## 📦 组件结构

```
components/notes/
├── NoteCard.tsx          # 笔记卡片（展示单条笔记）
├── NoteFilters.tsx       # 过滤器（搜索、筛选、排序）
├── NoteEditor.tsx        # 笔记编辑器（新建/编辑笔记）
├── TagManager.tsx        # 标签管理（创建/编辑/删除标签）
└── README.md             # 本文件

app/notes/
└── page.tsx              # 笔记页面（主页面）
```

## ✨ 功能特性

### 1. 笔记卡片 (NoteCard)
- ✅ 显示笔记标题、内容预览
- ✅ 显示笔记类型标签（交易笔记/日笔记/杂项笔记）
- ✅ 显示自定义标签（带颜色）
- ✅ 星标收藏功能
- ✅ 编辑、删除、查看关联对象
- ✅ 二次确认删除

### 2. 过滤器 (NoteFilters)
- ✅ 全文搜索（标题和内容）
- ✅ 日期范围过滤
- ✅ 笔记类型过滤
- ✅ 标签过滤（多选）
- ✅ 收藏状态过滤
- ✅ 一键清除所有过滤器
- ✅ 可收起/展开

### 3. 笔记编辑器 (NoteEditor)
- ✅ 选择笔记类型
- ✅ 关联交易或日期（简化版）
- ✅ 输入标题和内容
- ✅ 多选标签
- ✅ 星标标记
- ✅ 字数统计
- ✅ Markdown 提示
- ✅ 快速创建标签入口

### 4. 标签管理 (TagManager)
- ✅ 创建标签（名称+颜色）
- ✅ 编辑标签
- ✅ 删除标签（不允许删除使用中的标签）
- ✅ 8种预设颜色 + 自定义颜色
- ✅ 实时预览
- ✅ 显示标签使用次数

### 5. 主页面 (NotesPage)
- ✅ 笔记列表展示
- ✅ 分页功能
- ✅ 新建笔记
- ✅ 管理标签
- ✅ 导出功能（待实现）
- ✅ 统计信息展示
- ✅ 空状态提示

## 🎨 设计亮点

### 1. 颜色系统
- 笔记类型颜色：
  - 🔵 交易笔记 - 蓝色
  - 🟢 日笔记 - 绿色
  - 🟣 杂项笔记 - 紫色

- 预设标签颜色：
  - 🟢 绿色 - 盈利、成功
  - 🔴 红色 - 亏损、警告
  - 🔵 蓝色 - 分析、信息
  - 🟡 黄色 - 待验证、提醒
  - 🟣 紫色 - 策略、重要
  - ⚫ 灰色 - 中性、其他
  - 🟠 橙色 - 高优先级
  - 🩷 粉色 - 特殊标记

### 2. 交互设计
- **悬停效果**: 卡片悬停时阴影增强
- **过渡动画**: 所有交互都有平滑过渡
- **视觉反馈**: 点击、选中状态明确
- **二次确认**: 删除操作需要二次确认
- **空状态**: 友好的空状态提示

### 3. 响应式设计
- 自适应布局
- 移动端友好
- 暗色模式支持

## 📊 模拟数据

目前使用模拟数据进行展示，包括：
- 5条示例笔记（包含3种类型）
- 8个预设标签
- 完整的交互功能

## 🚀 如何使用

### 1. 启动前端
```bash
cd zhixing_fronted
npm install
npm run dev
```

### 2. 访问笔记页面
- 方式1: 访问 http://localhost:3000/notes
- 方式2: 在主页面点击侧边栏"交易笔记"

### 3. 功能演示
1. **创建笔记**: 点击右上角"新建笔记"
2. **管理标签**: 点击"管理标签"创建自定义标签
3. **过滤笔记**: 使用过滤器搜索和筛选
4. **编辑笔记**: 点击笔记卡片的编辑按钮
5. **星标收藏**: 点击星星图标收藏重要笔记
6. **删除笔记**: 点击删除按钮，再次确认删除

## 🔄 下一步集成

### 后端 API 集成
需要实现以下 API 端点：

```typescript
// 笔记 CRUD
GET    /api/v1/notes              # 获取笔记列表
POST   /api/v1/notes              # 创建笔记
PUT    /api/v1/notes/:id          # 更新笔记
DELETE /api/v1/notes/:id          # 删除笔记
POST   /api/v1/notes/:id/star     # 切换星标

// 标签管理
GET    /api/v1/note-tags          # 获取标签列表
POST   /api/v1/note-tags          # 创建标签
PUT    /api/v1/note-tags/:id      # 更新标签
DELETE /api/v1/note-tags/:id      # 删除标签

// 搜索
GET    /api/v1/notes/search       # 搜索笔记

// 导出
POST   /api/v1/notes/export       # 导出笔记
```

### 富文本编辑器升级
当前使用简单的 Textarea，后续可升级为：
- **Quill** - 轻量级富文本编辑器
- **Tiptap** - 基于 ProseMirror 的现代编辑器
- **Slate** - React 生态的编辑器

### 关联功能
- 关联到具体交易记录
- 关联到交易日期
- 从交易页面快速创建笔记

## 📝 待优化项

### 功能增强
- [ ] 富文本编辑器
- [ ] 图片上传
- [ ] 笔记模板
- [ ] 批量操作
- [ ] 导出为 PDF/Markdown

### 性能优化
- [ ] 虚拟滚动（大量笔记时）
- [ ] 懒加载
- [ ] 缓存策略

### 用户体验
- [ ] 快捷键支持
- [ ] 自动保存草稿
- [ ] 离线支持
- [ ] 拖拽排序

## 🎯 组件使用示例

### 使用 NoteCard
```tsx
<NoteCard
  note={note}
  onEdit={(note) => console.log('编辑', note)}
  onDelete={(id) => console.log('删除', id)}
  onToggleStar={(id) => console.log('切换星标', id)}
/>
```

### 使用 NoteFilters
```tsx
<NoteFilters
  tags={tags}
  selectedTags={selectedTags}
  onTagToggle={(tagId) => console.log('切换标签', tagId)}
  searchQuery={searchQuery}
  onSearchChange={setSearchQuery}
  noteType={noteType}
  onTypeChange={setNoteType}
  starredOnly={starredOnly}
  onStarredToggle={() => setStarredOnly(!starredOnly)}
  dateRange={dateRange}
  onDateRangeChange={setDateRange}
/>
```

### 使用 NoteEditor
```tsx
<NoteEditor
  note={editingNote}
  availableTags={tags}
  open={showEditor}
  onClose={() => setShowEditor(false)}
  onSave={(note) => console.log('保存', note)}
  onCreateTag={() => console.log('创建标签')}
/>
```

## 📞 技术栈

- **框架**: Next.js 14 + React 18
- **UI 库**: shadcn/ui
- **图标**: Lucide React
- **样式**: Tailwind CSS
- **类型**: TypeScript

---

**开发日期**: 2025-10-18  
**状态**: ✅ 前端 UI 完成，待后端集成

