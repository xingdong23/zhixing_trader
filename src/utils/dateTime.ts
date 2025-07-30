/**
 * 日期时间工具函数
 * 提供统一的日期时间处理逻辑
 */

/**
 * 时区配置
 */
export const TIMEZONES = {
  SHANGHAI: 'Asia/Shanghai',
  UTC: 'UTC',
  NEW_YORK: 'America/New_York',
  LONDON: 'Europe/London',
  TOKYO: 'Asia/Tokyo'
} as const;

/**
 * 日期格式常量
 */
export const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  TIME: 'HH:mm:ss',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  DATETIME_SHORT: 'YYYY-MM-DD HH:mm',
  ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ',
  CHINESE_DATE: 'YYYY年MM月DD日',
  CHINESE_DATETIME: 'YYYY年MM月DD日 HH:mm:ss'
} as const;

/**
 * 交易时间配置
 */
export const TRADING_HOURS = {
  // A股交易时间
  A_STOCK: {
    MORNING_START: '09:30',
    MORNING_END: '11:30',
    AFTERNOON_START: '13:00',
    AFTERNOON_END: '15:00'
  },
  // 港股交易时间
  HK_STOCK: {
    MORNING_START: '09:30',
    MORNING_END: '12:00',
    AFTERNOON_START: '13:00',
    AFTERNOON_END: '16:00'
  },
  // 美股交易时间（夏令时）
  US_STOCK_DST: {
    START: '21:30',
    END: '04:00+1' // 次日
  },
  // 美股交易时间（冬令时）
  US_STOCK_ST: {
    START: '22:30',
    END: '05:00+1' // 次日
  }
} as const;

/**
 * 日期时间工具类
 */
export class DateTime {
  /**
   * 获取当前时间
   */
  static now(): Date {
    return new Date();
  }
  
  /**
   * 获取今天的开始时间（00:00:00）
   */
  static startOfDay(date?: Date): Date {
    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  
  /**
   * 获取今天的结束时间（23:59:59.999）
   */
  static endOfDay(date?: Date): Date {
    const d = date ? new Date(date) : new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }
  
  /**
   * 获取本周的开始时间（周一 00:00:00）
   */
  static startOfWeek(date?: Date): Date {
    const d = date ? new Date(date) : new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一开始
    const monday = new Date(d.setDate(diff));
    return this.startOfDay(monday);
  }
  
  /**
   * 获取本周的结束时间（周日 23:59:59.999）
   */
  static endOfWeek(date?: Date): Date {
    const startOfWeek = this.startOfWeek(date);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return this.endOfDay(endOfWeek);
  }
  
  /**
   * 获取本月的开始时间
   */
  static startOfMonth(date?: Date): Date {
    const d = date ? new Date(date) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  }
  
  /**
   * 获取本月的结束时间
   */
  static endOfMonth(date?: Date): Date {
    const d = date ? new Date(date) : new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  
  /**
   * 获取本年的开始时间
   */
  static startOfYear(date?: Date): Date {
    const d = date ? new Date(date) : new Date();
    return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
  }
  
  /**
   * 获取本年的结束时间
   */
  static endOfYear(date?: Date): Date {
    const d = date ? new Date(date) : new Date();
    return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
  }
  
  /**
   * 添加天数
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
  
  /**
   * 添加小时
   */
  static addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }
  
  /**
   * 添加分钟
   */
  static addMinutes(date: Date, minutes: number): Date {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }
  
  /**
   * 添加秒数
   */
  static addSeconds(date: Date, seconds: number): Date {
    const result = new Date(date);
    result.setSeconds(result.getSeconds() + seconds);
    return result;
  }
  
  /**
   * 计算两个日期之间的天数差
   */
  static diffInDays(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  /**
   * 计算两个日期之间的小时差
   */
  static diffInHours(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60));
  }
  
  /**
   * 计算两个日期之间的分钟差
   */
  static diffInMinutes(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(diffTime / (1000 * 60));
  }
  
