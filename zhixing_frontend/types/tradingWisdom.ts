/**
 * 交易智慧库 - 数据模型和管理
 */

export type WisdomCategory = 
  | "discipline"      // 交易纪律
  | "psychology"      // 交易心理
  | "strategy"        // 策略心得
  | "risk"           // 风险管理
  | "quote"          // 名人名言
  | "book"           // 读书笔记
  | "experience"     // 实战经验
  | "lesson"         // 教训总结
  | "custom"         // 自定义

export interface TradingWisdom {
  id: string
  content: string
  category: WisdomCategory
  source?: string           // 来源（书名、作者、网站等）
  author?: string          // 作者
  tags?: string[]          // 标签
  importance: 1 | 2 | 3 | 4 | 5  // 重要程度 1-5
  color?: string           // 自定义颜色
  icon?: string            // 图标名称
  createdAt: string
  updatedAt: string
  isActive: boolean        // 是否在提醒中显示
  displayCount?: number    // 显示次数统计
  lastDisplayed?: string   // 最后显示时间
  notes?: string           // 个人笔记
}

export interface WisdomCollection {
  wisdoms: TradingWisdom[]
  categories: {
    [key in WisdomCategory]: {
      name: string
      description: string
      defaultColor: string
      defaultIcon: string
    }
  }
}

// 默认分类配置
export const WISDOM_CATEGORIES: WisdomCollection["categories"] = {
  discipline: {
    name: "交易纪律",
    description: "关于遵守交易规则和纪律的智慧",
    defaultColor: "text-red-600",
    defaultIcon: "Shield"
  },
  psychology: {
    name: "交易心理",
    description: "关于情绪管理和心态调整的智慧",
    defaultColor: "text-purple-600",
    defaultIcon: "Brain"
  },
  strategy: {
    name: "策略心得",
    description: "关于交易策略和技术分析的心得",
    defaultColor: "text-blue-600",
    defaultIcon: "Target"
  },
  risk: {
    name: "风险管理",
    description: "关于风险控制和资金管理的智慧",
    defaultColor: "text-orange-600",
    defaultIcon: "AlertTriangle"
  },
  quote: {
    name: "名人名言",
    description: "交易大师和成功投资者的名言",
    defaultColor: "text-green-600",
    defaultIcon: "Quote"
  },
  book: {
    name: "读书笔记",
    description: "从交易书籍中学到的知识",
    defaultColor: "text-indigo-600",
    defaultIcon: "BookOpen"
  },
  experience: {
    name: "实战经验",
    description: "从实际交易中总结的经验",
    defaultColor: "text-cyan-600",
    defaultIcon: "TrendingUp"
  },
  lesson: {
    name: "教训总结",
    description: "从失败和错误中学到的教训",
    defaultColor: "text-amber-600",
    defaultIcon: "AlertCircle"
  },
  custom: {
    name: "自定义",
    description: "其他类型的交易智慧",
    defaultColor: "text-gray-600",
    defaultIcon: "Star"
  }
}

