/**
 * 异步工具函数
 * 提供统一的异步操作处理逻辑
 */

import { ErrorHandler, AppError, NetworkError } from './errorHandling';

/**
 * 重试配置接口
 */
export interface RetryOptions {
  maxAttempts: number;
  delay: number;
  backoff?: 'linear' | 'exponential' | 'fixed';
  maxDelay?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * 超时配置接口
 */
export interface TimeoutOptions {
  timeout: number;
  timeoutMessage?: string;
}

/**
 * 并发控制配置接口
 */
export interface ConcurrencyOptions {
  concurrency: number;
  preserveOrder?: boolean;
}

/**
 * 批处理配置接口
 */
export interface BatchOptions {
  batchSize: number;
  delay?: number;
  concurrency?: number;
}

/**
 * 缓存配置接口
 */
export interface CacheOptions {
  ttl: number; // 缓存时间（毫秒）
  key?: string; // 缓存键
  storage?: 'memory' | 'session' | 'local';
}

/**
 * 异步结果接口
 */
export interface AsyncResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
  attempts?: number;
}

/**
 * 内存缓存
 */
class MemoryCache {
  private cache = new Map<string, { value: any; expiry: number }>();

  set(key: string, value: any, ttl: number): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) {
      return undefined;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    // 清理过期项
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}

/**
 * 异步工具类
 */
export class AsyncUtils {
  private static memoryCache = new MemoryCache();

