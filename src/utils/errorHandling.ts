/**
 * 错误处理工具函数
 * 提供统一的错误处理逻辑
 */

import { ERROR_MESSAGES } from '../constants';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  BUSINESS = 'BUSINESS',
  SYSTEM = 'SYSTEM',
  UNKNOWN = 'UNKNOWN'
}

/**
 * 错误严重级别
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * 错误上下文接口
 */
export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  timestamp?: string;
  userAgent?: string;
  url?: string;
  additionalData?: Record<string, any>;
}

/**
 * 应用错误类
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public context: ErrorContext;
  public readonly originalError?: Error;
  public readonly isRetryable: boolean;
  public readonly timestamp: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    code?: string,
    context: ErrorContext = {},
    originalError?: Error,
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.code = code || this.generateErrorCode(type);
    this.context = {
      timestamp: new Date().toISOString(),
      ...context
    };
    this.originalError = originalError;
    this.isRetryable = isRetryable;
    this.timestamp = new Date().toISOString();

    // 保持错误堆栈
    if (originalError && originalError.stack) {
      this.stack = originalError.stack;
    }
  }

  private generateErrorCode(type: ErrorType): string {
    const timestamp = Date.now().toString(36);
    return `${type}_${timestamp}`;
  }

  /**
   * 转换为JSON格式
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      code: this.code,
      context: this.context,
      isRetryable: this.isRetryable,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(): string {
    switch (this.type) {
      case ErrorType.NETWORK:
        return ERROR_MESSAGES.NETWORK_ERROR;
      case ErrorType.VALIDATION:
        return ERROR_MESSAGES.VALIDATION_ERROR;
      case ErrorType.AUTHENTICATION:
        return ERROR_MESSAGES.UNAUTHORIZED;
      case ErrorType.AUTHORIZATION:
        return ERROR_MESSAGES.FORBIDDEN;
      case ErrorType.NOT_FOUND:
        return ERROR_MESSAGES.NOT_FOUND;
      case ErrorType.BUSINESS:
        return this.message;
      case ErrorType.SYSTEM:
        return ERROR_MESSAGES.SERVER_ERROR;
      default:
        return ERROR_MESSAGES.SERVER_ERROR;
    }
  }
}

/**
 * 网络错误类
 */
export class NetworkError extends AppError {
  constructor(
    message: string,
    code?: string,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(
      message,
      ErrorType.NETWORK,
      ErrorSeverity.HIGH,
      code,
      context,
      originalError,
      true // 网络错误通常可重试
    );
    this.name = 'NetworkError';
  }
}

/**
 * 验证错误类
 */