// 默认的交易智慧（初始数据）
export const DEFAULT_WISDOMS: TradingWisdom[] = [
  {
    id: "1",
    content: "宁愿错过，也不要做没有把握的交易",
    category: "discipline",
    importance: 5,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: "这是最重要的交易纪律，防止冲动交易"
  },
  {
    id: "2",
    content: "只做极致压缩 + 回踩EMA55 + 成交量验证的交易",
    category: "strategy",
    importance: 5,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: "我的高胜率策略，必须严格执行"
  },
  {
    id: "3",
    content: "看不懂的交易不做，只做自己看得懂的",
    category: "discipline",
    importance: 5,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "4",
    content: "没有赚钱总比亏损好很多，不要光想着盈利",
    category: "psychology",
    importance: 5,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "5",
    content: "忍受空仓，等待最佳时机，纪律是盈利的基础",
    category: "psychology",
    importance: 5,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "6",
    content: "市场永远是对的，错的是你的判断",
    category: "quote",
    author: "杰西·利弗莫尔",
    importance: 4,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "7",
    content: "截断亏损，让利润奔跑",
    category: "risk",
    importance: 5,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// LocalStorage 键名
const STORAGE_KEY = "trading_wisdom_library"

/**
 * 交易智慧库管理类
 */
export class WisdomManager {
  /**
   * 获取所有智慧
   */
  static getAll(): TradingWisdom[] {
    if (typeof window === "undefined") return DEFAULT_WISDOMS
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        // 首次使用，保存默认数据
        this.saveAll(DEFAULT_WISDOMS)
        return DEFAULT_WISDOMS
      }
      return JSON.parse(stored)
    } catch (error) {
      console.error("Failed to load wisdoms:", error)
      return DEFAULT_WISDOMS
    }
  }

  /**
   * 获取激活的智慧（用于提醒显示）
   */
  static getActive(): TradingWisdom[] {
    return this.getAll().filter(w => w.isActive)
  }

  /**
   * 按分类获取
   */
  static getByCategory(category: WisdomCategory): TradingWisdom[] {
    return this.getAll().filter(w => w.category === category)
  }

  /**
   * 按重要程度获取
   */
  static getByImportance(minImportance: number): TradingWisdom[] {
    return this.getAll().filter(w => w.importance >= minImportance)
  }

  /**
   * 搜索智慧
   */
  static search(query: string): TradingWisdom[] {
    const lowerQuery = query.toLowerCase()
    return this.getAll().filter(w => 
      w.content.toLowerCase().includes(lowerQuery) ||
      w.source?.toLowerCase().includes(lowerQuery) ||
      w.author?.toLowerCase().includes(lowerQuery) ||
      w.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      w.notes?.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * 保存所有智慧
   */
  static saveAll(wisdoms: TradingWisdom[]): void {
    if (typeof window === "undefined") return
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wisdoms))
    } catch (error) {
      console.error("Failed to save wisdoms:", error)
    }
  }

  /**
   * 添加新智慧
   */
  static add(wisdom: Omit<TradingWisdom, "id" | "createdAt" | "updatedAt">): TradingWisdom {
    const newWisdom: TradingWisdom = {
      ...wisdom,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const wisdoms = this.getAll()
    wisdoms.unshift(newWisdom)
    this.saveAll(wisdoms)
    
    return newWisdom
  }

  /**
   * 更新智慧
   */
  static update(id: string, updates: Partial<TradingWisdom>): boolean {
    const wisdoms = this.getAll()
    const index = wisdoms.findIndex(w => w.id === id)
    
    if (index === -1) return false
    
    wisdoms[index] = {
      ...wisdoms[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    this.saveAll(wisdoms)
    return true
  }

  /**
   * 删除智慧
   */
  static delete(id: string): boolean {
    const wisdoms = this.getAll()
    const filtered = wisdoms.filter(w => w.id !== id)
    
    if (filtered.length === wisdoms.length) return false
    
    this.saveAll(filtered)
    return true
  }

  /**
   * 切换激活状态
   */
  static toggleActive(id: string): boolean {
    const wisdoms = this.getAll()
    const wisdom = wisdoms.find(w => w.id === id)
    
    if (!wisdom) return false
    
    return this.update(id, { isActive: !wisdom.isActive })
  }

  /**
   * 记录显示
   */
  static recordDisplay(id: string): void {
    const wisdoms = this.getAll()
    const wisdom = wisdoms.find(w => w.id === id)
    
    if (!wisdom) return
    
    this.update(id, {
      displayCount: (wisdom.displayCount || 0) + 1,
      lastDisplayed: new Date().toISOString()
    })
  }

  /**
   * 导出为JSON
   */
  static exportToJSON(): string {
    return JSON.stringify(this.getAll(), null, 2)
  }

  /**
   * 从JSON导入
   */
  static importFromJSON(json: string): boolean {
    try {
      const wisdoms = JSON.parse(json) as TradingWisdom[]
      
      // 验证数据格式
      if (!Array.isArray(wisdoms)) return false
      
      this.saveAll(wisdoms)
      return true
    } catch (error) {
      console.error("Failed to import wisdoms:", error)
      return false
    }
  }

  /**
   * 重置为默认
   */
  static reset(): void {
    this.saveAll(DEFAULT_WISDOMS)
  }
}
