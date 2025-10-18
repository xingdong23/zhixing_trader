"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Filter, X, Star, Calendar } from "lucide-react";
import { useState } from "react";
import type { NoteTag } from "@/app/notes/types";

interface NoteFiltersProps {
  tags: NoteTag[];
  selectedTags: number[];
  onTagToggle: (tagId: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  noteType: "all" | "trade" | "day" | "misc";
  onTypeChange: (type: "all" | "trade" | "day" | "misc") => void;
  starredOnly: boolean;
  onStarredToggle: () => void;
  dateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
}

export default function NoteFilters({
  tags,
  selectedTags,
  onTagToggle,
  searchQuery,
  onSearchChange,
  noteType,
  onTypeChange,
  starredOnly,
  onStarredToggle,
  dateRange,
  onDateRangeChange,
}: NoteFiltersProps) {
  const [showFilters, setShowFilters] = useState(true);

  const noteTypes = [
    { value: "all" as const, label: "全部笔记" },
    { value: "trade" as const, label: "交易笔记" },
    { value: "day" as const, label: "日笔记" },
    { value: "misc" as const, label: "杂项笔记" },
  ];

  const clearFilters = () => {
    onSearchChange("");
    onTypeChange("all");
    selectedTags.forEach(tagId => onTagToggle(tagId));
    if (starredOnly) onStarredToggle();
  };

  const hasActiveFilters = searchQuery || noteType !== "all" || selectedTags.length > 0 || starredOnly;

  return (
    <Card className="p-4 space-y-4">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="font-medium">过滤器</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2">
              {[
                searchQuery ? 1 : 0,
                noteType !== "all" ? 1 : 0,
                selectedTags.length,
                starredOnly ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              清除
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? "收起" : "展开"}
          </Button>
        </div>
      </div>

      {showFilters && (
        <>
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜索笔记标题或内容..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 日期范围 */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
              className="flex-1"
            />
            <span className="text-gray-500">至</span>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
              className="flex-1"
            />
          </div>

          {/* 笔记类型 */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              笔记类型
            </label>
            <div className="flex flex-wrap gap-2">
              {noteTypes.map((type) => (
                <Button
                  key={type.value}
                  variant={noteType === type.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => onTypeChange(type.value)}
                  className="flex-shrink-0"
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 收藏状态 */}
          <div>
            <Button
              variant={starredOnly ? "default" : "outline"}
              size="sm"
              onClick={onStarredToggle}
              className="w-full"
            >
              <Star className={`w-4 h-4 mr-2 ${starredOnly ? "fill-current" : ""}`} />
              {starredOnly ? "显示全部" : "仅显示收藏"}
            </Button>
          </div>

          {/* 标签过滤 */}
          {tags.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                标签过滤
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    style={{
                      backgroundColor: selectedTags.includes(tag.id) ? tag.color : "transparent",
                      color: selectedTags.includes(tag.id) ? "white" : tag.color,
                      borderColor: tag.color,
                    }}
                    className="cursor-pointer border hover:opacity-80 transition-opacity"
                    onClick={() => onTagToggle(tag.id)}
                  >
                    {tag.name} ({tag.count})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

