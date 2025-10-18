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
import type { Note, NoteTag, NoteType } from "@/app/notes/types";
import { NOTE_TYPE_CONFIG } from "@/app/notes/types";

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

  const noteTypes: { value: NoteType; label: string; icon: string }[] = Object.entries(NOTE_TYPE_CONFIG).map(
    ([key, config]) => ({
      value: key as NoteType,
      label: config.label,
      icon: config.icon,
    })
  );

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
              onValueChange={(value: NoteType) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {noteTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 关联对象（根据类型显示不同的输入框） */}
          {formData.type !== "misc" && (
            <div className="space-y-2">
              <Label>
                {formData.type === "stock" && "股票代码"}
                {formData.type === "market" && "市场"}
                {formData.type === "trade" && "关联交易"}
                {formData.type === "pattern" && "模式名称"}
                {formData.type === "strategy" && "策略名称"}
              </Label>
              <Input
                placeholder={
                  formData.type === "stock" ? "例如：AAPL" :
                  formData.type === "market" ? "例如：美股、A股" :
                  formData.type === "trade" ? "选择交易..." :
                  formData.type === "pattern" ? "例如：杯柄形态" :
                  formData.type === "strategy" ? "例如：动量突破" :
                  ""
                }
                value={formData.relatedId || ""}
                onChange={(e) => setFormData({ ...formData, relatedId: e.target.value })}
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