  /**
   * 判断是否为同一天
   */
  static isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }
  
  /**
   * 判断是否为今天
   */
  static isToday(date: Date): boolean {
    return this.isSameDay(date, new Date());
  }
  
  /**
   * 判断是否为昨天
   */
  static isYesterday(date: Date): boolean {
    const yesterday = this.addDays(new Date(), -1);
    return this.isSameDay(date, yesterday);
  }
  
  /**
   * 判断是否为明天
   */
  static isTomorrow(date: Date): boolean {
    const tomorrow = this.addDays(new Date(), 1);
    return this.isSameDay(date, tomorrow);
  }
  
  /**
   * 判断是否为工作日（周一到周五）
   */
  static isWeekday(date: Date): boolean {
    const day = date.getDay();
    return day >= 1 && day <= 5;
  }
  
  /**
   * 判断是否为周末
   */
  static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }
  
  /**
   * 获取下一个工作日
   */
  static getNextWorkday(date?: Date): Date {
    let nextDay = this.addDays(date || new Date(), 1);
    while (this.isWeekend(nextDay)) {
      nextDay = this.addDays(nextDay, 1);
    }
    return nextDay;
  }
  
  /**
   * 获取上一个工作日
   */
  static getPreviousWorkday(date?: Date): Date {
    let prevDay = this.addDays(date || new Date(), -1);
    while (this.isWeekend(prevDay)) {
      prevDay = this.addDays(prevDay, -1);
    }
    return prevDay;
  }
  
  /**
   * 判断是否在交易时间内（A股）
   */
  static isInTradingHours(date?: Date, market: 'A_STOCK' | 'HK_STOCK' = 'A_STOCK'): boolean {
    const d = date || new Date();
    
    // 首先检查是否为工作日
    if (!this.isWeekday(d)) {
      return false;
    }
    
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    
    const tradingHours = TRADING_HOURS[market];
    
    // 解析时间字符串为分钟数
    const parseTime = (timeStr: string): number => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };
    
    const morningStart = parseTime(tradingHours.MORNING_START);
    const morningEnd = parseTime(tradingHours.MORNING_END);
    const afternoonStart = parseTime(tradingHours.AFTERNOON_START);
    const afternoonEnd = parseTime(tradingHours.AFTERNOON_END);
    
    return (timeInMinutes >= morningStart && timeInMinutes <= morningEnd) ||
           (timeInMinutes >= afternoonStart && timeInMinutes <= afternoonEnd);
  }
  
  /**
   * 获取下一个交易日
   */
  static getNextTradingDay(date?: Date): Date {
    let nextDay = this.addDays(date || new Date(), 1);
    while (this.isWeekend(nextDay)) {
      nextDay = this.addDays(nextDay, 1);
    }
    // TODO: 这里可以添加节假日判断逻辑
    return nextDay;
  }
  
  /**
   * 获取上一个交易日
   */
  static getPreviousTradingDay(date?: Date): Date {
    let prevDay = this.addDays(date || new Date(), -1);
    while (this.isWeekend(prevDay)) {
      prevDay = this.addDays(prevDay, -1);
    }
    // TODO: 这里可以添加节假日判断逻辑
    return prevDay;
  }
  
  /**
   * 解析日期字符串
   */
  static parseDate(dateString: string): Date | null {
    if (!dateString) {
      return null;
    }
    
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }
  
  /**
   * 格式化为ISO字符串
   */
  static toISOString(date: Date): string {
    return date.toISOString();
  }
  
  /**
   * 从ISO字符串创建日期
   */
  static fromISOString(isoString: string): Date | null {
    try {
      const date = new Date(isoString);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
  
  /**
   * 获取时间戳（毫秒）
   */
  static getTimestamp(date?: Date): number {
    return (date || new Date()).getTime();
  }
  
  /**
   * 从时间戳创建日期
   */
  static fromTimestamp(timestamp: number): Date {
    return new Date(timestamp);
  }
  
  /**
   * 获取Unix时间戳（秒）
   */
  static getUnixTimestamp(date?: Date): number {
    return Math.floor(this.getTimestamp(date) / 1000);
  }
  
  /**
   * 从Unix时间戳创建日期
   */
  static fromUnixTimestamp(timestamp: number): Date {
    return new Date(timestamp * 1000);
  }
  
  /**
   * 获取年龄
   */
  static getAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
  
  /**
   * 格式化日期
   */
  static formatDate(date: Date, format: string = DATE_FORMATS.DATETIME): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }
  
  /**
   * 获取日期范围
   */
  static getDateRange(start: Date, end: Date): Date[] {
    return this.createDateRange(start, end);
  }
  
  /**
   * 判断是否为工作日（别名）
   */
  static isBusinessDay(date: Date): boolean {
    return this.isWeekday(date);
  }
  
  /**
   * 获取星期几的中文名称
   */
  static getWeekdayName(date: Date, short: boolean = false): string {
    const weekdays = short 
      ? ['日', '一', '二', '三', '四', '五', '六']
      : ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    
    return weekdays[date.getDay()];
  }
  
  /**
   * 获取月份的中文名称
   */
  static getMonthName(date: Date): string {
    const months = [
      '一月', '二月', '三月', '四月', '五月', '六月',
      '七月', '八月', '九月', '十月', '十一月', '十二月'
    ];
    
    return months[date.getMonth()];
  }
  
  /**
   * 创建日期范围
   */
  static createDateRange(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }
  
  /**
   * 获取季度
   */
  static getQuarter(date: Date): number {
    return Math.floor(date.getMonth() / 3) + 1;
  }
  
  /**
   * 获取季度开始日期
   */
  static getQuarterStart(date: Date): Date {
    const quarter = this.getQuarter(date);
    const startMonth = (quarter - 1) * 3;
    return new Date(date.getFullYear(), startMonth, 1, 0, 0, 0, 0);
  }
  
  /**
   * 获取季度结束日期
   */
  static getQuarterEnd(date: Date): Date {
    const quarter = this.getQuarter(date);
    const endMonth = quarter * 3;
    return new Date(date.getFullYear(), endMonth, 0, 23, 59, 59, 999);
  }
}

/**
 * 导出常用日期时间函数
 */
export const now = DateTime.now;
export const startOfDay = DateTime.startOfDay;
export const endOfDay = DateTime.endOfDay;
export const startOfWeek = DateTime.startOfWeek;
export const endOfWeek = DateTime.endOfWeek;
export const startOfMonth = DateTime.startOfMonth;
export const endOfMonth = DateTime.endOfMonth;
export const addDays = DateTime.addDays;
export const addHours = DateTime.addHours;
export const addMinutes = DateTime.addMinutes;
export const diffInDays = DateTime.diffInDays;
export const diffInHours = DateTime.diffInHours;
export const isSameDay = DateTime.isSameDay;
export const isToday = DateTime.isToday;
export const isWeekday = DateTime.isWeekday;
export const isWeekend = DateTime.isWeekend;
export const isInTradingHours = DateTime.isInTradingHours;
export const getNextTradingDay = DateTime.getNextTradingDay;
export const getPreviousTradingDay = DateTime.getPreviousTradingDay;
export const parseDate = DateTime.parseDate;
export const getTimestamp = DateTime.getTimestamp;
export const fromTimestamp = DateTime.fromTimestamp;
export const formatDate = DateTime.formatDate;
export const getDateRange = DateTime.getDateRange;
export const isBusinessDay = DateTime.isBusinessDay;