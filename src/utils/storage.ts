/**
 * 存储工具函数
 * 提供统一的本地存储管理逻辑
 */

// 预设存储键
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'zhixing_user_preferences',
  TRADING_SETTINGS: 'zhixing_trading_settings',
  CACHE_TIMESTAMP: 'zhixing_cache_timestamp',
  USER_SETTINGS: 'zhixing_user_settings',
  AUTH_TOKEN: 'zhixing_auth_token',
  USER_INFO: 'zhixing_user_info',
  THEME: 'zhixing_theme',
  LANGUAGE: 'zhixing_language'
} as const;
import { ErrorHandler, ValidationError } from './errorHandling';

/**
 * 存储类型枚举
 */
export enum StorageType {
  LOCAL = 'localStorage',
  SESSION = 'sessionStorage',
  MEMORY = 'memory'
}

/**
 * 存储选项接口
 */
export interface StorageOptions {
  type?: StorageType;
  encrypt?: boolean;
  compress?: boolean;
  expiry?: number; // 过期时间（毫秒）
  version?: string; // 数据版本
}

/**
 * 存储项接口
 */
export interface StorageItem<T = any> {
  value: T;
  timestamp: number;
  expiry?: number;
  version?: string;
  encrypted?: boolean;
  compressed?: boolean;
}

/**
 * 存储事件接口
 */
export interface StorageEvent<T = any> {
  key: string;
  oldValue: T | null;
  newValue: T | null;
  type: 'set' | 'remove' | 'clear';
  timestamp: number;
}

/**
 * 内存存储实现
 */
class MemoryStorage {
  private data: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.data.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  get length(): number {
    return this.data.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.data.keys());
    return keys[index] || null;
  }
}

/**
 * 存储管理器类
 */
export class StorageManager {
  private static memoryStorage = new MemoryStorage();
  private static listeners: Map<string, Array<(event: StorageEvent) => void>> = new Map();
  private static encryptionKey = 'zhixing_trader_key';

  /**
   * 获取存储实例
   */
  private static getStorage(type: StorageType): Storage | MemoryStorage {
    switch (type) {
      case StorageType.LOCAL:
        return typeof window !== 'undefined' ? window.localStorage : this.memoryStorage;
      case StorageType.SESSION:
        return typeof window !== 'undefined' ? window.sessionStorage : this.memoryStorage;
      case StorageType.MEMORY:
        return this.memoryStorage;
      default:
        return this.memoryStorage;
    }
  }

