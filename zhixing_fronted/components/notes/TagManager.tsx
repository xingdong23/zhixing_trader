"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import type { NoteTag } from "@/app/notes/types";

interface TagManagerProps {
  tags: NoteTag[];
  open: boolean;
  onClose: () => void;
  onCreateTag: (tag: Omit<NoteTag, "id" | "count">) => void;
  onUpdateTag: (id: number, tag: Partial<NoteTag>) => void;
  onDeleteTag: (id: number) => void;
}

const presetColors = [
  { name: "绿色", value: "#10b981" },
  { name: "红色", value: "#ef4444" },
  { name: "蓝色", value: "#3b82f6" },
  { name: "黄色", value: "#f59e0b" },
  { name: "紫色", value: "#8b5cf6" },
  { name: "灰色", value: "#6b7280" },
  { name: "橙色", value: "#f97316" },
  { name: "粉色", value: "#ec4899" },
];

export default function TagManager({
  tags,
  open,
  onClose,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: TagManagerProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", color: presetColors[0].value });

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    if (editingId) {
      onUpdateTag(editingId, formData);
      setEditingId(null);
    } else {
      onCreateTag(formData);
      setShowNewForm(false);
    }
    setFormData({ name: "", color: presetColors[0].value });
  };

  const handleEdit = (tag: NoteTag) => {
    setEditingId(tag.id);
    setFormData({ name: tag.name, color: tag.color });
    setShowNewForm(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowNewForm(false);
    setFormData({ name: "", color: presetColors[0].value });
  };

  const handleDelete = (id: number) => {
    if (confirm("确定要删除这个标签吗？这不会删除相关笔记。")) {
      onDeleteTag(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>管理笔记标签</span>
            {!showNewForm && !editingId && (
              <Button size="sm" onClick={() => setShowNewForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                新建标签
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 新建/编辑表单 */}
          {(showNewForm || editingId) && (
            <div className="p-4 border rounded-lg space-y-4 bg-gray-50 dark:bg-gray-900">
              <div className="space-y-2">
                <Label>标签名称</Label>
                <Input
                  placeholder="输入标签名称..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>标签颜色</Label>
                <div className="flex flex-wrap gap-2">
                  {presetColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-12 h-12 rounded-lg border-2 transition-all hover:scale-110 ${
                        formData.color === color.value ? "ring-2 ring-offset-2 ring-black dark:ring-white" : ""
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <span className="text-sm text-gray-500">或自定义颜色</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>预览</Label>
                <Badge
                  style={{ backgroundColor: formData.color, color: "white" }}
                  className="text-base px-4 py-2"
                >
                  {formData.name || "标签名称"}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={!formData.name.trim()}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingId ? "更新" : "创建"}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-2" />
                  取消
                </Button>
              </div>
            </div>
          )}

          {/* 标签列表 */}
          <div className="space-y-2">
            <Label>已有标签 ({tags.length})</Label>
            {tags.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                还没有标签，点击右上角创建第一个标签
              </div>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        style={{ backgroundColor: tag.color, color: "white" }}
                        className="px-3 py-1"
                      >
                        {tag.name}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        使用次数: {tag.count || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(tag)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tag.id)}
                        disabled={(tag.count || 0) > 0}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

