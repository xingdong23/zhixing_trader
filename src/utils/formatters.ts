/**
 * 格式化工具函数
 * 提供统一的数据格式化逻辑
 */

/**
 * 数字格式化选项
 */
export interface NumberFormatOptions {
  decimals?: number;
  thousandsSeparator?: string;
  decimalSeparator?: string;
  prefix?: string;
  suffix?: string;
  showPositiveSign?: boolean;
}

/**
 * 日期格式化选项
 */
export interface DateFormatOptions {
  format?: string;
  locale?: string;
  timezone?: string;
}

/**
 * 货币格式化选项
 */
export interface CurrencyFormatOptions {
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * 格式化工具类
 */
export class Formatter {
  /**
   * 格式化数字
   */
  static formatNumber(
    value: number,
    options: NumberFormatOptions = {}
  ): string {
    const {
      decimals = 2,
      thousandsSeparator = ',',
      decimalSeparator = '.',
      prefix = '',
      suffix = '',
      showPositiveSign = false
    } = options;

    if (isNaN(value)) {
      return 'N/A';
    }

    // 处理符号
    const isNegative = value < 0;
    const absoluteValue = Math.abs(value);
    
    // 四舍五入到指定小数位
    const rounded = Number(absoluteValue.toFixed(decimals));
    
    // 分离整数和小数部分
    const parts = rounded.toString().split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] || '';
    
    // 添加千位分隔符
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
    
    // 组合结果
    let result = formattedInteger;
    if (decimals > 0 && decimalPart) {
      result += decimalSeparator + decimalPart.padEnd(decimals, '0');
    } else if (decimals > 0) {
      result += decimalSeparator + '0'.repeat(decimals);
    }
    
    // 添加符号
    if (isNegative) {
      result = '-' + result;
    } else if (showPositiveSign && value > 0) {
      result = '+' + result;
    }
    
    return prefix + result + suffix;
  }
  
  /**
   * 格式化百分比
   */
  static formatPercentage(
    value: number,
    decimals: number = 2,
    showPositiveSign: boolean = false
  ): string {
    return this.formatNumber(value * 100, {
      decimals,
      suffix: '%',
      showPositiveSign
    });
  }
  
