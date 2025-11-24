"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Trade } from "@/app/trades/types";

interface ManualTradeDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (trade: Trade) => void;
  nextId: number;
}

const MOOD_OPTIONS = [
  { value: 'FOMO', label: '上头 (FOMO)', emoji: '🤯' },
  { value: 'Greedy', label: '贪婪 (Greedy)', emoji: '🤑' },
  { value: 'Fearful', label: '恐惧 (Fearful)', emoji: '😱' },
  { value: 'Disciplined', label: '按计划 (Disciplined)', emoji: '🧘' },
] as const;

const MISTAKE_OPTIONS = [
  '止损过大', '过早平仓', '逆势扛单', '频繁交易', '无失误'
];

export default function ManualTradeDialog({ open, onClose, onSave, nextId }: ManualTradeDialogProps) {
  const [form, setForm] = useState({
    symbol: "",
    name: "",
    side: "buy",
    quantity: "",
    price: "",
    date: new Date().toISOString(),
    tags: "",
    // 新增字段
    mood: "" as Trade['mood'] | "",
    mistakes: [] as string[],
    strategy: "",
    imageUrl: "",
  });

  const handleMistakeToggle = (mistake: string) => {
    setForm(prev => {
      if (mistake === '无失误') {
        return { ...prev, mistakes: ['无失误'] };
      }
      const newMistakes = prev.mistakes.includes(mistake)
        ? prev.mistakes.filter(m => m !== mistake)
        : [...prev.mistakes.filter(m => m !== '无失误'), mistake];
      return { ...prev, mistakes: newMistakes };
    });
  };

  const handleSave = () => {
    const quantity = Number(form.quantity);
    const price = Number(form.price);
    if (!form.symbol || !price || price <= 0) return;
    const now = new Date().toISOString();
    const trade: Trade = {
      id: nextId,
      symbol: form.symbol.toUpperCase(),
      stockName: form.name || form.symbol.toUpperCase(),
      status: "pending",
      planType: form.side === "short" ? "short" : "long",
      entryPrice: price,
      entryQuantity: Number.isFinite(quantity) ? quantity : undefined,
      strategyTags: form.tags ? form.tags.split(",").map(s => s.trim()).filter(Boolean) : undefined,
      // 新增字段映射
      mood: form.mood || undefined,
      mistakes: form.mistakes.length > 0 ? form.mistakes : undefined,
      strategy: form.strategy || undefined,
      imageUrl: form.imageUrl || undefined,

      createdAt: form.date || now,
      updatedAt: now,
    } as Trade;
    onSave(trade);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>录入交易与心理复盘</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6 py-4">
          {/* 左侧：基础信息 */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">基础信息</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>股票代码</Label>
                <Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="AAPL" />
              </div>
              <div className="space-y-2">
                <Label>方向</Label>
                <Input value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })} placeholder="buy/short" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>价格</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>数量</Label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="100" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>策略模式</Label>
              <Input value={form.strategy} onChange={(e) => setForm({ ...form, strategy: e.target.value })} placeholder="例: 突破回踩, 消息面..." />
            </div>
          </div>

          {/* 右侧：心理与复盘 */}
          <div className="space-y-4 border-l pl-6">
            <h4 className="font-medium text-sm text-muted-foreground">心理与复盘</h4>

            {/* 心情选择 */}
            <div className="space-y-2">
              <Label>当时的心态 (Mood)</Label>
              <div className="flex flex-wrap gap-2">
                {MOOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setForm({ ...form, mood: option.value as Trade['mood'] })}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all text-sm",
                      form.mood === option.value
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-input hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <span>{option.emoji}</span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 错误标签 */}
            <div className="space-y-2">
              <Label>执行失误 (Mistakes)</Label>
              <div className="flex flex-wrap gap-2">
                {MISTAKE_OPTIONS.map((mistake) => (
                  <Badge
                    key={mistake}
                    variant={form.mistakes.includes(mistake) ? "destructive" : "outline"}
                    className={cn(
                      "cursor-pointer hover:opacity-80 transition-colors",
                      form.mistakes.includes(mistake) && mistake === '无失误' ? "bg-green-500 border-green-500" : ""
                    )}
                    onClick={() => handleMistakeToggle(mistake)}
                  >
                    {mistake}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>备注/Tags</Label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="额外标签..." />
            </div>

            {/* 图片上传 */}
            <div className="space-y-2">
              <Label>截图 (可选)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Simple client-side compression
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 800;
                        const scaleSize = MAX_WIDTH / img.width;
                        canvas.width = MAX_WIDTH;
                        canvas.height = img.height * scaleSize;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                        setForm({ ...form, imageUrl: compressedDataUrl });
                      };
                      img.src = event.target?.result as string;
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              {form.imageUrl && (
                <div className="mt-2 relative w-full h-32 rounded-md overflow-hidden border">
                  <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setForm({ ...form, imageUrl: "" })}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 18 18" /></svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave} disabled={!form.symbol || !form.price}>保存交易</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


