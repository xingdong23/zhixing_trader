// 交易笔记系统的类型定义

export interface NoteTag {
  id: number;
  name: string;
  color: string;
  count?: number;
}

export interface Note {
  id?: number;
  type: "trade" | "day" | "misc";
  title: string;
  content: string;
  isStarred: boolean;
  tags: NoteTag[];
  createdAt?: string;
  relatedId?: number;
  relatedInfo?: {
    type: string;
    label: string;
    link?: string;
  };
}

export type NoteWithId = Note & { id: number; createdAt: string };

