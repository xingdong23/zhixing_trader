"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, TrendingUp, TrendingDown } from "lucide-react";
import type { Trade, TradeType } from "@/app/trades/types";

interface TradePlanFormProps {
  trade?: Trade | null;
  open: boolean;
  onClose: () => void;
  onSave: (trade: Partial<Trade>) => void;
}

export default function TradePlanForm({ trade, open, onClose, onSave }: TradePlanFormProps) {
  const [formData, setFormData] = useState<Partial<Trade>>({
    symbol: "",
    stockName: "",
    planType: "long",
    planEntryPrice: undefined,
    planEntryPriceRangeLow: undefined,
    planEntryPriceRangeHigh: undefined,
    planQuantity: undefined,
    planStopLoss: undefined,
    planTakeProfit: undefined,
    planNotes: "",
    planStrategy: "",
  });

  useEffect(() => {
    if (trade) {
      setFormData(trade);
    } else {
      setFormData({
        symbol: "",
        stockName: "",
        planType: "long",
        planEntryPrice: undefined,
        planEntryPriceRangeLow: undefined,
        planEntryPriceRangeHigh: undefined,
        planQuantity: undefined,
        planStopLoss: undefined,
        planTakeProfit: undefined,
        planNotes: "",
        planStrategy: "",
      });
    }
  }, [trade, open]);

  const handleSave = () => {
    if (!formData.symbol || !formData.planType) {
      alert("请填写必填项");
      return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {trade ? "编辑交易计划" : "创建交易计划"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="symbol">
                股票代码 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="symbol"
                placeholder="例如: AAPL"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <Label htmlFor="stockName">股票名称</Label>
              <Input
                id="stockName"
                placeholder="例如: Apple Inc."
                value={formData.stockName}
                onChange={(e) => setFormData({ ...formData, stockName: e.target.value })}
              />
            </div>
          </div>

          {/* 交易类型 */}
          <div>
            <Label>
              交易类型 <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-4 mt-2">
              <Button
                type="button"
                variant={formData.planType === "long" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setFormData({ ...formData, planType: "long" })}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                做多
              </Button>
              <Button
                type="button"
                variant={formData.planType === "short" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setFormData({ ...formData, planType: "short" })}
              >
                <TrendingDown className="w-4 h-4 mr-2" />
                做空
              </Button>
            </div>
          </div>

          {/* 入场价格 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="planEntryPrice">计划入场价</Label>
              <Input
                id="planEntryPrice"
                type="number"
                step="0.01"
                placeholder="180.50"
                value={formData.planEntryPrice || ""}
                onChange={(e) => setFormData({ ...formData, planEntryPrice: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div>
              <Label htmlFor="planEntryPriceRangeLow">价格区间-低</Label>
              <Input
                id="planEntryPriceRangeLow"
                type="number"
                step="0.01"
                placeholder="179.00"
                value={formData.planEntryPriceRangeLow || ""}
                onChange={(e) => setFormData({ ...formData, planEntryPriceRangeLow: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div>
              <Label htmlFor="planEntryPriceRangeHigh">价格区间-高</Label>
              <Input
                id="planEntryPriceRangeHigh"
                type="number"
                step="0.01"
                placeholder="182.00"
                value={formData.planEntryPriceRangeHigh || ""}
                onChange={(e) => setFormData({ ...formData, planEntryPriceRangeHigh: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          </div>

          {/* 数量 */}
          <div>
            <Label htmlFor="planQuantity">计划数量</Label>
            <Input
              id="planQuantity"
              type="number"
              placeholder="100"
              value={formData.planQuantity || ""}
              onChange={(e) => setFormData({ ...formData, planQuantity: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>

          {/* 止损止盈 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="planStopLoss">止损价</Label>
              <Input
                id="planStopLoss"
                type="number"
                step="0.01"
                placeholder="175.00"
                value={formData.planStopLoss || ""}
                onChange={(e) => setFormData({ ...formData, planStopLoss: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div>
              <Label htmlFor="planTakeProfit">止盈价</Label>
              <Input
                id="planTakeProfit"
                type="number"
                step="0.01"
                placeholder="190.00"
                value={formData.planTakeProfit || ""}
                onChange={(e) => setFormData({ ...formData, planTakeProfit: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          </div>

          {/* 交易策略 */}
          <div>
            <Label htmlFor="planStrategy">交易策略/思路</Label>
            <Textarea
              id="planStrategy"
              placeholder="描述你的交易策略和入场理由..."
              rows={3}
              value={formData.planStrategy}
              onChange={(e) => setFormData({ ...formData, planStrategy: e.target.value })}
            />
          </div>

          {/* 计划笔记 */}
          <div>
            <Label htmlFor="planNotes">计划笔记</Label>
            <Textarea
              id="planNotes"
              placeholder="记录计划阶段的想法和观察..."
              rows={4}
              value={formData.planNotes}
              onChange={(e) => setFormData({ ...formData, planNotes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            取消
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