  /**
   * 设置存储项
   */
  static set<T>(
    key: string,
    value: T,
    options: StorageOptions = {}
  ): boolean {
    try {
      const {
        type = StorageType.LOCAL,
        encrypt = false,
        compress = false,
        expiry,
        version
      } = options;

      const storage = this.getStorage(type);
      const oldValue = this.get<T>(key, { type });

      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
        expiry: expiry ? Date.now() + expiry : undefined,
        version,
        encrypted: encrypt,
        compressed: compress
      };

      let serializedValue = JSON.stringify(item);

      // 压缩
      if (compress) {
        serializedValue = this.compress(serializedValue);
      }

      // 加密
      if (encrypt) {
        serializedValue = this.encrypt(serializedValue);
      }

      storage.setItem(key, serializedValue);

      // 触发事件
      this.emitEvent({
        key,
        oldValue,
        newValue: value,
        type: 'set',
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      ErrorHandler.handleError(error as Error, {
        component: 'StorageManager',
        action: 'set',
        additionalData: { key, options }
      });
      return false;
    }
  }

  /**
   * 获取存储项
   */
  static get<T>(
    key: string,
    options: StorageOptions = {}
  ): T | null {
    try {
      const {
        type = StorageType.LOCAL,
        version
      } = options;

      const storage = this.getStorage(type);
      let serializedValue = storage.getItem(key);

      if (!serializedValue) {
        return null;
      }

      // 解密
      if (serializedValue.startsWith('encrypted:')) {
        serializedValue = this.decrypt(serializedValue);
      }

      // 解压缩
      if (serializedValue.startsWith('compressed:')) {
        serializedValue = this.decompress(serializedValue);
      }

      const item: StorageItem<T> = JSON.parse(serializedValue);

      // 检查过期时间
      if (item.expiry && Date.now() > item.expiry) {
        this.remove(key, { type });
        return null;
      }

      // 检查版本
      if (version && item.version !== version) {
        this.remove(key, { type });
        return null;
      }

      return item.value;
    } catch (error) {
      ErrorHandler.handleError(error as Error, {
        component: 'StorageManager',
        action: 'get',
        additionalData: { key, options }
      });
      return null;
    }
  }

  /**
   * 移除存储项
   */
  static remove(
    key: string,
    options: StorageOptions = {}
  ): boolean {
    try {
      const { type = StorageType.LOCAL } = options;
      const storage = this.getStorage(type);
      const oldValue = this.get(key, { type });

      storage.removeItem(key);

      // 触发事件
      this.emitEvent({
        key,
        oldValue,
        newValue: null,
        type: 'remove',
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      ErrorHandler.handleError(error as Error, {
        component: 'StorageManager',
        action: 'remove',
        additionalData: { key, options }
      });
      return false;
    }
  }

  /**
   * 清空存储
   */
  static clear(type: StorageType = StorageType.LOCAL): boolean {
    try {
      const storage = this.getStorage(type);
      storage.clear();

      // 触发事件
      this.emitEvent({
        key: '*',
        oldValue: null,
        newValue: null,
        type: 'clear',
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      ErrorHandler.handleError(error as Error, {
        component: 'StorageManager',
        action: 'clear',
        additionalData: { type }
      });
      return false;
    }
  }

  /**
   * 检查存储项是否存在
   */
  static has(
    key: string,
    options: StorageOptions = {}
  ): boolean {
    return this.get(key, options) !== null;
  }

  /**
   * 获取所有键
   */
  static keys(type: StorageType = StorageType.LOCAL): string[] {
    try {
      const storage = this.getStorage(type);
      const keys: string[] = [];

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          keys.push(key);
        }
      }

      return keys;
    } catch (error) {
      ErrorHandler.handleError(error as Error, {
        component: 'StorageManager',
        action: 'keys',
        additionalData: { type }
      });
      return [];
    }
  }

  /**
   * 获取存储大小
   */
  static size(type: StorageType = StorageType.LOCAL): number {
    try {
      const storage = this.getStorage(type);
      let totalSize = 0;

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          const value = storage.getItem(key);
          if (value) {
            totalSize += key.length + value.length;
          }
        }
      }

      return totalSize;
    } catch (error) {
      ErrorHandler.handleError(error as Error, {
        component: 'StorageManager',
        action: 'size',
        additionalData: { type }
      });
      return 0;
    }
  }

  /**
   * 清理过期项
   */
  static cleanup(type: StorageType = StorageType.LOCAL): number {
    try {
      const storage = this.getStorage(type);
      const keys = this.keys(type);
      let cleanedCount = 0;

      for (const key of keys) {
        try {
          const serializedValue = storage.getItem(key);
          if (serializedValue) {
            const item: StorageItem = JSON.parse(serializedValue);
            if (item.expiry && Date.now() > item.expiry) {
              this.remove(key, { type });
              cleanedCount++;
            }
          }
        } catch {
          // 忽略解析错误的项
        }
      }

      return cleanedCount;
    } catch (error) {
      ErrorHandler.handleError(error as Error, {
        component: 'StorageManager',
        action: 'cleanup',
        additionalData: { type }
      });
      return 0;
    }
  }

  /**
   * 添加事件监听器
   */
  static addEventListener(
    key: string,
    listener: (event: StorageEvent) => void
  ): void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key)!.push(listener);
  }

  /**
   * 移除事件监听器
   */
  static removeEventListener(
    key: string,
    listener: (event: StorageEvent) => void
  ): void {
    const listeners = this.listeners.get(key);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  private static emitEvent(event: StorageEvent): void {
    // 触发特定键的监听器
    const keyListeners = this.listeners.get(event.key);
    if (keyListeners) {
      for (const listener of keyListeners) {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in storage listener:', error);
        }
      }
    }

    // 触发通配符监听器
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      for (const listener of wildcardListeners) {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in storage listener:', error);
        }
      }
    }
  }

  /**
   * 简单加密
   */
  private static encrypt(data: string): string {
    try {
      // 这里使用简单的Base64编码，实际项目中应使用更安全的加密算法
      const encoded = btoa(unescape(encodeURIComponent(data)));
      return `encrypted:${encoded}`;
    } catch {
      return data;
    }
  }

  /**
   * 简单解密
   */
  private static decrypt(encryptedData: string): string {
    try {
      const data = encryptedData.replace('encrypted:', '');
      return decodeURIComponent(escape(atob(data)));
    } catch {
      return encryptedData;
    }
  }

  /**
   * 简单压缩
   */
  private static compress(data: string): string {
    // 这里使用简单的压缩算法，实际项目中可以使用更高效的压缩库
    try {
      const compressed = data.replace(/\s+/g, ' ').trim();
      return `compressed:${compressed}`;
    } catch {
      return data;
    }
  }

  /**
   * 简单解压缩
   */
  private static decompress(compressedData: string): string {
    try {
      return compressedData.replace('compressed:', '');
    } catch {
      return compressedData;
    }
  }

  /**
   * 导出数据
   */
  static export(type: StorageType = StorageType.LOCAL): Record<string, any> {
    try {
      const keys = this.keys(type);
      const data: Record<string, any> = {};

      for (const key of keys) {
        data[key] = this.get(key, { type });
      }

      return data;
    } catch (error) {
      ErrorHandler.handleError(error as Error, {
        component: 'StorageManager',
        action: 'export',
        additionalData: { type }
      });
      return {};
    }
  }

  /**
   * 导入数据
   */
  static import(
    data: Record<string, any>,
    options: StorageOptions = {}
  ): boolean {
    try {
      for (const [key, value] of Object.entries(data)) {
        this.set(key, value, options);
      }
      return true;
    } catch (error) {
      ErrorHandler.handleError(error as Error, {
        component: 'StorageManager',
        action: 'import',
        additionalData: { options }
      });
      return false;
    }
  }
}

