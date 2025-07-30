/**
 * 字符串工具函数
 * 提供统一的字符串处理逻辑
 */

import { ErrorHandler, ValidationError } from './errorHandling';

/**
 * 字符串工具类
 */
export class StringUtils {
  /**
   * 判断字符串是否为空
   */
  static isEmpty(str: any): boolean {
    return str === null || str === undefined || str === '' || (typeof str === 'string' && str.trim() === '');
  }

  /**
   * 判断字符串是否不为空
   */
  static isNotEmpty(str: any): boolean {
    return !this.isEmpty(str);
  }

  /**
   * 安全转换为字符串
   */
  static toString(value: any, defaultValue: string = ''): string {
    if (value === null || value === undefined) {
      return defaultValue;
    }
    return String(value);
  }

  /**
   * 去除首尾空格
   */
  static trim(str: string): string {
    return this.toString(str).trim();
  }

  /**
   * 去除所有空格
   */
  static removeAllSpaces(str: string): string {
    return this.toString(str).replace(/\s+/g, '');
  }

  /**
   * 压缩空格（多个空格变为一个）
   */
  static compressSpaces(str: string): string {
    return this.toString(str).replace(/\s+/g, ' ').trim();
  }

  /**
   * 首字母大写
   */
  static capitalize(str: string): string {
    const s = this.toString(str);
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  /**
   * 每个单词首字母大写
   */
  static capitalizeWords(str: string): string {
    return this.toString(str)
      .split(' ')
      .map(word => this.capitalize(word))
      .join(' ');
  }

  /**
   * 转换为驼峰命名
   */
  static toCamelCase(str: string): string {
    return this.toString(str)
      .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
      .replace(/^[A-Z]/, char => char.toLowerCase());
  }

  /**
   * 转换为帕斯卡命名
   */
  static toPascalCase(str: string): string {
    const camelCase = this.toCamelCase(str);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  }

  /**
   * 转换为蛇形命名
   */
  static toSnakeCase(str: string): string {
    return this.toString(str)
      .replace(/([A-Z])/g, '_$1')
      .replace(/[-\s]+/g, '_')
      .toLowerCase()
      .replace(/^_/, '');
  }

  /**
   * 转换为短横线命名
   */
  static toKebabCase(str: string): string {
    return this.toString(str)
      .replace(/([A-Z])/g, '-$1')
      .replace(/[_\s]+/g, '-')
      .toLowerCase()
      .replace(/^-/, '');
  }

  /**
   * 截断字符串
   */
  static truncate(str: string, length: number, suffix: string = '...'): string {
    const s = this.toString(str);
    if (s.length <= length) {
      return s;
    }
    return s.slice(0, length - suffix.length) + suffix;
  }

  /**
   * 左填充
   */
  static padStart(str: string, length: number, padString: string = ' '): string {
    return this.toString(str).padStart(length, padString);
  }

  /**
   * 右填充
   */
  static padEnd(str: string, length: number, padString: string = ' '): string {
    return this.toString(str).padEnd(length, padString);
  }

  /**
   * 重复字符串
   */
  static repeat(str: string, count: number): string {
    if (count < 0) {
      throw new ValidationError('重复次数不能为负数');
    }
    return this.toString(str).repeat(count);
  }

  /**
   * 反转字符串
   */
  static reverse(str: string): string {
    return this.toString(str).split('').reverse().join('');
  }

  /**
   * 检查是否包含子字符串
   */
  static contains(str: string, searchString: string, ignoreCase: boolean = false): boolean {
    const s = this.toString(str);
    const search = this.toString(searchString);
    
    if (ignoreCase) {
      return s.toLowerCase().includes(search.toLowerCase());
    }
    return s.includes(search);
  }

  /**
   * 检查是否以指定字符串开头
   */
  static startsWith(str: string, searchString: string, ignoreCase: boolean = false): boolean {
    const s = this.toString(str);
    const search = this.toString(searchString);
    
    if (ignoreCase) {
      return s.toLowerCase().startsWith(search.toLowerCase());
    }
    return s.startsWith(search);
  }

  /**
   * 检查是否以指定字符串结尾
   */
  static endsWith(str: string, searchString: string, ignoreCase: boolean = false): boolean {
    const s = this.toString(str);
    const search = this.toString(searchString);
    
    if (ignoreCase) {
      return s.toLowerCase().endsWith(search.toLowerCase());
    }
    return s.endsWith(search);
  }

  /**
   * 计算字符串中子字符串的出现次数
   */
  static countOccurrences(str: string, searchString: string, ignoreCase: boolean = false): number {
    const s = ignoreCase ? this.toString(str).toLowerCase() : this.toString(str);
    const search = ignoreCase ? this.toString(searchString).toLowerCase() : this.toString(searchString);
    
    if (search.length === 0) {
      return 0;
    }
    
    let count = 0;
    let position = 0;
    
    while ((position = s.indexOf(search, position)) !== -1) {
      count++;
      position += search.length;
    }
    
    return count;
  }

  /**
   * 替换所有匹配的子字符串
   */
  static replaceAll(str: string, searchValue: string, replaceValue: string): string {
    return this.toString(str).split(searchValue).join(replaceValue);
  }

  /**
   * 移除HTML标签
   */
  static stripHtml(str: string): string {
    return this.toString(str).replace(/<[^>]*>/g, '');
  }

  /**
   * 转义HTML字符
   */
  static escapeHtml(str: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    
    return this.toString(str).replace(/[&<>"']/g, char => htmlEscapes[char]);
  }

  /**
   * 反转义HTML字符
   */
  static unescapeHtml(str: string): string {
    const htmlUnescapes: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'"
    };
    
    return this.toString(str).replace(/&(?:amp|lt|gt|quot|#39);/g, entity => htmlUnescapes[entity]);
  }

  /**
   * 转义正则表达式特殊字符
   */
  static escapeRegExp(str: string): string {
    return this.toString(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 生成随机字符串
   */
  static random(length: number = 8, charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
    if (length <= 0) {
      throw new ValidationError('长度必须大于0');
    }
    
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * 生成UUID
   */
  static uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 生成短ID
   */
  static shortId(length: number = 8): string {
    return this.random(length, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
  }

  /**
   * 计算字符串的字节长度
   */
  static byteLength(str: string): number {
    return new Blob([this.toString(str)]).size;
  }

  /**
   * 按字节截断字符串
   */
  static truncateByBytes(str: string, maxBytes: number, suffix: string = '...'): string {
    const s = this.toString(str);
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const bytes = encoder.encode(s);
    
    if (bytes.length <= maxBytes) {
      return s;
    }
    
    const suffixBytes = encoder.encode(suffix);
    const targetBytes = maxBytes - suffixBytes.length;
    
    if (targetBytes <= 0) {
      return suffix.slice(0, maxBytes);
    }
    
    // 找到合适的截断点，避免截断多字节字符
    const truncatedBytes = bytes.slice(0, targetBytes);
    let truncatedStr = '';
    
    try {
      truncatedStr = decoder.decode(truncatedBytes);
    } catch {
      // 如果解码失败，说明截断了多字节字符，需要向前调整
      for (let i = targetBytes - 1; i >= 0; i--) {
        try {
          truncatedStr = decoder.decode(bytes.slice(0, i));
          break;
        } catch {
          continue;
        }
      }
    }
    
    return truncatedStr + suffix;
  }

  /**
   * 计算字符串相似度（编辑距离）
   */
  static similarity(str1: string, str2: string): number {
    const s1 = this.toString(str1);
    const s2 = this.toString(str2);
    
    if (s1 === s2) {
      return 1;
    }
    
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength === 0) {
      return 1;
    }
    
    const distance = this.levenshteinDistance(s1, s2);
    return (maxLength - distance) / maxLength;
  }

  /**
   * 计算编辑距离
   */
  static levenshteinDistance(str1: string, str2: string): number {
    const s1 = this.toString(str1);
    const s2 = this.toString(str2);
    
    const matrix: number[][] = [];
    
    // 初始化矩阵
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }
    
    // 填充矩阵
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // 替换
            matrix[i][j - 1] + 1,     // 插入
            matrix[i - 1][j] + 1      // 删除
          );
        }
      }
    }
    
    return matrix[s2.length][s1.length];
  }

  /**
   * 模糊搜索
   */
  static fuzzySearch(query: string, targets: string[], threshold: number = 0.6): string[] {
    const q = this.toString(query).toLowerCase();
    
    return targets
      .map(target => ({
        target,
        similarity: this.similarity(q, this.toString(target).toLowerCase())
      }))
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .map(item => item.target);
  }

  /**
   * 高亮搜索关键词
   */
  static highlight(
    text: string,
    query: string,
    highlightTag: string = 'mark',
    ignoreCase: boolean = true
  ): string {
    const t = this.toString(text);
    const q = this.toString(query);
    
    if (this.isEmpty(q)) {
      return t;
    }
    
    const flags = ignoreCase ? 'gi' : 'g';
    const regex = new RegExp(this.escapeRegExp(q), flags);
    
    return t.replace(regex, match => `<${highlightTag}>${match}</${highlightTag}>`);
  }

  /**
   * 提取数字
   */
  static extractNumbers(str: string): number[] {
    const matches = this.toString(str).match(/-?\d+\.?\d*/g);
    return matches ? matches.map(Number).filter(n => !isNaN(n)) : [];
  }

  /**
   * 提取邮箱地址
   */
  static extractEmails(str: string): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = this.toString(str).match(emailRegex);
    return matches || [];
  }

  /**
   * 提取URL
   */
  static extractUrls(str: string): string[] {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const matches = this.toString(str).match(urlRegex);
    return matches || [];
  }

  /**
   * 提取中文字符
   */
  static extractChinese(str: string): string[] {
    const chineseRegex = /[\u4e00-\u9fa5]/g;
    const matches = this.toString(str).match(chineseRegex);
    return matches || [];
  }

  /**
   * 检查是否为中文字符串
   */
  static isChinese(str: string): boolean {
    const chineseRegex = /^[\u4e00-\u9fa5]+$/;
    return chineseRegex.test(this.toString(str));
  }

  /**
   * 检查是否为英文字符串
   */
  static isEnglish(str: string): boolean {
    const englishRegex = /^[a-zA-Z\s]+$/;
    return englishRegex.test(this.toString(str));
  }

  /**
   * 检查是否为数字字符串
   */
  static isNumeric(str: string): boolean {
    const numericRegex = /^-?\d+\.?\d*$/;
    return numericRegex.test(this.toString(str));
  }

  /**
   * 检查是否为字母数字字符串
   */
  static isAlphanumeric(str: string): boolean {
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    return alphanumericRegex.test(this.toString(str));
  }

  /**
   * 格式化模板字符串
   */
  static template(template: string, data: Record<string, any>): string {
    let result = this.toString(template);
    
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`\\{\\{\\s*${this.escapeRegExp(key)}\\s*\\}\\}`, 'g');
      result = result.replace(regex, this.toString(value));
    }
    
