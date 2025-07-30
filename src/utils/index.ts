/**
 * 工具函数统一导出文件
 * 整合所有工具函数，提供统一的导入入口
 */

// 导出所有工具模块
export * from './validation';
export * from './formatters';
export { 
  DateTime as DateTimeUtils,
  formatDate as dateTimeFormatDate,
  parseDate,
  getDateRange,
  isBusinessDay,
  addDays,
  diffInDays,
  isWeekend,
  startOfDay,
  endOfDay,
  getTimestamp,
  fromTimestamp,
  now,
  isToday,
  isWeekday,
  isInTradingHours,
  getNextTradingDay,
  getPreviousTradingDay
} from './dateTime';
export * from './transformers';
export * from './errorHandling';
export * from './storage';
export * from './math';
export { StringUtils, isEmpty, isNotEmpty, toString, trim, removeAllSpaces, compressSpaces, capitalize, capitalizeWords, toCamelCase, toPascalCase, toSnakeCase, toKebabCase, truncate, padStart, padEnd, repeat, reverse, contains, startsWith, endsWith, countOccurrences, replaceAll, stripHtml, escapeHtml, unescapeHtml, escapeRegExp, random as stringRandom, uuid, shortId, byteLength, truncateByBytes, similarity, levenshteinDistance, fuzzySearch, highlight, extractNumbers, extractEmails, extractUrls, extractChinese, isChinese, isEnglish, isNumeric, isAlphanumeric, template, parseQuery, buildQuery } from './string';
export { ArrayUtils, isArray, isEmpty as arrayIsEmpty, isNotEmpty as arrayIsNotEmpty, length as arrayLength, get, first, last, random as arrayRandom, randomSample, shuffle, unique, flatten, flattenDeep, chunk, groupBy, countBy, sortBy, multiSort, filter, find, findIndex, includes, some, every, map, reduce, intersection, union, difference, symmetricDifference, zip, unzip, paginate, move, insert, remove, removeValue, removeWhere, update, updateWhere, range, fill, toMap, toObject, deepClone as arrayDeepClone, equals, stats } from './array';
export { 
  ObjectUtils,
  isObject,
  isPlainObject,
  isEmpty as objectIsEmpty,
  isNotEmpty as objectIsNotEmpty,
  keys,
  values,
  entries,
  fromEntries,
  hasKey,
  hasValue,
  get as objectGet,
  set as objectSet,
  unset,
  has as objectHas,
  deepClone as objectDeepClone,
  shallowClone,
  deepMerge,
  shallowMerge,
  pick,
  omit,
  mapValues,
  mapKeys,
  filter as objectFilter,
  find as objectFind,
  findKey,
  some as objectSome,
  every as objectEvery,
  reduce as objectReduce,
  invert,
  groupBy as objectGroupBy,
  flatten as objectFlatten,
  unflatten,
  equals as objectEquals,
  diff,
  size as objectSize,
  serialize,
  deserialize,
  deepFreeze,
  isFrozen,
  isSealed,
  isExtensible
} from './object';
export { 
  AsyncUtils,
  delay,
  timeout,
  retry as asyncRetry,
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
} from './async';
export * from './debug';

// 导出常用的工具类
export { ValidationUtils } from './validation';
export { Formatter as FormatUtils } from './formatters';
export { DateTime } from './dateTime';
export { DataTransformer as TransformUtils } from './transformers';
export { ErrorHandler, AppError } from './errorHandling';
export { StorageManager as StorageUtils, PresetStorage } from './storage';
export { MathUtils, Statistics, FinancialMath } from './math';


export { DebugUtils } from './debug';

// 导出常用的函数（从各个模块中导出）
// 验证函数已通过模块导出

// 格式化函数已通过模块导出

// 日期时间函数已通过模块导出

// 字符串函数已通过显式导出

// 数组函数已通过显式导出

// 对象函数已通过模块导出

// 异步函数已通过模块导出

// 调试函数已通过模块导出

// 现有工具
export * from './cn';
export * from './futuCsvParser';


// 工具函数类型定义
export interface UtilsConfig {
  debug: boolean;
  locale: string;
  timezone: string;
}

// 默认配置
export const DEFAULT_UTILS_CONFIG: UtilsConfig = {
  debug: process.env.NODE_ENV === 'development',
  locale: 'zh-CN',
  timezone: 'Asia/Shanghai'
};

// 工具函数管理器
export class UtilsManager {
  private static instance: UtilsManager;
  private config: UtilsConfig;

  private constructor(config: UtilsConfig = DEFAULT_UTILS_CONFIG) {
    this.config = config;
  }

  static getInstance(config?: UtilsConfig): UtilsManager {
    if (!UtilsManager.instance) {
      UtilsManager.instance = new UtilsManager(config);
    }
    return UtilsManager.instance;
  }

  getConfig(): UtilsConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<UtilsConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  isDebugMode(): boolean {
    return this.config.debug;
  }

  getLocale(): string {
    return this.config.locale;
  }

  getTimezone(): string {
    return this.config.timezone;
  }
}

// 导出工具管理器实例
export const utilsManager = UtilsManager.getInstance();