/**
 * 预定义的存储操作
 */
export class PresetStorage {
  /**
   * 用户设置
   */
  static setUserSettings(settings: any): boolean {
    return StorageManager.set(STORAGE_KEYS.USER_SETTINGS, settings, {
      type: StorageType.LOCAL,
      encrypt: true
    });
  }

  static getUserSettings(): any {
    return StorageManager.get(STORAGE_KEYS.USER_SETTINGS, {
      type: StorageType.LOCAL
    });
  }

  /**
   * 认证令牌
   */
  static setAuthToken(token: string): boolean {
    return StorageManager.set(STORAGE_KEYS.AUTH_TOKEN, token, {
      type: StorageType.SESSION,
      encrypt: true,
      expiry: 24 * 60 * 60 * 1000 // 24小时
    });
  }

  static getAuthToken(): string | null {
    return StorageManager.get(STORAGE_KEYS.AUTH_TOKEN, {
      type: StorageType.SESSION
    });
  }

  static removeAuthToken(): boolean {
    return StorageManager.remove(STORAGE_KEYS.AUTH_TOKEN, {
      type: StorageType.SESSION
    });
  }

  /**
   * 用户信息
   */
  static setUserInfo(userInfo: any): boolean {
    return StorageManager.set(STORAGE_KEYS.USER_INFO, userInfo, {
      type: StorageType.LOCAL,
      encrypt: true
    });
  }

  static getUserInfo(): any {
    return StorageManager.get(STORAGE_KEYS.USER_INFO, {
      type: StorageType.LOCAL
    });
  }

  /**
   * 主题设置
   */
  static setTheme(theme: string): boolean {
    return StorageManager.set(STORAGE_KEYS.THEME, theme, {
      type: StorageType.LOCAL
    });
  }

  static getTheme(): string | null {
    return StorageManager.get(STORAGE_KEYS.THEME, {
      type: StorageType.LOCAL
    });
  }

  /**
   * 语言设置
   */
  static setLanguage(language: string): boolean {
    return StorageManager.set(STORAGE_KEYS.LANGUAGE, language, {
      type: StorageType.LOCAL
    });
  }

  static getLanguage(): string | null {
    return StorageManager.get(STORAGE_KEYS.LANGUAGE, {
      type: StorageType.LOCAL
    });
  }

  /**
   * 缓存数据
   */
  static setCacheData(key: string, data: any, expiry?: number): boolean {
    return StorageManager.set(`cache_${key}`, data, {
      type: StorageType.SESSION,
      expiry: expiry || 30 * 60 * 1000, // 默认30分钟
      compress: true
    });
  }

  static getCacheData(key: string): any {
    return StorageManager.get(`cache_${key}`, {
      type: StorageType.SESSION
    });
  }

  static removeCacheData(key: string): boolean {
    return StorageManager.remove(`cache_${key}`, {
      type: StorageType.SESSION
    });
  }

  /**
   * 清理所有缓存
   */
  static clearCache(): number {
    const keys = StorageManager.keys(StorageType.SESSION);
    let cleanedCount = 0;

    for (const key of keys) {
      if (key.startsWith('cache_')) {
        if (StorageManager.remove(key, { type: StorageType.SESSION })) {
          cleanedCount++;
        }
      }
    }

    return cleanedCount;
  }
}

/**
 * 导出常用存储函数
 */
export const setItem = StorageManager.set;
export const getItem = StorageManager.get;
export const removeItem = StorageManager.remove;
export const clearStorage = StorageManager.clear;
export const hasItem = StorageManager.has;
export const getStorageKeys = StorageManager.keys;
export const getStorageSize = StorageManager.size;
export const cleanupStorage = StorageManager.cleanup;
export const addStorageListener = StorageManager.addEventListener;
export const removeStorageListener = StorageManager.removeEventListener;
export const exportStorage = StorageManager.export;
export const importStorage = StorageManager.import;