    return result;
  }

  /**
   * 解析查询字符串
   */
  static parseQuery(queryString: string): Record<string, string> {
    const result: Record<string, string> = {};
    const query = this.toString(queryString).replace(/^\?/, '');
    
    if (this.isEmpty(query)) {
      return result;
    }
    
    const pairs = query.split('&');
    
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        result[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    }
    
    return result;
  }

  /**
   * 构建查询字符串
   */
  static buildQuery(params: Record<string, any>): string {
    const pairs: string[] = [];
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(this.toString(value))}`);
      }
    }
    
    return pairs.join('&');
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
  }

  /**
   * 格式化时间间隔
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}天 ${hours % 24}小时`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟 ${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }
}

/**
 * 导出常用字符串函数
 */
export const {
  isEmpty,
  isNotEmpty,
  toString,
  trim,
  removeAllSpaces,
  compressSpaces,
  capitalize,
  capitalizeWords,
  toCamelCase,
  toPascalCase,
  toSnakeCase,
  toKebabCase,
  truncate,
  padStart,
  padEnd,
  repeat,
  reverse,
  contains,
  startsWith,
  endsWith,
  countOccurrences,
  replaceAll,
  stripHtml,
  escapeHtml,
  unescapeHtml,
  escapeRegExp,
  random,
  uuid,
  shortId,
  byteLength,
  truncateByBytes,
  similarity,
  levenshteinDistance,
  fuzzySearch,
  highlight,
  extractNumbers,
  extractEmails,
  extractUrls,
  extractChinese,
  isChinese,
  isEnglish,
  isNumeric,
  isAlphanumeric,
  template,
  parseQuery,
  buildQuery,
  formatFileSize,
  formatDuration
} = StringUtils;