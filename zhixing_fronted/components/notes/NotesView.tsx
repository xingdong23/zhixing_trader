"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Download, Tags } from "lucide-react";
import NoteCard from "@/components/notes/NoteCard";
import NoteFilters from "@/components/notes/NoteFilters";
import NoteEditor from "@/components/notes/NoteEditor";
import TagManager from "@/components/notes/TagManager";
import type { Note, NoteTag, NoteWithId, NoteType } from "@/app/notes/types";

// Mock数据
import { mockNotes, mockTags } from "@/app/notes/mockData";

export default function NotesView() {
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

  // 筛选笔记
  const filteredNotes = useMemo(() => {
    let result = notes;

    // 搜索
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.content.toLowerCase().includes(query)
      );
    }

    // 类型筛选
    if (noteType !== "all") {
      result = result.filter((n) => n.type === noteType);
    }

    // 标签筛选
    if (selectedTags.length > 0) {
      result = result.filter((n) =>
        n.tags.some((tag) => selectedTags.includes(tag.id))
      );
    }

    // 收藏筛选
    if (starredOnly) {
      result = result.filter((n) => n.isStarred);
    }

    // 日期筛选
    if (dateRange.start) {
      result = result.filter(
        (n) => new Date(n.createdAt) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      result = result.filter(
        (n) => new Date(n.createdAt) <= new Date(dateRange.end + "T23:59:59")
      );
    }

    return result;
  }, [notes, searchQuery, noteType, selectedTags, starredOnly, dateRange]);

  // 分页
  const paginatedNotes = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    return filteredNotes.slice(start, end);
  }, [filteredNotes, currentPage, perPage]);

  const totalPages = Math.ceil(filteredNotes.length / perPage);

  // 保存笔记
  const handleSaveNote = (note: Note) => {
    if (note.id) {
      // 更新
      setNotes((prev) =>
        prev.map((n) =>
          n.id === note.id
            ? ({ ...note, id: note.id, createdAt: n.createdAt } as NoteWithId)
            : n
        )
      );
    } else {
      // 新建
      const newNote: NoteWithId = {
        ...note,
        id: Math.max(...notes.map((n) => n.id)) + 1,
        createdAt: new Date().toISOString(),
      };
      setNotes((prev) => [newNote, ...prev]);
    }
    setShowEditor(false);
    setEditingNote(null);
  };

  // 删除笔记
  const handleDeleteNote = (noteId: number) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  // 切换收藏
  const handleToggleStar = (noteId: number) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, isStarred: !n.isStarred } : n
      )
    );
  };

  // 编辑笔记
  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setShowEditor(true);
  };

  // 新建笔记
  const handleNewNote = () => {
    setEditingNote(null);
    setShowEditor(true);
  };

  // 导出笔记
  const handleExport = () => {
    const dataStr = JSON.stringify(filteredNotes, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `notes-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 标签管理
  const handleCreateTag = (tag: Omit<NoteTag, "id" | "count">) => {
    const newTag: NoteTag = { 
      ...tag, 
      id: Math.max(0, ...tags.map((t) => t.id)) + 1,
      count: 0
    };
    setTags((prev) => [...prev, newTag]);
  };

  const handleUpdateTag = (id: number, updates: Partial<NoteTag>) => {
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    // 更新笔记中的标签
    setNotes((prev) =>
      prev.map((note) => ({
        ...note,
        tags: note.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      }))
    );
  };

  const handleDeleteTag = (id: number) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
    // 从笔记中移除该标签
    setNotes((prev) =>
      prev.map((note) => ({
        ...note,
        tags: note.tags.filter((t) => t.id !== id),
      }))
    );
  };

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <div></div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowTagManager(true)}>
            <Tags className="w-4 h-4 mr-2" />
            管理标签
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            导出笔记
          </Button>
          <Button onClick={handleNewNote}>
            <Plus className="w-4 h-4 mr-2" />
            新建笔记
          </Button>
        </div>
      </div>

      {/* 过滤器 */}
      <NoteFilters
        tags={tags}
        selectedTags={selectedTags}
        onTagToggle={(tagId) => {
          setSelectedTags((prev) =>
            prev.includes(tagId)
              ? prev.filter((id) => id !== tagId)
              : [...prev, tagId]
          );
        }}
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
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>共 {filteredNotes.length} 条笔记</span>
        {selectedTags.length > 0 && (
          <span>• 已选择 {selectedTags.length} 个标签</span>
        )}
        {starredOnly && <span>• 仅显示收藏</span>}
      </div>

      {/* 笔记列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedNotes.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <p>暂无笔记</p>
            <Button className="mt-4" onClick={handleNewNote}>
              <Plus className="w-4 h-4 mr-2" />
              创建第一条笔记
            </Button>
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
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            上一页
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            第 {currentPage} / {totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            下一页
          </Button>
        </div>
      )}

      {/* 笔记编辑器 */}
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

      {/* 标签管理器 */}
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

