"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Edit, Trash2, ExternalLink, Calendar } from "lucide-react";
import { useState } from "react";
import type { Note, NoteTag, NoteWithId } from "@/app/notes/types";
import { NOTE_TYPE_CONFIG } from "@/app/notes/types";

interface NoteCardProps {
  note: NoteWithId;
  onEdit?: (note: Note) => void;
  onDelete?: (noteId: number) => void;
  onToggleStar?: (noteId: number) => void;
}

export default function NoteCard({ note, onEdit, onDelete, onToggleStar }: NoteCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const typeConfig = NOTE_TYPE_CONFIG[note.type];

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete?.(note.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  // 提取纯文本内容用于预览
  const getPlainText = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="space-y-4">
        {/* 标题行 */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {note.isStarred && (
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
              )}
              <h3 className="text-lg font-semibold truncate">{note.title}</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${typeConfig.color} border-0`}>
                {typeConfig.icon} {typeConfig.label}
              </Badge>
              {note.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  style={{ backgroundColor: tag.color + "20", color: tag.color, borderColor: tag.color }}
                  className="border"
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* 内容预览 */}
        <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
          {getPlainText(note.content)}
        </div>

        {/* 底部信息和操作 */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(note.createdAt).toLocaleDateString("zh-CN")}
            </span>
            {note.relatedInfo && (
              <span className="flex items-center gap-1">
                关联: {note.relatedInfo.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleStar?.(note.id)}
              className="h-8 w-8 p-0"
            >
              <Star className={`w-4 h-4 ${note.isStarred ? "fill-yellow-500 text-yellow-500" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit?.(note)}
              className="h-8 w-8 p-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
            {note.relatedInfo?.link && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(note.relatedInfo?.link, "_blank")}
                className="h-8 w-8 p-0"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className={`h-8 w-8 p-0 ${showDeleteConfirm ? "text-red-600" : ""}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="text-xs text-red-600 text-center py-1 bg-red-50 dark:bg-red-900/20 rounded">
            再次点击删除按钮确认删除
          </div>
        )}
      </div>
    </Card>
  );
}

