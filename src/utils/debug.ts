/**
 * 调试工具函数
 * 提供统一的调试和日志处理逻辑
 */

import { ErrorHandler } from './errorHandling';
import { StringUtils } from './string';
import { DateTime } from './dateTime';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

/**
 * 日志配置接口
 */
export interface LogConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageSize: number;
  storageKey: string;
  enableTimestamp: boolean;
  enableStackTrace: boolean;
  enableColors: boolean;
  prefix?: string;
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
  stackTrace?: string;
  source?: string;
}

/**
 * 性能监控配置接口
 */
export interface PerformanceConfig {
  enableMemoryMonitoring: boolean;
  enableTimingMonitoring: boolean;
  enableNetworkMonitoring: boolean;
  sampleRate: number;
}

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  memory?: {
    used: number;
    total: number;
    percentage: number;
  };
  timing?: {
    [key: string]: number;
  };
  network?: {
    requests: number;
    errors: number;
    averageResponseTime: number;
  };
}

/**
 * 调试工具类
 */
export class DebugUtils {
  private static config: LogConfig = {
    level: LogLevel.INFO,
    enableConsole: true,
    enableStorage: false,
    maxStorageSize: 1000,
    storageKey: 'app_logs',
    enableTimestamp: true,
    enableStackTrace: false,
    enableColors: true
  };

  private static logs: LogEntry[] = [];
  private static timers = new Map<string, number>();
  private static counters = new Map<string, number>();
  private static performanceConfig: PerformanceConfig = {
    enableMemoryMonitoring: false,
    enableTimingMonitoring: false,
    enableNetworkMonitoring: false,
    sampleRate: 1.0
  };

  /**
   * 配置日志系统
   */
  static configure(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 配置性能监控
   */
  static configurePerformance(config: Partial<PerformanceConfig>): void {
    this.performanceConfig = { ...this.performanceConfig, ...config };
  }

  /**
   * 获取日志级别名称
   */
  private static getLevelName(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'DEBUG';
      case LogLevel.INFO:
        return 'INFO';
      case LogLevel.WARN:
        return 'WARN';
      case LogLevel.ERROR:
        return 'ERROR';
      case LogLevel.FATAL:
        return 'FATAL';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * 获取日志级别颜色
   */
  private static getLevelColor(level: LogLevel): string {
    if (!this.config.enableColors) {
      return '';
    }

    switch (level) {
      case LogLevel.DEBUG:
        return '\x1b[36m'; // 青色
      case LogLevel.INFO:
        return '\x1b[32m'; // 绿色
      case LogLevel.WARN:
        return '\x1b[33m'; // 黄色
      case LogLevel.ERROR:
        return '\x1b[31m'; // 红色
      case LogLevel.FATAL:
        return '\x1b[35m'; // 紫色
      default:
        return '\x1b[0m'; // 重置
    }
  }

  /**
   * 重置颜色
   */
  private static getResetColor(): string {
    return this.config.enableColors ? '\x1b[0m' : '';
  }

  /**
   * 生成日志ID
   */
  private static generateLogId(): string {
    return StringUtils.shortId();
  }

  /**
   * 获取调用栈
   */
  private static getStackTrace(): string {
    if (!this.config.enableStackTrace) {
      return '';
    }

    const stack = new Error().stack;
    if (!stack) {
      return '';
    }

    // 移除前几行（Error构造和当前方法）
    const lines = stack.split('\n').slice(3);
    return lines.join('\n');
  }

  /**
   * 获取调用源
   */
  private static getSource(): string {
    const stack = new Error().stack;
    if (!stack) {
      return '';
    }

    const lines = stack.split('\n');
    // 查找第一个不是当前文件的调用
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      if (line && !line.includes('debug.ts')) {
        const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
        if (match) {
          const [, func, file, lineNum] = match;
          const fileName = file.split('/').pop() || file;
          return `${fileName}:${lineNum} (${func})`;
        }
      }
    }

    return '';
  }

  /**
   * 记录日志
   */
  private static log(level: LogLevel, message: string, data?: any): void {
    // 检查日志级别
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      level,
      message,
      data,
      stackTrace: this.getStackTrace(),
      source: this.getSource()
    };

    // 添加到内存日志
    this.logs.push(entry);

    // 限制内存日志大小
    if (this.logs.length > this.config.maxStorageSize) {
      this.logs.shift();
    }

    // 输出到控制台
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // 保存到存储
    if (this.config.enableStorage) {
      this.saveToStorage();
    }
  }

