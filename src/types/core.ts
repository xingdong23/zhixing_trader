// 【知行交易】核心基础类型定义
// 包含系统中最基础的枚举和接口

// ==================== 基础枚举 ====================

/** 交易情绪类型 */
export enum TradingEmotion {
  CALM = 'calm',           // 冷静分析
  FOMO = 'fomo',           // 害怕错过
  FEAR = 'fear',           // 恐惧
  GREED = 'greed',         // 贪婪
  REVENGE = 'revenge',     // 报复性交易
  CONFIDENT = 'confident', // 自信
  UNCERTAIN = 'uncertain'  // 不确定
}

/** 信息来源类型 */
export enum InformationSource {
  SELF_ANALYSIS = 'self_analysis',           // 自己分析
  FRIEND_RECOMMEND = 'friend_recommend',     // 朋友推荐
  NEWS_MEDIA = 'news_media',                 // 新闻媒体
  SOCIAL_MEDIA = 'social_media',             // 社交媒体
  PROFESSIONAL_REPORT = 'professional_report', // 专业报告
  TECHNICAL_SIGNAL = 'technical_signal'      // 技术信号
}

/** 交易状态 */
export enum TradeStatus {
  PLANNING = 'planning',     // 计划中
  ACTIVE = 'active',         // 执行中
  CLOSED = 'closed',         // 已平仓
  CANCELLED = 'cancelled'    // 已取消
}

/** 纪律执行评级 */
export enum DisciplineRating {
  PERFECT = 'perfect',       // 完美执行
  GOOD = 'good',            // 基本执行
  PARTIAL = 'partial',      // 部分执行
  POOR = 'poor'             // 未执行
}

/** 市场类型 */
export enum MarketType {
  US = 'US',    // 美股
  HK = 'HK',    // 港股
  CN = 'CN'     // A股
}

/** 市值规模 */
export enum MarketCap {
  LARGE = 'large',   // 大盘股
  MID = 'mid',       // 中盘股
  SMALL = 'small'    // 小盘股
}

/** 关注程度 */
export enum WatchLevel {
  HIGH = 'high',     // 高关注
  MEDIUM = 'medium', // 中等关注
  LOW = 'low'        // 低关注
}

// ==================== 基础接口 ====================

/** 基础实体接口 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/** 带标签的实体 */
export interface TaggedEntity extends BaseEntity {
  tags: string[];
}

/** 带备注的实体 */
export interface NotedEntity extends BaseEntity {
  notes?: string;
}

/** 价格相关数据 */
export interface PriceData {
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  volume?: number;
}

/** 统计数据基础接口 */
export interface BaseStats {
  totalCount: number;
  lastUpdated: Date;
}

// ==================== 通用工具类型 ====================

/** API响应包装器 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** 分页参数 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 排序参数 */
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

/** 筛选参数 */
export interface FilterParams {
  [key: string]: any;
}