export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(
    message: string,
    field?: string,
    value?: any,
    context: ErrorContext = {}
  ) {
    super(
      message,
      ErrorType.VALIDATION,
      ErrorSeverity.LOW,
      undefined,
      context
    );
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * 业务错误类
 */
export class BusinessError extends AppError {
  constructor(
    message: string,
    code?: string,
    context: ErrorContext = {},
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ) {
    super(
      message,
      ErrorType.BUSINESS,
      severity,
      code,
      context
    );
    this.name = 'BusinessError';
  }
}

/**
 * 错误处理工具类
 */
export class ErrorHandler {
  private static errorListeners: Array<(error: AppError) => void> = [];
  private static errorCounts: Map<string, number> = new Map();
  private static maxRetries = 3;
  private static retryDelay = 1000;

  /**
   * 添加错误监听器
   */
  static addErrorListener(listener: (error: AppError) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * 移除错误监听器
   */
  static removeErrorListener(listener: (error: AppError) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * 处理错误
   */
  static handleError(error: Error | AppError, context: ErrorContext = {}): AppError {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
      // 更新上下文
      if (Object.keys(context).length > 0) {
        appError.context = { ...appError.context, ...context };
      }
    } else {
      appError = this.createAppError(error, context);
    }

    // 记录错误
    this.logError(appError);

    // 通知监听器
    this.notifyListeners(appError);

    // 更新错误计数
    this.updateErrorCount(appError.code);

    return appError;
  }

  /**
   * 创建应用错误
   */
  private static createAppError(error: Error, context: ErrorContext): AppError {
    // 根据错误类型和消息判断错误类型
    let type = ErrorType.UNKNOWN;
    let severity = ErrorSeverity.MEDIUM;
    let isRetryable = false;

    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      type = ErrorType.SYSTEM;
      severity = ErrorSeverity.HIGH;
    } else if (error.message.includes('fetch') || error.message.includes('network')) {
      type = ErrorType.NETWORK;
      severity = ErrorSeverity.HIGH;
      isRetryable = true;
    } else if (error.message.includes('validation') || error.message.includes('invalid')) {
      type = ErrorType.VALIDATION;
      severity = ErrorSeverity.LOW;
    } else if (error.message.includes('unauthorized') || error.message.includes('forbidden')) {
      type = ErrorType.AUTHENTICATION;
      severity = ErrorSeverity.MEDIUM;
    } else if (error.message.includes('not found')) {
      type = ErrorType.NOT_FOUND;
      severity = ErrorSeverity.LOW;
    }

    return new AppError(
      error.message,
      type,
      severity,
      undefined,
      context,
      error,
      isRetryable
    );
  }

  /**
   * 记录错误
   */
  private static logError(error: AppError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logData = {
      error: error.toJSON(),
      context: error.context
    };

    switch (logLevel) {
      case 'error':
        console.error('[ERROR]', error.message, logData);
        break;
      case 'warn':
        console.warn('[WARN]', error.message, logData);
        break;
      case 'info':
        console.info('[INFO]', error.message, logData);
        break;
      default:
        console.log('[LOG]', error.message, logData);
    }
  }

  /**
   * 获取日志级别
   */
  private static getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'log';
    }
  }

  /**
   * 通知监听器
   */
  private static notifyListeners(error: AppError): void {
    for (const listener of this.errorListeners) {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    }
  }

  /**
   * 更新错误计数
   */
  private static updateErrorCount(code: string): void {
    const count = this.errorCounts.get(code) || 0;
    this.errorCounts.set(code, count + 1);
  }

  /**
   * 获取错误计数
   */
  static getErrorCount(code: string): number {
    return this.errorCounts.get(code) || 0;
  }

  /**
   * 清除错误计数
   */
  static clearErrorCount(code?: string): void {
    if (code) {
      this.errorCounts.delete(code);
    } else {
      this.errorCounts.clear();
    }
  }

  /**
   * 重试函数
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.maxRetries,
    delay: number = this.retryDelay,
    context: ErrorContext = {}
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        const appError = this.handleError(lastError, {
          ...context,
          additionalData: {
            ...context.additionalData,
            attempt,
            maxRetries
          }
        });

        // 如果不可重试或已达到最大重试次数，抛出错误
        if (!appError.isRetryable || attempt === maxRetries) {
          throw appError;
        }

        // 等待后重试
        await this.sleep(delay * attempt); // 指数退避
      }
    }

    throw this.handleError(lastError!, context);
  }

  /**
   * 睡眠函数
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 安全执行函数
   */
  static async safeExecute<T>(
    fn: () => Promise<T>,
    fallback?: T,
    context: ErrorContext = {}
  ): Promise<T | undefined> {
    try {
      return await fn();
    } catch (error) {
      this.handleError(error as Error, context);
      return fallback;
    }
  }

  /**
   * 包装异步函数
   */
  static wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: ErrorContext = {}
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        throw this.handleError(error as Error, context);
      }
    };
  }

  /**
   * 包装同步函数
   */
  static wrapSync<T extends any[], R>(
    fn: (...args: T) => R,
    context: ErrorContext = {}
  ): (...args: T) => R {
    return (...args: T): R => {
      try {
        return fn(...args);
      } catch (error) {
        throw this.handleError(error as Error, context);
      }
    };
  }

  /**
   * 获取错误统计
   */
  static getErrorStats(): { code: string; count: number }[] {
    return Array.from(this.errorCounts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 重置错误处理器
   */
  static reset(): void {
    this.errorListeners.length = 0;
    this.errorCounts.clear();
  }
}

/**
 * 错误边界装饰器
 */
export function errorBoundary(context: ErrorContext = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      try {
        const result = originalMethod.apply(this, args);
        
        // 如果返回Promise，包装错误处理
        if (result && typeof result.then === 'function') {
          return result.catch((error: Error) => {
            throw ErrorHandler.handleError(error, {
              ...context,
              component: target.constructor.name,
              action: propertyKey
            });
          });
        }
        
        return result;
      } catch (error) {
        throw ErrorHandler.handleError(error as Error, {
          ...context,
          component: target.constructor.name,
          action: propertyKey
        });
      }
    };

    return descriptor;
  };
}

/**
 * 导出常用错误处理函数
 */
export const handleError = ErrorHandler.handleError;
export const retry = ErrorHandler.retry;
export const safeExecute = ErrorHandler.safeExecute;
export const wrapAsync = ErrorHandler.wrapAsync;
export const wrapSync = ErrorHandler.wrapSync;
export const addErrorListener = ErrorHandler.addErrorListener;
export const removeErrorListener = ErrorHandler.removeErrorListener;
export const getErrorCount = ErrorHandler.getErrorCount;
export const clearErrorCount = ErrorHandler.clearErrorCount;
export const getErrorStats = ErrorHandler.getErrorStats;