"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Plus, Tag } from "lucide-react";
import type { Note, NoteTag, NoteType } from "@/app/notes/types";
import { NOTE_TYPE_CONFIG } from "@/app/notes/types";
import { mockTags } from "@/app/notes/mockData";

export interface UnifiedNoteResult extends Note {
  relatedType?: "stock" | "trade" | "strategy" | "pattern" | "market";
  relatedId?: string; // 如股票代码
  attachments?: { url: string; type: "image" }[];
  alert?: {
    enabled: boolean;
    type: "price" | "change" | "volume" | "indicator" | "custom";
    op: "above" | "below" | "between";
    value?: number;
    range?: { min: number; max: number };
    notes?: string;
  };
}

interface UnifiedNoteDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: UnifiedNoteResult) => void;
  preset?: { symbol?: string; symbolName?: string; relatedType?: UnifiedNoteResult["relatedType"]; defaultTags?: number[] };
  locks?: { symbol?: boolean };
  enableAlert?: boolean;
}

export default function UnifiedNoteDialog({ open, onClose, onSave, preset, locks, enableAlert = true }: UnifiedNoteDialogProps) {
  const [availableTags] = useState<NoteTag[]>(mockTags);
  const [formData, setFormData] = useState<Note>({
    type: (preset?.relatedType === "stock" ? "stock" : "misc") as NoteType,
    title: "",
    content: "",
    isStarred: false,
    tags: [],
  });
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(preset?.defaultTags || []);

  const [relatedId, setRelatedId] = useState<string>(preset?.symbol || "");
  const [relatedName] = useState<string | undefined>(preset?.symbolName);

  const [alertEnabled, setAlertEnabled] = useState<boolean>(false);
  const [alertType, setAlertType] = useState<"price" | "change" | "volume" | "indicator" | "custom">("price");
  const [alertOp, setAlertOp] = useState<"above" | "below" | "between">("above");
  const [alertValue, setAlertValue] = useState<string>("");
  const [alertRangeMin, setAlertRangeMin] = useState<string>("");
  const [alertRangeMax, setAlertRangeMax] = useState<string>("");
  const [alertNotes, setAlertNotes] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    // 重置依赖 preset 的字段
    setRelatedId(preset?.symbol || "");
    setSelectedTagIds(preset?.defaultTags || []);
    setFormData((prev) => ({
      ...prev,
      type: (preset?.relatedType === "stock" ? "stock" : prev.type) as NoteType,
    }));
  }, [open, preset]);

  const noteTypes = Object.entries(NOTE_TYPE_CONFIG).map(([key, config]) => ({ value: key as NoteType, label: config.label, icon: config.icon }));

  const toggleTag = (id: number) => {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = () => {
    const tags = availableTags.filter((t) => selectedTagIds.includes(t.id));
    const payload: UnifiedNoteResult = {
      ...formData,
      tags,
      relatedType: preset?.relatedType || (formData.type === "stock" ? "stock" : undefined),
      relatedId: formData.type === "stock" ? relatedId : undefined,
      attachments: [],
      alert: enableAlert
        ? {
            enabled: alertEnabled,
            type: alertType,
            op: alertOp,
            value: alertOp !== "between" ? (alertValue ? Number(alertValue) : undefined) : undefined,
            range: alertOp === "between" ? { min: Number(alertRangeMin || 0), max: Number(alertRangeMax || 0) } : undefined,
            notes: alertNotes || undefined,
          }
        : undefined,
    };
    onSave(payload);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>新建笔记</span>
            <Button variant="ghost" size="sm" onClick={() => setFormData({ ...formData, isStarred: !formData.isStarred })}>
              <Star className={`w-5 h-5 ${formData.isStarred ? "fill-yellow-500 text-yellow-500" : ""}`} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 笔记类型 & 标题 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>笔记类型</Label>
              <Select value={formData.type} onValueChange={(v: NoteType) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {noteTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>标题（可选）</Label>
              <Input placeholder="输入笔记标题..." value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>
          </div>

          {/* 关联对象（股票） */}
          {formData.type === "stock" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>股票代码</Label>
                <Input value={relatedId} onChange={(e) => setRelatedId(e.target.value.toUpperCase())} disabled={locks?.symbol} />
              </div>
              {relatedName && (
                <div>
                  <Label>股票名称</Label>
                  <Input value={relatedName} disabled />
                </div>
              )}
            </div>
          )}

          {/* 标签 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" /> 标签
              </Label>
              <Button variant="ghost" size="sm">
                <Plus className="w-4 h-4 mr-1" /> 新建标签
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[60px]">
              {availableTags.map((tag) => (
                <Badge
                  key={tag.id}
                  style={{ backgroundColor: selectedTagIds.includes(tag.id) ? tag.color : "transparent", color: selectedTagIds.includes(tag.id) ? "white" : tag.color, borderColor: tag.color }}
                  className="cursor-pointer border hover:opacity-80 transition-opacity"
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* 内容 */}
          <div className="space-y-2">
            <Label>内容</Label>
            <Textarea rows={12} placeholder="写下你的交易思考..." value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} />
          </div>

          {/* 提醒（可选） */}
          {enableAlert && (
            <div className="space-y-3 border rounded-lg p-3">
              <div className="flex items-center gap-3">
                <Checkbox id="enable-alert" checked={alertEnabled} onCheckedChange={(v) => setAlertEnabled(Boolean(v))} />
                <Label htmlFor="enable-alert">启用提醒（可选）</Label>
              </div>
              {alertEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>提醒类型</Label>
                    <Select value={alertType} onValueChange={(v: any) => setAlertType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price">价格</SelectItem>
                        <SelectItem value="change">涨跌幅</SelectItem>
                        <SelectItem value="volume">成交量</SelectItem>
                        <SelectItem value="indicator">指标</SelectItem>
                        <SelectItem value="custom">自定义</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>触发条件</Label>
                    <Select value={alertOp} onValueChange={(v: any) => setAlertOp(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="above">高于</SelectItem>
                        <SelectItem value="below">低于</SelectItem>
                        <SelectItem value="between">介于</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {alertOp !== "between" ? (
                    <div>
                      <Label>数值</Label>
                      <Input type="number" value={alertValue} onChange={(e) => setAlertValue(e.target.value)} placeholder="例如：200" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>最小值</Label>
                        <Input type="number" value={alertRangeMin} onChange={(e) => setAlertRangeMin(e.target.value)} />
                      </div>
                      <div>
                        <Label>最大值</Label>
                        <Input type="number" value={alertRangeMax} onChange={(e) => setAlertRangeMax(e.target.value)} />
                      </div>
                    </div>
                  )}
                  <div className="md:col-span-3">
                    <Label>备注（可选）</Label>
                    <Input value={alertNotes} onChange={(e) => setAlertNotes(e.target.value)} placeholder="提醒原因或说明..." />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave}>保存笔记</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


