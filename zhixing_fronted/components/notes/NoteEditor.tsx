"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Save, X, Plus, Tag } from "lucide-react";

interface NoteTag {
  id: number;
  name: string;
  color: string;
  count?: number;
}

interface Note {
  id?: number;
  type: "trade" | "day" | "misc";
  title: string;
  content: string;
  isStarred: boolean;
  tags: NoteTag[];
  relatedId?: number;
}

interface NoteEditorProps {
  note?: Note | null;
  availableTags: NoteTag[];
  open: boolean;
  onClose: () => void;
  onSave: (note: Note) => void;
  onCreateTag?: () => void;
}

export default function NoteEditor({
  note,
  availableTags,
  open,
  onClose,
  onSave,
  onCreateTag,
}: NoteEditorProps) {
  const [formData, setFormData] = useState<Note>({
    type: "misc",
    title: "",
    content: "",
    isStarred: false,
    tags: [],
  });

  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  useEffect(() => {
    if (note) {
      setFormData(note);
      setSelectedTagIds(note.tags.map(t => t.id));
    } else {
      setFormData({
        type: "misc",
        title: "",
        content: "",
        isStarred: false,
        tags: [],
      });
      setSelectedTagIds([]);
    }
  }, [note, open]);

  const handleSubmit = () => {
    const selectedTags = availableTags.filter(tag => selectedTagIds.includes(tag.id));
    onSave({
      ...formData,
      tags: selectedTags,
    });
    onClose();
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const noteTypes = [
    { value: "trade", label: "交易笔记" },
    { value: "day", label: "日笔记" },
    { value: "misc", label: "杂项笔记" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{note?.id ? "编辑笔记" : "新建笔记"}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFormData({ ...formData, isStarred: !formData.isStarred })}
            >
              <Star className={`w-5 h-5 ${formData.isStarred ? "fill-yellow-500 text-yellow-500" : ""}`} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 笔记类型 */}
          <div className="space-y-2">
            <Label>笔记类型</Label>
            <Select
              value={formData.type}
              onValueChange={(value: "trade" | "day" | "misc") =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {noteTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 关联对象（简化版，实际需要根据类型动态选择） */}
          {formData.type !== "misc" && (
            <div className="space-y-2">
              <Label>
                {formData.type === "trade" ? "关联交易" : "关联日期"}
              </Label>
              <Input
                placeholder={formData.type === "trade" ? "选择交易..." : "选择日期..."}
                disabled
              />
            </div>
          )}

          {/* 标题 */}
          <div className="space-y-2">
            <Label>标题</Label>
            <Input
              placeholder="输入笔记标题..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* 标签 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                标签
              </Label>
              {onCreateTag && (
                <Button variant="ghost" size="sm" onClick={onCreateTag}>
                  <Plus className="w-4 h-4 mr-1" />
                  新建标签
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[60px]">
              {availableTags.length === 0 ? (
                <span className="text-sm text-gray-400">暂无标签，点击右上角创建</span>
              ) : (
                availableTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    style={{
                      backgroundColor: selectedTagIds.includes(tag.id) ? tag.color : "transparent",
                      color: selectedTagIds.includes(tag.id) ? "white" : tag.color,
                      borderColor: tag.color,
                    }}
                    className="cursor-pointer border hover:opacity-80 transition-opacity"
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* 内容 */}
          <div className="space-y-2">
            <Label>内容</Label>
            <Textarea
              placeholder="写下你的交易思考..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={15}
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>支持 Markdown 格式</span>
              <span>{formData.content.length} 字</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.title || !formData.content}>
            <Save className="w-4 h-4 mr-2" />
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

