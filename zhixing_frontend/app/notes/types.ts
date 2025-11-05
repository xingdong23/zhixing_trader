// 笔记系统的类型定义

export interface NoteTag {
  id: number;
  name: string;
  color: string;
  count?: number;
}

// 笔记类型
export type NoteType = "stock" | "market" | "trade" | "pattern" | "strategy" | "misc";

export interface Note {
  id?: number;
  type: NoteType;
  title: string;
  content: string;
  isStarred: boolean;
  tags: NoteTag[];
  createdAt?: string;
  // 关联信息
  relatedId?: string; // 股票代码、策略ID等
  relatedInfo?: {
    type: string;    // 类型描述
    label: string;   // 显示标签
    link?: string;   // 跳转链接
  };
}

export type NoteWithId = Note & { id: number; createdAt: string };

// 笔记类型配置
export const NOTE_TYPE_CONFIG: Record<NoteType, { label: string; icon: string; color: string }> = {
  stock: { label: "个股笔记", icon: "📈", color: "bg-blue-100 text-blue-800" },
  market: { label: "大盘笔记", icon: "🌍", color: "bg-green-100 text-green-800" },
  trade: { label: "交易笔记", icon: "💰", color: "bg-yellow-100 text-yellow-800" },
  pattern: { label: "模式笔记", icon: "🔍", color: "bg-purple-100 text-purple-800" },
  strategy: { label: "策略笔记", icon: "🎯", color: "bg-red-100 text-red-800" },
  misc: { label: "杂项笔记", icon: "📝", color: "bg-gray-100 text-gray-800" },
};