  /**
   * 格式化货币
   */
  static formatCurrency(
    value: number,
    options: CurrencyFormatOptions = {}
  ): string {
    const {
      currency = 'CNY',
      locale = 'zh-CN',
      minimumFractionDigits = 2,
      maximumFractionDigits = 2
    } = options;

    if (isNaN(value)) {
      return 'N/A';
    }

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits,
        maximumFractionDigits
      }).format(value);
    } catch {
      // 降级处理
      return this.formatNumber(value, {
        decimals: maximumFractionDigits,
        prefix: currency === 'CNY' ? '¥' : '$'
      });
    }
  }
  
  /**
   * 格式化股票价格
   */
  static formatStockPrice(price: number): string {
    if (isNaN(price)) {
      return 'N/A';
    }
    
    return this.formatNumber(price, {
      decimals: 2,
      prefix: '¥'
    });
  }
  
  /**
   * 格式化股票涨跌幅
   */
  static formatStockChange(
    change: number,
    changePercent: number
  ): { change: string; changePercent: string; isPositive: boolean } {
    const isPositive = change >= 0;
    
    return {
      change: this.formatNumber(change, {
        decimals: 2,
        showPositiveSign: true
      }),
      changePercent: this.formatPercentage(changePercent / 100, 2, true),
      isPositive
    };
  }
  
  /**
   * 格式化大数字（K, M, B）
   */
  static formatLargeNumber(value: number, decimals: number = 1): string {
    if (isNaN(value)) {
      return 'N/A';
    }
    
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    if (absValue >= 1e9) {
      return sign + this.formatNumber(absValue / 1e9, { decimals }) + 'B';
    } else if (absValue >= 1e6) {
      return sign + this.formatNumber(absValue / 1e6, { decimals }) + 'M';
    } else if (absValue >= 1e3) {
      return sign + this.formatNumber(absValue / 1e3, { decimals }) + 'K';
    } else {
      return sign + this.formatNumber(absValue, { decimals: 0 });
    }
  }
  
  /**
   * 格式化日期
   */
  static formatDate(
    date: Date | string | number,
    options: DateFormatOptions = {}
  ): string {
    const {
      format = 'YYYY-MM-DD',
      locale = 'zh-CN'
    } = options;

    let dateObj: Date;
    
    if (typeof date === 'string' || typeof date === 'number') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    // 简单的格式化实现
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    
    switch (format) {
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'YYYY/MM/DD':
        return `${year}/${month}/${day}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'YYYY-MM-DD HH:mm':
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      case 'YYYY-MM-DD HH:mm:ss':
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      case 'HH:mm':
        return `${hours}:${minutes}`;
      case 'HH:mm:ss':
        return `${hours}:${minutes}:${seconds}`;
      default:
        try {
          return dateObj.toLocaleDateString(locale);
        } catch {
          return `${year}-${month}-${day}`;
        }
    }
  }
  
  /**
   * 格式化时间
   */
  static formatTime(date: Date | string | number): string {
    return this.formatDate(date, { format: 'HH:mm:ss' });
  }
  
  /**
   * 格式化日期时间
   */
  static formatDateTime(date: Date | string | number): string {
    return this.formatDate(date, { format: 'YYYY-MM-DD HH:mm:ss' });
  }
  
  /**
   * 格式化相对时间
   */
  static formatRelativeTime(date: Date | string | number): string {
    const now = new Date();
    const targetDate = new Date(date);
    
    if (isNaN(targetDate.getTime())) {
      return 'Invalid Date';
    }
    
    const diffMs = now.getTime() - targetDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSeconds < 60) {
      return '刚刚';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return this.formatDate(targetDate);
    }
  }
  
  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (isNaN(bytes) || bytes < 0) {
      return 'N/A';
    }
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return this.formatNumber(size, { decimals: unitIndex === 0 ? 0 : 1 }) + ' ' + units[unitIndex];
  }
  
  /**
   * 格式化手机号码
   */
  static formatPhone(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      return phone;
    }
    
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`;
    }
    
    return phone;
  }
  
  /**
   * 格式化银行卡号
   */
  static formatBankCard(cardNumber: string): string {
    if (!cardNumber || typeof cardNumber !== 'string') {
      return cardNumber;
    }
    
    const cleaned = cardNumber.replace(/\D/g, '');
    return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
  }
  
  /**
   * 格式化身份证号
   */
  static formatIdCard(idCard: string): string {
    if (!idCard || typeof idCard !== 'string') {
      return idCard;
    }
    
    const cleaned = idCard.replace(/\s/g, '');
    
    if (cleaned.length === 18) {
      return `${cleaned.slice(0, 6)} ${cleaned.slice(6, 14)} ${cleaned.slice(14)}`;
    } else if (cleaned.length === 15) {
      return `${cleaned.slice(0, 6)} ${cleaned.slice(6, 12)} ${cleaned.slice(12)}`;
    }
    
    return idCard;
  }
  
  /**
   * 格式化JSON
   */
  static formatJson(obj: any, indent: number = 2): string {
    try {
      return JSON.stringify(obj, null, indent);
    } catch {
      return String(obj);
    }
  }
  
  /**
   * 截断文本
   */
  static truncateText(text: string, maxLength: number, suffix: string = '...'): string {
    if (!text || typeof text !== 'string') {
      return text;
    }
    
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.slice(0, maxLength - suffix.length) + suffix;
  }
  
  /**
   * 格式化枚举值
   */
  static formatEnum(value: string, enumMap: Record<string, string>): string {
    return enumMap[value] || value;
  }
}

/**
 * 导出常用格式化函数
 */
export const formatNumber = Formatter.formatNumber;
export const formatPercentage = Formatter.formatPercentage;
export const formatCurrency = Formatter.formatCurrency;
export const formatStockPrice = Formatter.formatStockPrice;
export const formatStockChange = Formatter.formatStockChange;
export const formatLargeNumber = Formatter.formatLargeNumber;
export const formatDate = Formatter.formatDate;
export const formatTime = Formatter.formatTime;
export const formatDateTime = Formatter.formatDateTime;
export const formatRelativeTime = Formatter.formatRelativeTime;
export const formatFileSize = Formatter.formatFileSize;
export const formatPhone = Formatter.formatPhone;
export const formatBankCard = Formatter.formatBankCard;
export const formatIdCard = Formatter.formatIdCard;
export const formatJson = Formatter.formatJson;
export const truncateText = Formatter.truncateText;
export const formatEnum = Formatter.formatEnum;

// 为了兼容性，导出FormatUtils别名
export const FormatUtils = Formatter;

// 导出常用方法的别名
export const formatPercent = Formatter.formatPercentage;