"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export interface AlertConfig {
  targetTotalPnl?: number | null; // 达成盈利目标
  maxDrawdownPct?: number | null; // 最大回撤阈值
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (cfg: AlertConfig) => void;
  initial?: AlertConfig;
}

export default function AlertConfigDialog({ open, onClose, onSave, initial }: Props) {
  const [cfg, setCfg] = useState<AlertConfig>({ targetTotalPnl: null, maxDrawdownPct: null });

  useEffect(() => {
    if (initial) setCfg(initial);
  }, [initial]);

  const save = () => {
    onSave({
      targetTotalPnl: cfg.targetTotalPnl != null ? Number(cfg.targetTotalPnl) : null,
      maxDrawdownPct: cfg.maxDrawdownPct != null ? Number(cfg.maxDrawdownPct) : null,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader><DialogTitle>提醒配置</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div>
            <Label>盈利目标（达到即提醒，$）</Label>
            <Input type="number" value={cfg.targetTotalPnl ?? ""} onChange={(e) => setCfg({ ...cfg, targetTotalPnl: e.target.value === "" ? null : Number(e.target.value) })} placeholder="例如 1000" />
          </div>
          <div>
            <Label>最大回撤阈值（%）</Label>
            <Input type="number" value={cfg.maxDrawdownPct ?? ""} onChange={(e) => setCfg({ ...cfg, maxDrawdownPct: e.target.value === "" ? null : Number(e.target.value) })} placeholder="例如 10" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={save}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


