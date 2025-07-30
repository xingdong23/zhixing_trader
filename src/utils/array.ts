/**
 * 数组工具函数
 * 提供统一的数组处理逻辑
 */

import { ErrorHandler, ValidationError } from './errorHandling';

/**
 * 分组结果接口
 */
export interface GroupedResult<T, K extends string | number | symbol> {
  [key: string]: T[];
}

/**
 * 分页结果接口
 */
export interface PaginationResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 排序配置接口
 */
export interface SortConfig<T> {
  key: keyof T;
  direction: 'asc' | 'desc';
}

/**
 * 数组工具类
 */
export class ArrayUtils {
  /**
   * 判断是否为数组
   */
  static isArray(value: any): value is any[] {
    return Array.isArray(value);
  }

  /**
   * 判断数组是否为空
   */
  static isEmpty(arr: any[]): boolean {
    return !this.isArray(arr) || arr.length === 0;
  }

  /**
   * 判断数组是否不为空
   */
  static isNotEmpty(arr: any[]): boolean {
    return !this.isEmpty(arr);
  }

  /**
   * 安全获取数组长度
   */
  static getLength(arr: any[]): number {
    return this.isArray(arr) ? arr.length : 0;
  }

  /**
   * 安全获取数组元素
   */
  static get<T>(arr: T[], index: number, defaultValue?: T): T | undefined {
    if (!this.isArray(arr) || index < 0 || index >= arr.length) {
      return defaultValue;
    }
    return arr[index];
  }

  /**
   * 获取第一个元素
   */
  static first<T>(arr: T[], defaultValue?: T): T | undefined {
    return this.get(arr, 0, defaultValue);
  }

  /**
   * 获取最后一个元素
   */
  static last<T>(arr: T[], defaultValue?: T): T | undefined {
    return this.isEmpty(arr) ? defaultValue : arr[arr.length - 1];
  }

  /**
   * 获取随机元素
   */
  static random<T>(arr: T[]): T | undefined {
    if (this.isEmpty(arr)) {
      return undefined;
    }
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
  }

  /**
   * 获取多个随机元素
   */
  static randomSample<T>(arr: T[], count: number): T[] {
    if (this.isEmpty(arr) || count <= 0) {
      return [];
    }
    
    const shuffled = this.shuffle([...arr]);
    return shuffled.slice(0, Math.min(count, arr.length));
  }