  /**
   * 延迟执行
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 超时控制
   */
  static timeout<T>(
    promise: Promise<T>,
    options: TimeoutOptions
  ): Promise<T> {
    const { timeout, timeoutMessage = `操作超时 (${timeout}ms)` } = options;

    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new NetworkError(timeoutMessage));
        }, timeout);
      })
    ]);
  }

  /**
   * 重试机制
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    const {
      maxAttempts,
      delay: initialDelay,
      backoff = 'exponential',
      maxDelay = 30000,
      shouldRetry = () => true,
      onRetry
    } = options;

    let lastError: Error;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // 最后一次尝试，直接抛出错误
        if (attempt === maxAttempts) {
          break;
        }

        // 检查是否应该重试
        if (!shouldRetry(lastError, attempt)) {
          break;
        }

        // 调用重试回调
        if (onRetry) {
          onRetry(lastError, attempt);
        }

        // 等待延迟
        await this.delay(delay);

        // 计算下次延迟
        switch (backoff) {
          case 'linear':
            delay += initialDelay;
            break;
          case 'exponential':
            delay *= 2;
            break;
          case 'fixed':
          default:
            // delay 保持不变
            break;
        }

        // 限制最大延迟
        delay = Math.min(delay, maxDelay);
      }
    }

    throw lastError!;
  }

  /**
   * 安全执行异步函数
   */
  static async safe<T>(
    fn: () => Promise<T>
  ): Promise<AsyncResult<T>> {
    const startTime = Date.now();

    try {
      const data = await fn();
      return {
        success: true,
        data,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 并发控制
   */
  static async concurrent<T>(
    tasks: (() => Promise<T>)[],
    options: ConcurrencyOptions
  ): Promise<T[]> {
    const { concurrency, preserveOrder = true } = options;

    if (tasks.length === 0) {
      return [];
    }

    if (concurrency >= tasks.length) {
      return preserveOrder
        ? Promise.all(tasks.map(task => task()))
        : (await Promise.allSettled(tasks.map(task => task())))
            .map(result => {
              if (result.status === 'fulfilled') {
                return result.value;
              }
              throw result.reason;
            });
    }

    const results: T[] = new Array(tasks.length);
    const executing: Promise<void>[] = [];
    let index = 0;

    const executeTask = async (taskIndex: number): Promise<void> => {
      try {
        const result = await tasks[taskIndex]();
        results[taskIndex] = result;
      } catch (error) {
        if (preserveOrder) {
          throw error;
        }
        // 在非保序模式下，可以选择记录错误而不是抛出
        results[taskIndex] = error as any;
      }
    };

    while (index < tasks.length) {
      if (executing.length < concurrency) {
        const taskPromise = executeTask(index++);
        executing.push(taskPromise);

        taskPromise.finally(() => {
          const idx = executing.indexOf(taskPromise);
          if (idx > -1) {
            executing.splice(idx, 1);
          }
        });
      } else {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * 批处理
   */
  static async batch<T, U>(
    items: T[],
    processor: (batch: T[]) => Promise<U[]>,
    options: BatchOptions
  ): Promise<U[]> {
    const { batchSize, delay = 0, concurrency = 1 } = options;

    if (items.length === 0) {
      return [];
    }

    // 分批
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    // 创建批处理任务
    const tasks = batches.map((batch, index) => async () => {
      if (delay > 0 && index > 0) {
        await this.delay(delay);
      }
      return processor(batch);
    });

    // 并发执行批处理
    const batchResults = await this.concurrent(tasks, { concurrency });

    // 合并结果
    return batchResults.flat();
  }

  /**
   * 队列处理
   */
  static createQueue<T>(concurrency: number = 1) {
    const queue: (() => Promise<T>)[] = [];
    const executing: Promise<T>[] = [];
    let isProcessing = false;

    const processQueue = async (): Promise<void> => {
      if (isProcessing || queue.length === 0) {
        return;
      }

      isProcessing = true;

      while (queue.length > 0 && executing.length < concurrency) {
        const task = queue.shift()!;
        const promise = task();
        executing.push(promise);

        promise.finally(() => {
          const index = executing.indexOf(promise);
          if (index > -1) {
            executing.splice(index, 1);
          }
        });
      }

      if (executing.length > 0) {
        await Promise.race(executing);
        // 递归处理剩余任务
        setImmediate(() => {
          isProcessing = false;
          processQueue();
        });
      } else {
        isProcessing = false;
      }
    };

    return {
      add: (task: () => Promise<T>): Promise<T> => {
        return new Promise((resolve, reject) => {
          queue.push(async () => {
            try {
              const result = await task();
              resolve(result);
              return result;
            } catch (error) {
              reject(error);
              throw error;
            }
          });
          processQueue();
        });
      },
      size: () => queue.length,
      pending: () => executing.length,
      clear: () => {
        queue.length = 0;
      }
    };
  }

  /**
   * 缓存装饰器
   */
  static cached<T extends any[], U>(
    fn: (...args: T) => Promise<U>,
    options: CacheOptions
  ): (...args: T) => Promise<U> {
    const { ttl, key: keyPrefix = '', storage = 'memory' } = options;

    return async (...args: T): Promise<U> => {
      const key = keyPrefix + JSON.stringify(args);

      // 尝试从缓存获取
      let cached: U | undefined;
      switch (storage) {
        case 'memory':
          cached = this.memoryCache.get(key);
          break;
        case 'session':
          try {
            const item = sessionStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              if (Date.now() < parsed.expiry) {
                cached = parsed.value;
              } else {
                sessionStorage.removeItem(key);
              }
            }
          } catch {
            // 忽略解析错误
          }
          break;
        case 'local':
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              if (Date.now() < parsed.expiry) {
                cached = parsed.value;
              } else {
                localStorage.removeItem(key);
              }
            }
          } catch {
            // 忽略解析错误
          }
          break;
      }

      if (cached !== undefined) {
        return cached;
      }

      // 执行函数并缓存结果
      const result = await fn(...args);

      switch (storage) {
        case 'memory':
          this.memoryCache.set(key, result, ttl);
          break;
        case 'session':
          try {
            sessionStorage.setItem(key, JSON.stringify({
              value: result,
              expiry: Date.now() + ttl
            }));
          } catch {
            // 忽略存储错误
          }
          break;
        case 'local':
          try {
            localStorage.setItem(key, JSON.stringify({
              value: result,
              expiry: Date.now() + ttl
            }));
          } catch {
            // 忽略存储错误
          }
          break;
      }

      return result;
    };
  }

  /**
   * 防抖
   */
  static debounce<T extends any[]>(
    fn: (...args: T) => Promise<any>,
    delay: number
  ): (...args: T) => Promise<any> {
    let timeoutId: NodeJS.Timeout | null = null;
    let latestResolve: ((value: any) => void) | null = null;
    let latestReject: ((reason: any) => void) | null = null;

    return (...args: T): Promise<any> => {
      return new Promise((resolve, reject) => {
        // 清除之前的定时器
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // 如果有之前的 Promise，先拒绝它
        if (latestReject) {
          latestReject(new Error('Debounced'));
        }

        latestResolve = resolve;
        latestReject = reject;

        timeoutId = setTimeout(async () => {
          try {
            const result = await fn(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            timeoutId = null;
            latestResolve = null;
            latestReject = null;
          }
        }, delay);
      });
    };
  }

  /**
   * 节流
   */
  static throttle<T extends any[]>(
    fn: (...args: T) => Promise<any>,
    delay: number
  ): (...args: T) => Promise<any> {
    let lastExecution = 0;
    let timeoutId: NodeJS.Timeout | null = null;
    let latestArgs: T | null = null;
    let latestResolve: ((value: any) => void) | null = null;
    let latestReject: ((reason: any) => void) | null = null;

    const execute = async (): Promise<void> => {
      if (!latestArgs || !latestResolve || !latestReject) {
        return;
      }

      const args = latestArgs;
      const resolve = latestResolve;
      const reject = latestReject;

      latestArgs = null;
      latestResolve = null;
      latestReject = null;

      try {
        const result = await fn(...args);
        resolve(result);
      } catch (error) {
        reject(error);
      }

      lastExecution = Date.now();
    };

    return (...args: T): Promise<any> => {
      return new Promise((resolve, reject) => {
        latestArgs = args;
        latestResolve = resolve;
        latestReject = reject;

        const now = Date.now();
        const timeSinceLastExecution = now - lastExecution;

        if (timeSinceLastExecution >= delay) {
          execute();
        } else {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          timeoutId = setTimeout(execute, delay - timeSinceLastExecution);
        }
      });
    };
  }

  /**
   * 竞态条件处理
   */
  static race<T>(
    promises: Promise<T>[]
  ): Promise<{ index: number; value: T }> {
    return new Promise((resolve, reject) => {
      if (promises.length === 0) {
        reject(new Error('No promises provided'));
        return;
      }

      promises.forEach((promise, index) => {
        promise
          .then(value => resolve({ index, value }))
          .catch(reject);
      });
    });
  }

  /**
   * 全部完成（包括失败）
   */
  static async allSettled<T>(
    promises: Promise<T>[]
  ): Promise<Array<{ status: 'fulfilled' | 'rejected'; value?: T; reason?: any }>> {
    return Promise.allSettled(promises).then(results =>
      results.map(result => ({
        status: result.status,
        ...(result.status === 'fulfilled'
          ? { value: result.value }
          : { reason: result.reason })
      }))
    );
  }

  /**
   * 管道处理
   */
  static async pipe<T>(
    value: T,
    ...fns: Array<(value: any) => Promise<any> | any>
  ): Promise<any> {
    let result = value;

    for (const fn of fns) {
      result = await fn(result);
    }

    return result;
  }

  /**
   * 条件执行
   */
  static async when<T>(
    condition: boolean | (() => boolean | Promise<boolean>),
    fn: () => Promise<T>
  ): Promise<T | undefined> {
    const shouldExecute = typeof condition === 'function'
      ? await condition()
      : condition;

    if (shouldExecute) {
      return fn();
    }

    return undefined;
  }

  /**
   * 循环执行
   */
  static async loop<T>(
    condition: () => boolean | Promise<boolean>,
    fn: () => Promise<T>,
    delay: number = 0
  ): Promise<T[]> {
    const results: T[] = [];

    while (await condition()) {
      const result = await fn();
      results.push(result);

      if (delay > 0) {
        await this.delay(delay);
      }
    }

    return results;
  }

  /**
   * 清理缓存
   */
  static clearCache(storage?: 'memory' | 'session' | 'local'): void {
    if (!storage || storage === 'memory') {
      this.memoryCache.clear();
    }

    if (!storage || storage === 'session') {
      try {
        sessionStorage.clear();
      } catch {
        // 忽略错误
      }
    }

    if (!storage || storage === 'local') {
      try {
        localStorage.clear();
      } catch {
        // 忽略错误
      }
    }
  }

  /**
   * 获取缓存统计
   */
  static getCacheStats(): {
    memory: number;
    session: number;
    local: number;
  } {
    let sessionCount = 0;
    let localCount = 0;

    try {
      sessionCount = sessionStorage.length;
    } catch {
      // 忽略错误
    }

    try {
      localCount = localStorage.length;
    } catch {
      // 忽略错误
    }

    return {
      memory: this.memoryCache.size(),
      session: sessionCount,
      local: localCount
    };
  }
}

/**
 * 导出常用异步函数
 */
export const {
  delay,
  timeout,
  retry,
  safe,
  concurrent,
  batch,
  createQueue,
  cached,
  debounce,
  throttle,
  race,
  allSettled,
  pipe,
  when,
  loop,
  clearCache,
  getCacheStats
} = AsyncUtils;