  /**
   * 输出到控制台
   */
  private static outputToConsole(entry: LogEntry): void {
    const levelName = this.getLevelName(entry.level);
    const levelColor = this.getLevelColor(entry.level);
    const resetColor = this.getResetColor();
    
    let output = '';

    // 添加前缀
    if (this.config.prefix) {
      output += `[${this.config.prefix}] `;
    }

    // 添加时间戳
    if (this.config.enableTimestamp) {
      const timestamp = DateTime.formatDate(new Date(entry.timestamp), 'YYYY-MM-DD HH:mm:ss.SSS');
      output += `${timestamp} `;
    }

    // 添加级别
    output += `${levelColor}[${levelName}]${resetColor} `;

    // 添加源信息
    if (entry.source) {
      output += `${entry.source} `;
    }

    // 添加消息
    output += entry.message;

    // 选择合适的控制台方法
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(output, entry.data);
        break;
      case LogLevel.INFO:
        console.info(output, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(output, entry.data);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(output, entry.data);
        if (entry.stackTrace) {
          console.error(entry.stackTrace);
        }
        break;
      default:
        console.log(output, entry.data);
        break;
    }
  }

  /**
   * 保存到存储
   */
  private static saveToStorage(): void {
    try {
      const serialized = JSON.stringify(this.logs);
      localStorage.setItem(this.config.storageKey, serialized);
    } catch (error) {
      console.error('Failed to save logs to storage:', error);
    }
  }