  /**
   * 打乱数组
   */
  static shuffle<T>(arr: T[]): T[] {
    if (this.isEmpty(arr)) {
      return [];
    }
    
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * 去重
   */
  static unique<T>(arr: T[], keyFn?: (item: T) => any): T[] {
    if (this.isEmpty(arr)) {
      return [];
    }
    
    if (keyFn) {
      const seen = new Set();
      return arr.filter(item => {
        const key = keyFn(item);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    }
    
    return [...new Set(arr)];
  }

  /**
   * 扁平化数组
   */
  static flatten<T>(arr: any[], depth: number = 1): T[] {
    if (this.isEmpty(arr)) {
      return [];
    }
    
    if (depth <= 0) {
      return arr;
    }
    
    return arr.reduce((acc, val) => {
      if (this.isArray(val)) {
        acc.push(...this.flatten(val, depth - 1));
      } else {
        acc.push(val);
      }
      return acc;
    }, []);
  }

  /**
   * 深度扁平化数组
   */
  static flattenDeep<T>(arr: any[]): T[] {
    if (this.isEmpty(arr)) {
      return [];
    }
    
    return arr.reduce((acc, val) => {
      if (this.isArray(val)) {
        acc.push(...this.flattenDeep(val));
      } else {
        acc.push(val);
      }
      return acc;
    }, []);
  }

  /**
   * 分块
   */
  static chunk<T>(arr: T[], size: number): T[][] {
    if (this.isEmpty(arr) || size <= 0) {
      return [];
    }
    
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }

  /**
   * 分组
   */
  static groupBy<T, K extends string | number | symbol>(
    arr: T[],
    keyFn: (item: T) => K
  ): GroupedResult<T, K> {
    if (this.isEmpty(arr)) {
      return {} as GroupedResult<T, K>;
    }
    
    return arr.reduce((groups, item) => {
      const key = String(keyFn(item));
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as GroupedResult<T, K>);
  }

  /**
   * 计数
   */
  static countBy<T, K extends string | number | symbol>(
    arr: T[],
    keyFn: (item: T) => K
  ): Record<string, number> {
    if (this.isEmpty(arr)) {
      return {};
    }
    
    return arr.reduce((counts, item) => {
      const key = String(keyFn(item));
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  /**
   * 排序
   */
  static sortBy<T>(arr: T[], keyFn: (item: T) => any, direction: 'asc' | 'desc' = 'asc'): T[] {
    if (this.isEmpty(arr)) {
      return [];
    }
    
    return [...arr].sort((a, b) => {
      const aVal = keyFn(a);
      const bVal = keyFn(b);
      
      if (aVal < bVal) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  /**
   * 多字段排序
   */
  static multiSort<T>(arr: T[], configs: SortConfig<T>[]): T[] {
    if (this.isEmpty(arr) || this.isEmpty(configs)) {
      return [...arr];
    }
    
    return [...arr].sort((a, b) => {
      for (const config of configs) {
        const aVal = a[config.key];
        const bVal = b[config.key];
        
        if (aVal < bVal) {
          return config.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return config.direction === 'asc' ? 1 : -1;
        }
      }
      return 0;
    });
  }

  /**
   * 过滤
   */
  static filter<T>(arr: T[], predicate: (item: T, index: number) => boolean): T[] {
    if (this.isEmpty(arr)) {
      return [];
    }
    return arr.filter(predicate);
  }

  /**
   * 查找
   */
  static find<T>(arr: T[], predicate: (item: T, index: number) => boolean): T | undefined {
    if (this.isEmpty(arr)) {
      return undefined;
    }
    return arr.find(predicate);
  }

  /**
   * 查找索引
   */
  static findIndex<T>(arr: T[], predicate: (item: T, index: number) => boolean): number {
    if (this.isEmpty(arr)) {
      return -1;
    }
    return arr.findIndex(predicate);
  }

  /**
   * 检查是否包含
   */
  static includes<T>(arr: T[], value: T): boolean {
    if (this.isEmpty(arr)) {
      return false;
    }
    return arr.includes(value);
  }

  /**
   * 检查是否满足条件
   */
  static some<T>(arr: T[], predicate: (item: T, index: number) => boolean): boolean {
    if (this.isEmpty(arr)) {
      return false;
    }
    return arr.some(predicate);
  }

  /**
   * 检查是否全部满足条件
   */
  static every<T>(arr: T[], predicate: (item: T, index: number) => boolean): boolean {
    if (this.isEmpty(arr)) {
      return true;
    }
    return arr.every(predicate);
  }

  /**
   * 映射
   */
  static map<T, U>(arr: T[], mapper: (item: T, index: number) => U): U[] {
    if (this.isEmpty(arr)) {
      return [];
    }
    return arr.map(mapper);
  }

  /**
   * 归约
   */
  static reduce<T, U>(arr: T[], reducer: (acc: U, item: T, index: number) => U, initialValue: U): U {
    if (this.isEmpty(arr)) {
      return initialValue;
    }
    return arr.reduce(reducer, initialValue);
  }

  /**
   * 交集
   */
  static intersection<T>(...arrays: T[][]): T[] {
    if (arrays.length === 0) {
      return [];
    }
    
    const [first, ...rest] = arrays;
    if (this.isEmpty(first)) {
      return [];
    }
    
    return first.filter(item => 
      rest.every(arr => this.includes(arr, item))
    );
  }

  /**
   * 并集
   */
  static union<T>(...arrays: T[][]): T[] {
    const combined = arrays.reduce((acc, arr) => {
      if (this.isArray(arr)) {
        acc.push(...arr);
      }
      return acc;
    }, [] as T[]);
    
    return this.unique(combined);
  }

  /**
   * 差集
   */
  static difference<T>(arr1: T[], arr2: T[]): T[] {
    if (this.isEmpty(arr1)) {
      return [];
    }
    if (this.isEmpty(arr2)) {
      return [...arr1];
    }
    
    return arr1.filter(item => !this.includes(arr2, item));
  }

  /**
   * 对称差集
   */
  static symmetricDifference<T>(arr1: T[], arr2: T[]): T[] {
    const diff1 = this.difference(arr1, arr2);
    const diff2 = this.difference(arr2, arr1);
    return [...diff1, ...diff2];
  }

  /**
   * 压缩数组
   */
  static zip<T>(...arrays: T[][]): T[][] {
    if (arrays.length === 0) {
      return [];
    }
    
    const maxLength = Math.max(...arrays.map(arr => this.getLength(arr)));
    const result: T[][] = [];
    
    for (let i = 0; i < maxLength; i++) {
      result.push(arrays.map(arr => this.get(arr, i) as T));
    }
    
    return result;
  }

  /**
   * 解压缩数组
   */
  static unzip<T>(arr: T[][]): T[][] {
    if (this.isEmpty(arr)) {
      return [];
    }
    
    return this.zip(...arr);
  }

  /**
   * 分页
   */
  static paginate<T>(arr: T[], page: number, pageSize: number): PaginationResult<T> {
    if (this.isEmpty(arr) || page < 1 || pageSize < 1) {
      return {
        data: [],
        page: 1,
        pageSize,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      };
    }
    
    const total = arr.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const data = arr.slice(startIndex, endIndex);
    
    return {
      data,
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  /**
   * 移动元素
   */
  static move<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
    if (this.isEmpty(arr) || fromIndex === toIndex) {
      return [...arr];
    }
    
    if (fromIndex < 0 || fromIndex >= arr.length || toIndex < 0 || toIndex >= arr.length) {
      throw new ValidationError('索引超出范围');
    }
    
    const result = [...arr];
    const [movedItem] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, movedItem);
    
    return result;
  }

  /**
   * 插入元素
   */
  static insert<T>(arr: T[], index: number, ...items: T[]): T[] {
    if (this.isEmpty(items)) {
      return [...arr];
    }
    
    const result = [...arr];
    result.splice(index, 0, ...items);
    return result;
  }

  /**
   * 移除元素
   */
  static remove<T>(arr: T[], index: number, count: number = 1): T[] {
    if (this.isEmpty(arr) || index < 0 || index >= arr.length) {
      return [...arr];
    }
    
    const result = [...arr];
    result.splice(index, count);
    return result;
  }

  /**
   * 移除指定值
   */
  static removeValue<T>(arr: T[], value: T): T[] {
    if (this.isEmpty(arr)) {
      return [];
    }
    
    return arr.filter(item => item !== value);
  }

  /**
   * 移除满足条件的元素
   */
  static removeWhere<T>(arr: T[], predicate: (item: T, index: number) => boolean): T[] {
    if (this.isEmpty(arr)) {
      return [];
    }
    
    return arr.filter((item, index) => !predicate(item, index));
  }

  /**
   * 更新元素
   */
  static update<T>(arr: T[], index: number, value: T): T[] {
    if (this.isEmpty(arr) || index < 0 || index >= arr.length) {
      return [...arr];
    }
    
    const result = [...arr];
    result[index] = value;
    return result;
  }

  /**
   * 更新满足条件的元素
   */
  static updateWhere<T>(
    arr: T[],
    predicate: (item: T, index: number) => boolean,
    updater: (item: T, index: number) => T
  ): T[] {
    if (this.isEmpty(arr)) {
      return [];
    }
    
    return arr.map((item, index) => 
      predicate(item, index) ? updater(item, index) : item
    );
  }

  /**
   * 范围生成
   */
  static range(start: number, end?: number, step: number = 1): number[] {
    if (end === undefined) {
      end = start;
      start = 0;
    }
    
    if (step === 0) {
      throw new ValidationError('步长不能为0');
    }
    
    const result: number[] = [];
    
    if (step > 0) {
      for (let i = start; i < end; i += step) {
        result.push(i);
      }
    } else {
      for (let i = start; i > end; i += step) {
        result.push(i);
      }
    }
    
    return result;
  }

  /**
   * 填充数组
   */
  static fill<T>(length: number, value: T | ((index: number) => T)): T[] {
    if (length <= 0) {
      return [];
    }
    
    const result: T[] = [];
    
    for (let i = 0; i < length; i++) {
      if (typeof value === 'function') {
        result.push((value as (index: number) => T)(i));
      } else {
        result.push(value);
      }
    }
    
    return result;
  }

  /**
   * 转换为映射
   */
  static toMap<T, K, V>(
    arr: T[],
    keyFn: (item: T) => K,
    valueFn?: (item: T) => V
  ): Map<K, V | T> {
    const map = new Map<K, V | T>();
    
    if (this.isEmpty(arr)) {
      return map;
    }
    
    for (const item of arr) {
      const key = keyFn(item);
      const value = valueFn ? valueFn(item) : item;
      map.set(key, value);
    }
    
    return map;
  }

  /**
   * 转换为对象
   */
  static toObject<T, V>(
    arr: T[],
    keyFn: (item: T) => string | number,
    valueFn?: (item: T) => V
  ): Record<string | number, V | T> {
    const obj: Record<string | number, V | T> = {};
    
    if (this.isEmpty(arr)) {
      return obj;
    }
    
    for (const item of arr) {
      const key = keyFn(item);
      const value = valueFn ? valueFn(item) : item;
      obj[key] = value;
    }
    
    return obj;
  }

  /**
   * 深度克隆数组
   */
  static deepClone<T>(arr: T[]): T[] {
    if (this.isEmpty(arr)) {
      return [];
    }
    
    return JSON.parse(JSON.stringify(arr));
  }

  /**
   * 比较两个数组是否相等
   */
  static equals<T>(arr1: T[], arr2: T[], compareFn?: (a: T, b: T) => boolean): boolean {
    if (arr1 === arr2) {
      return true;
    }
    
    if (!this.isArray(arr1) || !this.isArray(arr2)) {
      return false;
    }
    
    if (arr1.length !== arr2.length) {
      return false;
    }
    
    for (let i = 0; i < arr1.length; i++) {
      if (compareFn) {
        if (!compareFn(arr1[i], arr2[i])) {
          return false;
        }
      } else {
        if (arr1[i] !== arr2[i]) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * 获取数组的统计信息
   */
  static stats(arr: number[]): {
    count: number;
    sum: number;
    min: number;
    max: number;
    mean: number;
    median: number;
  } {
    if (this.isEmpty(arr)) {
      return {
        count: 0,
        sum: 0,
        min: 0,
        max: 0,
        mean: 0,
        median: 0
      };
    }
    
    const sorted = [...arr].sort((a, b) => a - b);
    const count = arr.length;
    const sum = arr.reduce((acc, val) => acc + val, 0);
    const min = sorted[0];
    const max = sorted[count - 1];
    const mean = sum / count;
    const median = count % 2 === 0
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];
    
    return { count, sum, min, max, mean, median };
  }
}

/**
 * 导出常用数组函数
 */
export const {
  isArray,
  isEmpty,
  isNotEmpty,
  length,
  get,
  first,
  last,
  random,
  randomSample,
  shuffle,
  unique,
  flatten,
  flattenDeep,
  chunk,
  groupBy,
  countBy,
  sortBy,
  multiSort,
  filter,
  find,
  findIndex,
  includes,
  some,
  every,
  map,
  reduce,
  intersection,
  union,
  difference,
  symmetricDifference,
  zip,
  unzip,
  paginate,
  move,
  insert,
  remove,
  removeValue,
  removeWhere,
  update,
  updateWhere,
  range,
  fill,
  toMap,
  toObject,
  deepClone,
  equals,
  stats
} = ArrayUtils;