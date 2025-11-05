"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";
import type { TradeFilters as TradeFiltersType, TradeStatus, TradeType } from "@/app/trades/types";

interface TradeFiltersProps {
  filters: TradeFiltersType;
  onFilterChange: (filters: TradeFiltersType) => void;
  onReset: () => void;
}

const statusOptions: { value: TradeStatus; label: string }[] = [
  { value: "planned", label: "计划中" },
  { value: "pending", label: "等待执行" },
  { value: "active", label: "持仓中" },
  { value: "closed", label: "已平仓" },
  { value: "cancelled", label: "已取消" },
];

const tradeTypeOptions: { value: TradeType; label: string }[] = [
  { value: "long", label: "做多" },
  { value: "short", label: "做空" },
];

export default function TradeFilters({ filters, onFilterChange, onReset }: TradeFiltersProps) {
  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== "");

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="font-medium">筛选条件</span>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              <X className="w-4 h-4 mr-1" />
              清空
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 股票代码搜索 */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">股票代码</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索股票代码"
                value={filters.symbol || ""}
                onChange={(e) => onFilterChange({ ...filters, symbol: e.target.value })}
                className="pl-8"
              />
            </div>
          </div>

          {/* 交易类型 */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">交易类型</label>
            <Select
              value={filters.tradeType || "all"}
              onValueChange={(value) => 
                onFilterChange({ ...filters, tradeType: value === "all" ? undefined : value as TradeType })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="全部类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {tradeTypeOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 开始日期 */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">开始日期</label>
            <Input
              type="date"
              value={filters.startDate || ""}
              onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value })}
            />
          </div>

          {/* 结束日期 */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">结束日期</label>
            <Input
              type="date"
              value={filters.endDate || ""}
              onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value })}
            />
          </div>

          {/* 最小盈亏 */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">最小盈亏</label>
            <Input
              type="number"
              placeholder="最小盈亏"
              value={filters.minPnl || ""}
              onChange={(e) => onFilterChange({ ...filters, minPnl: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>

          {/* 最大盈亏 */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">最大盈亏</label>
            <Input
              type="number"
              placeholder="最大盈亏"
              value={filters.maxPnl || ""}
              onChange={(e) => onFilterChange({ ...filters, maxPnl: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