  /**
   * 从存储加载日志
   */
  static loadFromStorage(): LogEntry[] {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load logs from storage:', error);
    }
    return [];
  }

  /**
   * DEBUG 级别日志
   */
  static debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * INFO 级别日志
   */
  static info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * WARN 级别日志
   */
  static warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * ERROR 级别日志
   */
  static error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * FATAL 级别日志
   */
  static fatal(message: string, data?: any): void {
    this.log(LogLevel.FATAL, message, data);
  }

  /**
   * 开始计时
   */
  static time(label: string): void {
    this.timers.set(label, performance.now());
    this.debug(`Timer started: ${label}`);
  }

  /**
   * 结束计时
   */
  static timeEnd(label: string): number {
    const startTime = this.timers.get(label);
    if (startTime === undefined) {
      this.warn(`Timer not found: ${label}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(label);
    this.info(`Timer ended: ${label} - ${duration.toFixed(2)}ms`);
    return duration;
  }

  /**
   * 计数器
   */
  static count(label: string): number {
    const current = this.counters.get(label) || 0;
    const newCount = current + 1;
    this.counters.set(label, newCount);
    this.debug(`Counter: ${label} = ${newCount}`);
    return newCount;
  }

  /**
   * 重置计数器
   */
  static countReset(label: string): void {
    this.counters.delete(label);
    this.debug(`Counter reset: ${label}`);
  }

  /**
   * 获取计数器值
   */
  static getCount(label: string): number {
    return this.counters.get(label) || 0;
  }

  /**
   * 断言
   */
  static assert(condition: boolean, message: string, data?: any): void {
    if (!condition) {
      this.error(`Assertion failed: ${message}`, data);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  /**
   * 分组开始
   */
  static group(label: string): void {
    if (this.config.enableConsole) {
      console.group(label);
    }
    this.debug(`Group started: ${label}`);
  }

  /**
   * 分组结束
   */
  static groupEnd(): void {
    if (this.config.enableConsole) {
      console.groupEnd();
    }
    this.debug('Group ended');
  }

  /**
   * 表格输出
   */
  static table(data: any[], columns?: string[]): void {
    if (this.config.enableConsole) {
      if (columns) {
        console.table(data, columns);
      } else {
        console.table(data);
      }
    }
    this.debug('Table output', { data, columns });
  }

  /**
   * 跟踪函数调用
   */
  static trace(target: any, propertyKey: string): void {
    const originalMethod = target[propertyKey];
    
    if (typeof originalMethod !== 'function') {
      this.warn(`Cannot trace non-function property: ${propertyKey}`);
      return;
    }

    target[propertyKey] = function (...args: any[]) {
      const className = target.constructor.name;
      const methodName = `${className}.${propertyKey}`;
      
      DebugUtils.debug(`Calling ${methodName}`, args);
      DebugUtils.time(methodName);
      
      try {
        const result = originalMethod.apply(this, args);
        
        if (result instanceof Promise) {
          return result
            .then(value => {
              DebugUtils.timeEnd(methodName);
              DebugUtils.debug(`${methodName} resolved`, value);
              return value;
            })
            .catch(error => {
              DebugUtils.timeEnd(methodName);
              DebugUtils.error(`${methodName} rejected`, error);
              throw error;
            });
        } else {
          DebugUtils.timeEnd(methodName);
          DebugUtils.debug(`${methodName} returned`, result);
          return result;
        }
      } catch (error) {
        DebugUtils.timeEnd(methodName);
        DebugUtils.error(`${methodName} threw error`, error);
        throw error;
      }
    };
  }

  /**
   * 性能监控
   */
  static getPerformanceMetrics(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {};

    // 内存监控
    if (this.performanceConfig.enableMemoryMonitoring && 'memory' in performance) {
      const memory = (performance as any).memory;
      metrics.memory = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }

    // 时间监控
    if (this.performanceConfig.enableTimingMonitoring) {
      const timing: { [key: string]: number } = {};
      
      // 获取导航时间
      if ('navigation' in performance) {
        const nav = performance.navigation;
        timing.navigationType = nav.type;
        timing.redirectCount = nav.redirectCount;
      }

      // 获取时间信息
      if ('timing' in performance) {
        const t = performance.timing;
        timing.domContentLoaded = t.domContentLoadedEventEnd - t.navigationStart;
        timing.loadComplete = t.loadEventEnd - t.navigationStart;
        timing.domReady = t.domComplete - t.navigationStart;
      }

      metrics.timing = timing;
    }

    return metrics;
  }

  /**
   * 获取所有日志
   */
  static getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  /**
   * 清空日志
   */
  static clearLogs(): void {
    this.logs.length = 0;
    if (this.config.enableStorage) {
      localStorage.removeItem(this.config.storageKey);
    }
    this.info('Logs cleared');
  }

  /**
   * 导出日志
   */
  static exportLogs(format: 'json' | 'csv' | 'txt' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(this.logs, null, 2);
      
      case 'csv':
        const headers = ['ID', 'Timestamp', 'Level', 'Message', 'Source', 'Data'];
        const rows = this.logs.map(log => [
          log.id,
          DateTime.formatDate(new Date(log.timestamp), 'YYYY-MM-DD HH:mm:ss.SSS'),
          this.getLevelName(log.level),
          log.message,
          log.source || '',
          log.data ? JSON.stringify(log.data) : ''
        ]);
        return [headers, ...rows].map(row => row.join(',')).join('\n');
      
      case 'txt':
        return this.logs.map(log => {
          const timestamp = DateTime.formatDate(new Date(log.timestamp), 'YYYY-MM-DD HH:mm:ss.SSS');
          const level = this.getLevelName(log.level);
          const source = log.source ? ` [${log.source}]` : '';
          const data = log.data ? ` | Data: ${JSON.stringify(log.data)}` : '';
          return `${timestamp} [${level}]${source} ${log.message}${data}`;
        }).join('\n');
      
      default:
        return JSON.stringify(this.logs, null, 2);
    }
  }

  /**
   * 获取调试统计
   */
  static getStats(): {
    totalLogs: number;
    logsByLevel: Record<string, number>;
    timers: string[];
    counters: Record<string, number>;
    memoryUsage?: PerformanceMetrics['memory'];
  } {
    const logsByLevel: Record<string, number> = {};
    
    for (const log of this.logs) {
      const levelName = this.getLevelName(log.level);
      logsByLevel[levelName] = (logsByLevel[levelName] || 0) + 1;
    }

    const stats = {
      totalLogs: this.logs.length,
      logsByLevel,
      timers: Array.from(this.timers.keys()),
      counters: Object.fromEntries(this.counters)
    };

    const metrics = this.getPerformanceMetrics();
    if (metrics.memory) {
      (stats as any).memoryUsage = metrics.memory;
    }

    return stats;
  }

  /**
   * 创建调试装饰器
   */
  static createDecorator(options: {
    logArgs?: boolean;
    logResult?: boolean;
    logErrors?: boolean;
    logTiming?: boolean;
  } = {}) {
    const {
      logArgs = true,
      logResult = true,
      logErrors = true,
      logTiming = true
    } = options;

    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = function (...args: any[]) {
        const className = target.constructor.name;
        const methodName = `${className}.${propertyKey}`;
        
        if (logArgs) {
          DebugUtils.debug(`${methodName} called with args:`, args);
        }
        
        if (logTiming) {
          DebugUtils.time(methodName);
        }
        
        try {
          const result = originalMethod.apply(this, args);
          
          if (result instanceof Promise) {
            return result
              .then(value => {
                if (logTiming) {
                  DebugUtils.timeEnd(methodName);
                }
                if (logResult) {
                  DebugUtils.debug(`${methodName} resolved:`, value);
                }
                return value;
              })
              .catch(error => {
                if (logTiming) {
                  DebugUtils.timeEnd(methodName);
                }
                if (logErrors) {
                  DebugUtils.error(`${methodName} rejected:`, error);
                }
                throw error;
              });
          } else {
            if (logTiming) {
              DebugUtils.timeEnd(methodName);
            }
            if (logResult) {
              DebugUtils.debug(`${methodName} returned:`, result);
            }
            return result;
          }
        } catch (error) {
          if (logTiming) {
            DebugUtils.timeEnd(methodName);
          }
          if (logErrors) {
            DebugUtils.error(`${methodName} threw error:`, error);
          }
          throw error;
        }
      };
      
      return descriptor;
    };
  }
}

/**
 * 导出常用调试函数
 */
export const {
  configure,
  configurePerformance,
  debug,
  info,
  warn,
  error,
  fatal,
  time,
  timeEnd,
  count,
  countReset,
  getCount,
  assert,
  group,
  groupEnd,
  table,
  trace,
  getPerformanceMetrics,
  getLogs,
  clearLogs,
  exportLogs,
  getStats,
  createDecorator
} = DebugUtils;

/**
 * 调试装饰器
 */
export const debugMethod = DebugUtils.createDecorator();