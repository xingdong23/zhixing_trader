"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Download, Tags } from "lucide-react";
import NoteCard from "@/components/notes/NoteCard";
import NoteFilters from "@/components/notes/NoteFilters";
import NoteEditor from "@/components/notes/NoteEditor";
import TagManager from "@/components/notes/TagManager";
import type { Note, NoteTag, NoteWithId } from "./types";

// 模拟数据
const mockTags: NoteTag[] = [
  { id: 1, name: "盈利", color: "#10b981", count: 23 },
  { id: 2, name: "亏损", color: "#ef4444", count: 12 },
  { id: 3, name: "技术分析", color: "#f59e0b", count: 45 },
  { id: 4, name: "基本面分析", color: "#3b82f6", count: 18 },
  { id: 5, name: "纪律执行", color: "#10b981", count: 30 },
  { id: 6, name: "情绪波动", color: "#f59e0b", count: 15 },
  { id: 7, name: "重要教训", color: "#ef4444", count: 8 },
  { id: 8, name: "待验证", color: "#f59e0b", count: 10 },
];

const mockNotes: NoteWithId[] = [
  {
    id: 1,
    type: "trade",
    title: "AAPL 突破月线阻力位买入",
    content: `## 入场理由

- 突破月线阻力位
- MACD金叉
- 基本面支撑：Q3财报超预期

## 实际执行

入场点位精准，但止损设置过紧，被扫出后继续上涨。

## 教训

- 需要给予更大的波动空间
- 下次类似情况考虑分批建仓`,
    isStarred: true,
    tags: [mockTags[0], mockTags[2]],
    createdAt: "2024-10-15T14:30:00Z",
    relatedInfo: {
      type: "trade",
      label: "AAPL 买入 100股 @175.50",
      link: "/trades/12345",
    },
  },
  {
    id: 2,
    type: "day",
    title: "大盘震荡，科技股活跃",
    content: `## 市场情况

- 大盘震荡，科技股活跃
- 成交量萎缩

## 今日交易

- 3笔交易，2胜1负
- 总盈利: +$520
- 最大回撤: -$180

## 心态

- 早盘过于激进，追高被套
- 下午调整策略，等待回调买入

## 明日计划

- 关注AI概念股
- 耐心等待更好的入场点`,
    isStarred: false,
    tags: [mockTags[4], mockTags[2]],
    createdAt: "2024-10-15T18:00:00Z",
    relatedInfo: {
      type: "day",
      label: "2024-10-15 交易日",
      link: "/days/2024-10-15",
    },
  },
  {
    id: 3,
    type: "misc",
    title: "龙头战法研究",
    content: `## 核心思路

1. 识别行业热点
2. 找出行业龙头
3. 等待回调买入
4. 止损：跌破5日线

## 待验证

- 如何准确识别真假热点
- 龙头股的定量标准

## 下一步

- 回测近3个月数据
- 建立选股模型`,
    isStarred: false,
    tags: [mockTags[7]],
    createdAt: "2024-10-12T09:15:00Z",
  },
  {
    id: 4,
    type: "trade",
    title: "TSLA 追高失败记录",
    content: `## 问题分析

早盘看到 TSLA 大涨就冲动追入，结果买在高点。

## 错误

1. 没有等待回调
2. 仓位过重
3. 情绪化交易

## 改进

- 严格执行交易计划
- 绝不追高
- 控制仓位`,
    isStarred: true,
    tags: [mockTags[1], mockTags[5], mockTags[6]],
    createdAt: "2024-10-14T10:30:00Z",
    relatedInfo: {
      type: "trade",
      label: "TSLA 买入 50股 @265.00",
      link: "/trades/12346",
    },
  },
  {
    id: 5,
    type: "misc",
    title: "《股票大作手回忆录》读书笔记",
    content: `## 核心观点

1. 顺势而为，不要逆势操作
2. 耐心等待最佳时机
3. 严格止损，保护本金

## 印象深刻的话

"市场永远是对的，错的只有自己"

## 应用到实盘

- 建立趋势跟踪系统
- 制定严格的止损策略`,
    isStarred: false,
    tags: [],
    createdAt: "2024-10-10T20:00:00Z",
  },
];

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteWithId[]>(mockNotes);
  const [tags, setTags] = useState<NoteTag[]>(mockTags);

  // UI 状态
  const [showEditor, setShowEditor] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // 过滤器状态
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [noteType, setNoteType] = useState<"all" | "trade" | "day" | "misc">("all");
  const [starredOnly, setStarredOnly] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // 过滤和搜索
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !note.title.toLowerCase().includes(query) &&
          !note.content.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // 类型过滤
      if (noteType !== "all" && note.type !== noteType) {
        return false;
      }

      // 标签过滤
      if (selectedTags.length > 0) {
        const noteTagIds = note.tags.map((t) => t.id);
        if (!selectedTags.some((tagId) => noteTagIds.includes(tagId))) {
          return false;
        }
      }

      // 收藏过滤
      if (starredOnly && !note.isStarred) {
        return false;
      }

      // 日期过滤
      const noteDate = new Date(note.createdAt).toISOString().split("T")[0];
      if (noteDate < dateRange.start || noteDate > dateRange.end) {
        return false;
      }

      return true;
    });
  }, [notes, searchQuery, selectedTags, noteType, starredOnly, dateRange]);

  // 分页
  const totalPages = Math.ceil(filteredNotes.length / perPage);
  const paginatedNotes = filteredNotes.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  // 处理函数
  const handleCreateNote = () => {
    setEditingNote(null);
    setShowEditor(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setShowEditor(true);
  };

  const handleSaveNote = (note: Note) => {
    if (note.id && note.createdAt) {
      // 更新
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...note, id: note.id, createdAt: note.createdAt! } as NoteWithId : n)));
    } else {
      // 新建
      const newNote: NoteWithId = {
        ...note,
        id: notes.length > 0 ? Math.max(...notes.map((n) => n.id)) + 1 : 1,
        createdAt: new Date().toISOString(),
      };
      setNotes((prev) => [newNote, ...prev]);
    }
  };

  const handleDeleteNote = (noteId: number) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const handleToggleStar = (noteId: number) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, isStarred: !n.isStarred } : n))
    );
  };

  const handleTagToggle = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateTag = (tag: Omit<NoteTag, "id" | "count">) => {
    const newTag = {
      ...tag,
      id: Math.max(...tags.map((t) => t.id)) + 1,
      count: 0,
    };
    setTags((prev) => [...prev, newTag]);
  };

  const handleUpdateTag = (id: number, updates: Partial<NoteTag>) => {
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const handleDeleteTag = (id: number) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">📝 交易笔记</h1>
          <p className="text-gray-500 mt-1">
            记录交易思考，积累交易经验
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowTagManager(true)}>
            <Tags className="w-4 h-4 mr-2" />
            管理标签
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
          <Button onClick={handleCreateNote}>
            <Plus className="w-4 h-4 mr-2" />
            新建笔记
          </Button>
        </div>
      </div>

      {/* 过滤器 */}
      <NoteFilters
        tags={tags}
        selectedTags={selectedTags}
        onTagToggle={handleTagToggle}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        noteType={noteType}
        onTypeChange={setNoteType}
        starredOnly={starredOnly}
        onStarredToggle={() => setStarredOnly(!starredOnly)}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* 统计信息 */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div>
          显示 {paginatedNotes.length} / {filteredNotes.length} 条笔记
          {filteredNotes.length !== notes.length && ` (共 ${notes.length} 条)`}
        </div>
        <div className="flex items-center gap-2">
          <span>每页显示:</span>
          <select
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border rounded px-2 py-1"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* 笔记列表 */}
      <div className="space-y-4">
        {paginatedNotes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg mb-2">没有找到笔记</p>
            <p className="text-sm">
              {searchQuery || selectedTags.length > 0
                ? "尝试调整筛选条件"
                : "点击右上角「新建笔记」开始记录"}
            </p>
          </div>
        ) : (
          paginatedNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEditNote}
              onDelete={handleDeleteNote}
              onToggleStar={handleToggleStar}
            />
          ))
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            上一页
          </Button>
          <span className="text-sm text-gray-500">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            下一页
          </Button>
        </div>
      )}

      {/* 编辑器对话框 */}
      <NoteEditor
        note={editingNote}
        availableTags={tags}
        open={showEditor}
        onClose={() => {
          setShowEditor(false);
          setEditingNote(null);
        }}
        onSave={handleSaveNote}
        onCreateTag={() => {
          setShowEditor(false);
          setShowTagManager(true);
        }}
      />

      {/* 标签管理对话框 */}
      <TagManager
        tags={tags}
        open={showTagManager}
        onClose={() => setShowTagManager(false)}
        onCreateTag={handleCreateTag}
        onUpdateTag={handleUpdateTag}
        onDeleteTag={handleDeleteTag}
      />
    </div>
  );
}

