"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Trade } from "@/app/trades/types";

interface ManualTradeDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (trade: Trade) => void;
  nextId: number;
}

export default function ManualTradeDialog({ open, onClose, onSave, nextId }: ManualTradeDialogProps) {
  const [form, setForm] = useState({
    symbol: "",
    name: "",
    side: "buy",
    quantity: "",
    price: "",
    date: new Date().toISOString(),
    tags: "",
  });

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
      createdAt: form.date || now,
      updatedAt: now,
    } as Trade;
    onSave(trade);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>手动录入交易</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div>
            <Label>股票代码</Label>
            <Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="AAPL" />
          </div>
          <div>
            <Label>股票名称</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Apple Inc." />
          </div>
          <div>
            <Label>方向（buy/short）</Label>
            <Input value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })} placeholder="buy" />
          </div>
          <div>
            <Label>数量</Label>
            <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="100" />
          </div>
          <div>
            <Label>价格</Label>
            <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="182.30" />
          </div>
          <div>
            <Label>时间</Label>
            <Input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>策略标签（用逗号分隔）</Label>
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="趋势, 突破, 回调买入" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


