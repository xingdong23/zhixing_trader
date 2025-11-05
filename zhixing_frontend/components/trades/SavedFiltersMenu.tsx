"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TradeFilters } from "@/app/trades/types";
import { Input } from "@/components/ui/input";

interface SavedFilter {
  id: string;
  name: string;
  filters: TradeFilters;
  createdAt: string;
}

interface SavedFiltersMenuProps {
  current: TradeFilters;
  onApply: (filters: TradeFilters) => void;
}

export default function SavedFiltersMenu({ current, onApply }: SavedFiltersMenuProps) {
  const [items, setItems] = useState<SavedFilter[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [newName, setNewName] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("savedTradeFilters");
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("savedTradeFilters", JSON.stringify(items)); } catch {}
  }, [items]);

  const selected = useMemo(() => items.find(i => i.id === selectedId) || null, [items, selectedId]);

  const saveCurrent = () => {
    const name = newName.trim() || `筛选-${new Date().toLocaleString()}`;
    const item: SavedFilter = { id: String(Date.now()), name, filters: current, createdAt: new Date().toISOString() };
    setItems(prev => [item, ...prev]);
    setNewName("");
  };

  const applySelected = () => {
    if (selected) onApply(selected.filters);
  };

  const deleteSelected = () => {
    if (!selected) return;
    setItems(prev => prev.filter(i => i.id !== selected.id));
    setSelectedId("");
  };

  return (
    <div className="flex items-center gap-2">
      <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="筛选名称" className="h-8 w-36" />
      <Button variant="outline" className="h-8" onClick={saveCurrent}>保存筛选</Button>
      <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="h-8 border rounded px-2 text-sm">
        <option value="">选择已保存筛选</option>
        {items.map(i => (
          <option key={i.id} value={i.id}>{i.name}</option>
        ))}
      </select>
      <Button variant="outline" className="h-8" onClick={applySelected} disabled={!selectedId}>应用</Button>
      <Button variant="outline" className="h-8" onClick={deleteSelected} disabled={!selectedId}>删除</Button>
    </div>
  );
}


