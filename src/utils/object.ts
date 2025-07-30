/**
 * 对象工具函数
 * 提供统一的对象处理逻辑
 */

import { ErrorHandler, ValidationError } from './errorHandling';
import { ArrayUtils } from './array';

/**
 * 对象路径类型
 */
export type ObjectPath = string | string[];

/**
 * 深度合并选项
 */
export interface MergeOptions {
  arrayMergeStrategy?: 'replace' | 'concat' | 'merge';
  customMerger?: (objValue: any, srcValue: any, key: string) => any;
}

/**
 * 对象比较选项
 */
export interface CompareOptions {
  deep?: boolean;
  ignoreKeys?: string[];
  customComparer?: (a: any, b: any, key: string) => boolean | undefined;
}

/**
 * 对象工具类
 */
export class ObjectUtils {
  /**
   * 判断是否为对象
   */
  static isObject(value: any): value is object {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * 判断是否为纯对象
   */
  static isPlainObject(value: any): value is Record<string, any> {
    if (!this.isObject(value)) {
      return false;
    }
    
    // 检查是否是通过 Object 构造函数创建的
    if (Object.getPrototypeOf(value) === null) {
      return true;
    }
    
    let proto = value;
    while (Object.getPrototypeOf(proto) !== null) {
      proto = Object.getPrototypeOf(proto);
    }
    
    return Object.getPrototypeOf(value) === proto;
  }

  /**
   * 判断对象是否为空
   */
  static isEmpty(obj: any): boolean {
    if (!this.isObject(obj)) {
      return true;
    }
    return Object.keys(obj).length === 0;
  }

  /**
   * 判断对象是否不为空
   */
  static isNotEmpty(obj: any): boolean {
    return !this.isEmpty(obj);
  }

  /**
   * 获取对象键数组
   */
  static keys(obj: any): string[] {
    if (!this.isObject(obj)) {
      return [];
    }
    return Object.keys(obj);
  }

  /**
   * 获取对象值数组
   */
  static values<T>(obj: Record<string, T>): T[] {
    if (!this.isObject(obj)) {
      return [];
    }
    return Object.values(obj);
  }

  /**
   * 获取对象条目数组
   */
  static entries<T>(obj: Record<string, T>): [string, T][] {
    if (!this.isObject(obj)) {
      return [];
    }
    return Object.entries(obj);
  }

  /**
   * 从条目数组创建对象
   */
  static fromEntries<T>(entries: [string, T][]): Record<string, T> {
    if (!ArrayUtils.isArray(entries)) {
      return {};
    }
    return Object.fromEntries(entries);
  }

  /**
   * 检查对象是否包含指定键
   */
  static hasKey(obj: any, key: string): boolean {
    if (!this.isObject(obj)) {
      return false;
    }
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  /**
   * 检查对象是否包含指定值
   */
  static hasValue(obj: any, value: any): boolean {
    if (!this.isObject(obj)) {
      return false;
    }
    return this.values(obj as Record<string, unknown>).includes(value);
  }

  /**
   * 获取对象属性值（支持路径）
   */
  static get(obj: any, path: ObjectPath, defaultValue?: any): any {
    if (!this.isObject(obj)) {
      return defaultValue;
    }
    
    const keys = Array.isArray(path) ? path : path.split('.');
    let result: any = obj;
    
    for (const key of keys) {
      if (result == null || !this.hasKey(result, key)) {
        return defaultValue;
      }
      result = result[key];
    }
    
    return result;
  }

  /**
   * 设置对象属性值（支持路径）
   */
  static set(obj: any, path: ObjectPath, value: any): any {
    if (!this.isObject(obj)) {
      return obj;
    }
    
    const keys = Array.isArray(path) ? path : path.split('.');
    const lastKey = keys.pop();
    
    if (!lastKey) {
      return obj;
    }
    
    let current: any = obj;
    
    for (const key of keys) {
      if (!this.isObject(current[key])) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[lastKey] = value;
    return obj;
  }

  /**
   * 删除对象属性（支持路径）
   */
  static unset(obj: any, path: ObjectPath): boolean {
    if (!this.isObject(obj)) {
      return false;
    }
    
    const keys = Array.isArray(path) ? path : path.split('.');
    const lastKey = keys.pop();
    
    if (!lastKey) {
      return false;
    }
    
    if (keys.length === 0) {
      if (this.hasKey(obj, lastKey)) {
        delete (obj as any)[lastKey];
        return true;
      }
      return false;
    }
    
    const parent = this.get(obj, keys);
    if (this.isObject(parent) && this.hasKey(parent, lastKey)) {
      delete (parent as any)[lastKey];
      return true;
    }
    
    return false;
  }

  /**
   * 检查路径是否存在
   */
  static has(obj: any, path: ObjectPath): boolean {
    if (!this.isObject(obj)) {
      return false;
    }
    
    const keys = Array.isArray(path) ? path : path.split('.');
    let current: any = obj;
    
    for (const key of keys) {
      if (!this.isObject(current) || !this.hasKey(current, key)) {
        return false;
      }
      current = current[key];
    }
    
    return true;
  }

  /**
   * 深度克隆对象
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }
    
    if (obj instanceof RegExp) {
      return new RegExp(obj) as unknown as T;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }
    
    if (this.isObject(obj)) {
      const cloned = {} as T;
      for (const key in obj) {
        if (this.hasKey(obj, key)) {
          (cloned as any)[key] = this.deepClone((obj as any)[key]);
        }
      }
      return cloned;
    }
    
    return obj;
  }

  /**
   * 浅克隆对象
   */
  static shallowClone<T extends object>(obj: T): T {
    if (!this.isObject(obj)) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return [...obj] as unknown as T;
    }
    
    return { ...obj };
  }

  /**
   * 深度合并对象
   */
  static deepMerge<T extends object>(
    target: T,
    ...sources: Partial<T>[]
  ): T;
  static deepMerge<T extends object>(
    target: T,
    source: Partial<T>,
    options?: MergeOptions
  ): T;
  static deepMerge<T extends object>(
    target: T,
    ...args: any[]
  ): T {
    if (!this.isObject(target)) {
      return target;
    }
    
    let sources: Partial<T>[];
    let options: MergeOptions = {};
    
    if (args.length === 2 && this.isPlainObject(args[1])) {
      sources = [args[0]];
      options = args[1];
    } else {
      sources = args;
    }
    
    const result = this.deepClone(target);
    
    for (const source of sources) {
      if (!this.isObject(source)) {
        continue;
      }
      
      this._mergeObject(result, source, options);
    }
    
    return result;
  }

  /**
   * 内部合并方法
   */
  private static _mergeObject(target: any, source: any, options: MergeOptions): void {
    for (const key in source) {
      if (!this.hasKey(source, key)) {
        continue;
      }
      
      const sourceValue = source[key];
      const targetValue = target[key];
      
      // 自定义合并器
      if (options.customMerger) {
        const customResult = options.customMerger(targetValue, sourceValue, key);
        if (customResult !== undefined) {
          target[key] = customResult;
          continue;
        }
      }
      
      // 处理数组
      if (Array.isArray(sourceValue)) {
        if (Array.isArray(targetValue)) {
          switch (options.arrayMergeStrategy) {
            case 'concat':
              target[key] = [...targetValue, ...sourceValue];
              break;
            case 'merge':
              target[key] = this._mergeArrays(targetValue, sourceValue, options);
              break;
            case 'replace':
            default:
              target[key] = this.deepClone(sourceValue);
              break;
          }
        } else {
          target[key] = this.deepClone(sourceValue);
        }
        continue;
      }
      
      // 处理对象
      if (this.isPlainObject(sourceValue)) {
        if (this.isPlainObject(targetValue)) {
          this._mergeObject(targetValue, sourceValue, options);
        } else {
          target[key] = this.deepClone(sourceValue);
        }
        continue;
      }
      
      // 处理基本类型
      target[key] = sourceValue;
    }
  }

  /**
   * 合并数组
   */
  private static _mergeArrays(target: any[], source: any[], options: MergeOptions): any[] {
    const result = [...target];
    
    for (let i = 0; i < source.length; i++) {
      if (i < result.length) {
        if (this.isPlainObject(result[i]) && this.isPlainObject(source[i])) {
          result[i] = this.deepMerge(result[i], source[i], options);
        } else {
          result[i] = this.deepClone(source[i]);
        }
      } else {
        result.push(this.deepClone(source[i]));
      }
    }
    
    return result;
  }

  /**
   * 浅合并对象
   */
  static shallowMerge<T extends object>(
    target: T,
    ...sources: Partial<T>[]
  ): T {
    if (!this.isObject(target)) {
      return target;
    }
    
    return Object.assign({}, target, ...sources);
  }

  /**
   * 选择指定键
   */
  static pick<T extends object, K extends keyof T>(
    obj: T,
    keys: K[]
  ): Pick<T, K> {
    if (!this.isObject(obj) || !ArrayUtils.isArray(keys)) {
      return {} as Pick<T, K>;
    }
    
    const result = {} as Pick<T, K>;
    
    for (const key of keys) {
      if (this.hasKey(obj, key as string)) {
        result[key] = obj[key];
      }
    }
    
    return result;
  }

  /**
   * 排除指定键
   */
  static omit<T extends object, K extends keyof T>(
    obj: T,
    keys: K[]
  ): Omit<T, K> {
    if (!this.isObject(obj)) {
      return {} as Omit<T, K>;
    }
    
    if (!ArrayUtils.isArray(keys)) {
      return { ...obj } as Omit<T, K>;
    }
    
    const result = { ...obj } as any;
    
    for (const key of keys) {
      delete result[key];
    }
    
    return result;
  }

  /**
   * 映射对象值
   */
  static mapValues<T, U>(
    obj: Record<string, T>,
    mapper: (value: T, key: string) => U
  ): Record<string, U> {
    if (!this.isObject(obj)) {
      return {};
    }
    
    const result: Record<string, U> = {};
    
    for (const [key, value] of this.entries(obj)) {
      result[key] = mapper(value, key);
    }
    
    return result;
  }

  /**
   * 映射对象键
   */
  static mapKeys<T>(
    obj: Record<string, T>,
    mapper: (key: string, value: T) => string
  ): Record<string, T> {
    if (!this.isObject(obj)) {
      return {};
    }
    
    const result: Record<string, T> = {};
    
    for (const [key, value] of this.entries(obj)) {
      const newKey = mapper(key, value);
      result[newKey] = value;
    }
    
    return result;
  }

  /**
   * 过滤对象
   */
  static filter<T>(
    obj: Record<string, T>,
    predicate: (value: T, key: string) => boolean
  ): Record<string, T> {
    if (!this.isObject(obj)) {
      return {};
    }
    
    const result: Record<string, T> = {};
    
    for (const [key, value] of this.entries(obj)) {
      if (predicate(value, key)) {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * 查找对象中的值
   */
  static find<T>(
    obj: Record<string, T>,
    predicate: (value: T, key: string) => boolean
  ): T | undefined {
    if (!this.isObject(obj)) {
      return undefined;
    }
    
    for (const [key, value] of this.entries(obj)) {
      if (predicate(value, key)) {
        return value;
      }
    }
    
    return undefined;
  }

  /**
   * 查找对象中的键
   */
  static findKey<T>(
    obj: Record<string, T>,
    predicate: (value: T, key: string) => boolean
  ): string | undefined {
    if (!this.isObject(obj)) {
      return undefined;
    }
    
    for (const [key, value] of this.entries(obj)) {
      if (predicate(value, key)) {
        return key;
      }
    }
    
    return undefined;
  }

  /**
   * 检查对象是否满足条件
   */
  static some<T>(
    obj: Record<string, T>,
    predicate: (value: T, key: string) => boolean
  ): boolean {
    if (!this.isObject(obj)) {
      return false;
    }
    
    for (const [key, value] of this.entries(obj)) {
      if (predicate(value, key)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 检查对象是否全部满足条件
   */
  static every<T>(
    obj: Record<string, T>,
    predicate: (value: T, key: string) => boolean
  ): boolean {
    if (!this.isObject(obj)) {
      return true;
    }
    
    for (const [key, value] of this.entries(obj)) {
      if (!predicate(value, key)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 归约对象
   */
  static reduce<T, U>(
    obj: Record<string, T>,
    reducer: (acc: U, value: T, key: string) => U,
    initialValue: U
  ): U {
    if (!this.isObject(obj)) {
      return initialValue;
    }
    
    let result = initialValue;
    
    for (const [key, value] of this.entries(obj)) {
      result = reducer(result, value, key);
    }
    
    return result;
  }

  /**
   * 反转对象键值
   */
  static invert<T extends string | number>(
    obj: Record<string, T>
  ): Record<string, string> {
    if (!this.isObject(obj)) {
      return {};
    }
    
    const result: Record<string, string> = {};
    
    for (const [key, value] of this.entries(obj)) {
      result[String(value)] = key;
    }
    
    return result;
  }

  /**
   * 分组对象
   */
  static groupBy<T>(
    obj: Record<string, T>,
    keyFn: (value: T, key: string) => string
  ): Record<string, Record<string, T>> {
    if (!this.isObject(obj)) {
      return {};
    }
    
    const result: Record<string, Record<string, T>> = {};
    
    for (const [key, value] of this.entries(obj)) {
      const groupKey = keyFn(value, key);
      
      if (!result[groupKey]) {
        result[groupKey] = {};
      }
      
      result[groupKey][key] = value;
    }
    
    return result;
  }

  /**
   * 扁平化对象
   */
  static flatten(
    obj: any,
    prefix: string = '',
    separator: string = '.'
  ): Record<string, any> {
    if (!this.isObject(obj)) {
      return {};
    }
    
    const result: Record<string, any> = {};
    
    for (const [key, value] of this.entries(obj)) {
      const newKey = prefix ? `${prefix}${separator}${key}` : key;
      
      if (this.isPlainObject(value)) {
        Object.assign(result, this.flatten(value, newKey, separator));
      } else {
        result[newKey] = value;
      }
    }
    
    return result;
  }

  /**
   * 展开扁平化对象
   */
  static unflatten(
    obj: Record<string, any>,
    separator: string = '.'
  ): any {
    if (!this.isObject(obj)) {
      return {};
    }
    
    const result: any = {};
    
    for (const [key, value] of this.entries(obj)) {
      this.set(result, key.split(separator), value);
    }
    
    return result;
  }

  /**
   * 比较两个对象是否相等
   */
  static equals(
    obj1: any,
    obj2: any,
    options: CompareOptions = {}
  ): boolean {
    const { deep = true, ignoreKeys = [], customComparer } = options;
    
    // 严格相等
    if (obj1 === obj2) {
      return true;
    }
    
    // 类型检查
    if (typeof obj1 !== typeof obj2) {
      return false;
    }
    
    // null 检查
    if (obj1 === null || obj2 === null) {
      return obj1 === obj2;
    }
    
    // 数组检查
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      if (obj1.length !== obj2.length) {
        return false;
      }
      
      for (let i = 0; i < obj1.length; i++) {
        if (deep) {
          if (!this.equals(obj1[i], obj2[i], options)) {
            return false;
          }
        } else {
          if (obj1[i] !== obj2[i]) {
            return false;
          }
        }
      }
      
      return true;
    }
    
    // 对象检查
    if (this.isObject(obj1) && this.isObject(obj2)) {
      const keys1 = this.keys(obj1).filter(key => !ignoreKeys.includes(key));
      const keys2 = this.keys(obj2).filter(key => !ignoreKeys.includes(key));
      
      if (keys1.length !== keys2.length) {
        return false;
      }
      
      for (const key of keys1) {
        if (!keys2.includes(key)) {
          return false;
        }
        
        // 自定义比较器
        if (customComparer) {
          const customResult = customComparer(obj1[key], obj2[key], key);
          if (customResult !== undefined) {
            if (!customResult) {
              return false;
            }
            continue;
          }
        }
        
        if (deep) {
          if (!this.equals(obj1[key], obj2[key], options)) {
            return false;
          }
        } else {
          if (obj1[key] !== obj2[key]) {
            return false;
          }
        }
      }
      
      return true;
    }
    
    // 基本类型比较
    return obj1 === obj2;
  }

  /**
   * 获取对象的差异
   */
  static diff(
    obj1: any,
    obj2: any
  ): {
    added: Record<string, any>;
    removed: Record<string, any>;
    changed: Record<string, { from: any; to: any }>;
  } {
    const result = {
      added: {} as Record<string, any>,
      removed: {} as Record<string, any>,
      changed: {} as Record<string, { from: any; to: any }>
    };
    
    if (!this.isObject(obj1) || !this.isObject(obj2)) {
      return result;
    }
    
    const keys1 = this.keys(obj1);
    const keys2 = this.keys(obj2);
    const allKeys = ArrayUtils.unique([...keys1, ...keys2]);
    
    for (const key of allKeys) {
      const hasKey1 = this.hasKey(obj1, key);
      const hasKey2 = this.hasKey(obj2, key);
      
      if (!hasKey1 && hasKey2) {
        result.added[key] = obj2[key];
      } else if (hasKey1 && !hasKey2) {
        result.removed[key] = obj1[key];
      } else if (hasKey1 && hasKey2) {
        if (!this.equals(obj1[key], obj2[key])) {
          result.changed[key] = {
            from: obj1[key],
            to: obj2[key]
          };
        }
      }
    }
    
    return result;
  }

  /**
   * 获取对象大小（字节）
   */
  static size(obj: any): number {
    try {
      return new Blob([JSON.stringify(obj)]).size;
    } catch {
      return 0;
    }
  }

  /**
   * 序列化对象
   */
  static serialize(obj: any, space?: number): string {
    try {
      return JSON.stringify(obj, null, space);
    } catch (error) {
      throw new ValidationError(`对象序列化失败: ${error}`);
    }
  }

  /**
   * 反序列化对象
   */
  static deserialize<T = any>(str: string): T {
    try {
      return JSON.parse(str);
    } catch (error) {
      throw new ValidationError(`对象反序列化失败: ${error}`);
    }
  }

  /**
   * 冻结对象（深度）
   */
  static deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    // 冻结对象本身
    Object.freeze(obj);
    
    // 递归冻结属性
    for (const key in obj) {
      if (this.hasKey(obj, key)) {
        this.deepFreeze((obj as any)[key]);
      }
    }
    
    return obj;
  }

  /**
   * 检查对象是否被冻结
   */
  static isFrozen(obj: any): boolean {
    return Object.isFrozen(obj);
  }

  /**
   * 检查对象是否被密封
   */
  static isSealed(obj: any): boolean {
    return Object.isSealed(obj);
  }

  /**
   * 检查对象是否可扩展
   */
  static isExtensible(obj: any): boolean {
    return Object.isExtensible(obj);
  }
}

/**
 * 导出常用对象函数
 */
export const {
  isObject,
  isPlainObject,
  isEmpty,
  isNotEmpty,
  keys,
  values,
  entries,
  fromEntries,
  hasKey,
  hasValue,
  get,
  set,
  unset,
  has,
  deepClone,
  shallowClone,
  deepMerge,
  shallowMerge,
  pick,
  omit,
  mapValues,
  mapKeys,
  filter,
  find,
  findKey,
  some,
  every,
  reduce,
  invert,
  groupBy,
  flatten,
  unflatten,
  equals,
  diff,
  size,
  serialize,
  deserialize,
  deepFreeze,
  isFrozen,
  isSealed,
  isExtensible
} = ObjectUtils;