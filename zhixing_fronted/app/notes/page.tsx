"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Download, Tags, ArrowLeft } from "lucide-react";
import NoteCard from "@/components/notes/NoteCard";
import NoteFilters from "@/components/notes/NoteFilters";
import NoteEditor from "@/components/notes/NoteEditor";
import TagManager from "@/components/notes/TagManager";
import type { Note, NoteTag, NoteWithId, NoteType } from "./types";

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
    type: "stock",
    title: "AAPL - 苹果公司基本面分析",
    content: `## 基本面

- Q3财报超预期，营收增长12%
- iPhone 15 系列销售强劲
- 服务业务持续增长

## 技术面

- 突破月线阻力位 $180
- MACD金叉，动能良好
- 支撑位：$172

## 交易想法

- 回调到$175附近分批买入
- 目标价：$195
- 止损：$170`,
    isStarred: true,
    tags: [mockTags[0], mockTags[2]],
    createdAt: "2024-10-15T14:30:00Z",
    relatedId: "AAPL",
    relatedInfo: {
      type: "stock",
      label: "AAPL - 苹果公司",
      link: "/stock/AAPL",
    },
  },
  {
    id: 2,
    type: "market",
    title: "美股大盘观察 - 震荡行情",
    content: `## 市场情况

- 纳斯达克震荡，科技股活跃
- 成交量萎缩，观望情绪浓厚
- VIX指数下降，恐慌情绪缓解

## 板块轮动

- AI概念股领涨
- 传统能源股回调
- 消费股表现平淡

## 操作建议

- 短线操作为主
- 控制仓位，降低风险
- 关注科技股龙头`,
    isStarred: false,
    tags: [mockTags[4]],
    createdAt: "2024-10-15T18:00:00Z",
    relatedId: "US_MARKET",
    relatedInfo: {
      type: "market",
      label: "美股市场",
    },
  },
  {
    id: 3,
    type: "trade",
    title: "TSLA 突破交易复盘",
    content: `## 入场理由

- 突破三角形整理
- 成交量放大
- 马斯克发布利好消息

## 实际执行

- 入场：$265
- 出场：$278
- 盈利：+4.9%

## 教训

- 追高买入风险大
- 下次等待回调
- 严格执行止损`,
    isStarred: true,
    tags: [mockTags[0], mockTags[6]],
    createdAt: "2024-10-14T10:30:00Z",
    relatedId: "TSLA",
    relatedInfo: {
      type: "trade",
      label: "TSLA 交易",
      link: "/trades/12346",
    },
  },
  {
    id: 4,
    type: "pattern",
    title: "杯柄形态 (Cup and Handle) 研究",
    content: `## 形态特征

1. 圆弧底（杯底）
2. 小幅回调（手柄）
3. 突破颈线位

## 成功要素

- 形成时间：4-12周
- 回调幅度：10-15%
- 突破时放量

## 实战案例

- NVDA 2024年3月：成功率 85%
- META 2024年2月：成功率 78%

## 注意事项

- 假突破风险
- 需要配合基本面
- 止损设在手柄低点`,
    isStarred: false,
    tags: [mockTags[7]],
    createdAt: "2024-10-12T09:15:00Z",
    relatedId: "CUP_HANDLE",
    relatedInfo: {
      type: "pattern",
      label: "杯柄形态",
    },
  },
  {
    id: 5,
    type: "strategy",
    title: "动量突破策略详解",
    content: `## 策略核心

1. 识别强势股
2. 等待整理突破
3. 突破时重仓买入
4. 快速止盈止损

## 选股条件

- 近期涨幅 > 20%
- 成交量持续放大
- 基本面良好

## 风控规则

- 单笔止损 < 2%
- 最大持仓 < 30%
- 快进快出

## 回测数据

- 胜率：62%
- 盈亏比：2.3:1
- 年化收益：35%`,
    isStarred: true,
    tags: [mockTags[7], mockTags[2]],
    createdAt: "2024-10-10T20:00:00Z",
    relatedId: "MOMENTUM_BREAKOUT",
    relatedInfo: {
      type: "strategy",
      label: "动量突破策略",
      link: "/strategy/momentum-breakout",
    },
  },
  {
    id: 6,
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
- 制定严格的止损策略
- 控制情绪，避免冲动交易`,
    isStarred: false,
    tags: [],
    createdAt: "2024-10-08T20:00:00Z",
  },
];

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteWithId[]>(mockNotes);
  const [tags, setTags] = useState<NoteTag[]>(mockTags);

  // UI 状态
  const [showEditor, setShowEditor] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // 过滤器状态
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [noteType, setNoteType] = useState<"all" | NoteType>("all");
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
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">📝 笔记</h1>
            <p className="text-gray-500 mt-1">
              记录个股分析、市场观察、交易复盘、策略研究
            </p>
          </div>
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

