/**
 * 数学计算工具函数
 * 提供统一的数学运算逻辑
 */

import { ErrorHandler, ValidationError } from './errorHandling';

/**
 * 统计数据接口
 */
export interface StatisticsData {
  count: number;
  sum: number;
  mean: number;
  median: number;
  mode: number[];
  min: number;
  max: number;
  range: number;
  variance: number;
  standardDeviation: number;
  skewness: number;
  kurtosis: number;
  quartiles: {
    q1: number;
    q2: number;
    q3: number;
    iqr: number;
  };
}

/**
 * 技术指标数据接口
 */
export interface TechnicalIndicators {
  sma: number[]; // 简单移动平均
  ema: number[]; // 指数移动平均
  rsi: number[]; // 相对强弱指数
  macd: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  bollinger: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
}

/**
 * 数学工具类
 */
export class MathUtils {
  /**
   * 精确加法
   */
  static add(a: number, b: number, precision: number = 2): number {
    const factor = Math.pow(10, precision);
    return Math.round((a + b) * factor) / factor;
  }

  /**
   * 精确减法
   */
  static subtract(a: number, b: number, precision: number = 2): number {
    const factor = Math.pow(10, precision);
    return Math.round((a - b) * factor) / factor;
  }

  /**
   * 精确乘法
   */
  static multiply(a: number, b: number, precision: number = 2): number {
    const factor = Math.pow(10, precision);
    return Math.round(a * b * factor) / factor;
  }

  /**
   * 精确除法
   */
  static divide(a: number, b: number, precision: number = 2): number {
    if (b === 0) {
      throw new ValidationError('除数不能为零');
    }
    const factor = Math.pow(10, precision);
    return Math.round((a / b) * factor) / factor;
  }

  /**
   * 四舍五入到指定小数位
   */
  static round(num: number, precision: number = 2): number {
    const factor = Math.pow(10, precision);
    return Math.round(num * factor) / factor;
  }

  /**
   * 向上取整到指定小数位
   */
  static ceil(num: number, precision: number = 2): number {
    const factor = Math.pow(10, precision);
    return Math.ceil(num * factor) / factor;
  }

  /**
   * 向下取整到指定小数位
   */
  static floor(num: number, precision: number = 2): number {
    const factor = Math.pow(10, precision);
    return Math.floor(num * factor) / factor;
  }

  /**
   * 计算百分比
   */
  static percentage(value: number, total: number, precision: number = 2): number {
    if (total === 0) {
      return 0;
    }
    return this.round((value / total) * 100, precision);
  }

  /**
   * 计算增长率
   */
  static growthRate(oldValue: number, newValue: number, precision: number = 2): number {
    if (oldValue === 0) {
      return newValue > 0 ? 100 : 0;
    }
    return this.round(((newValue - oldValue) / oldValue) * 100, precision);
  }

  /**
   * 计算复合增长率 (CAGR)
   */
  static cagr(beginValue: number, endValue: number, periods: number, precision: number = 2): number {
    if (beginValue <= 0 || periods <= 0) {
      throw new ValidationError('初始值和期数必须大于0');
    }
    return this.round((Math.pow(endValue / beginValue, 1 / periods) - 1) * 100, precision);
  }

  /**
   * 限制数值在指定范围内
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * 线性插值
   */
  static lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor;
  }

  /**
   * 判断是否为有效数字
   */
  static isValidNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }

  /**
   * 安全转换为数字
   */
  static toNumber(value: any, defaultValue: number = 0): number {
    const num = Number(value);
    return this.isValidNumber(num) ? num : defaultValue;
  }

  /**
   * 生成随机数
   */
  static random(min: number = 0, max: number = 1): number {
    return Math.random() * (max - min) + min;
  }

  /**
   * 生成随机整数
   */
  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 计算最大公约数
   */
  static gcd(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }

  /**
   * 计算最小公倍数
   */
  static lcm(a: number, b: number): number {
    return Math.abs(a * b) / this.gcd(a, b);
  }

  /**
   * 计算阶乘
   */
  static factorial(n: number): number {
    if (n < 0 || !Number.isInteger(n)) {
      throw new ValidationError('阶乘的参数必须是非负整数');
    }
    if (n === 0 || n === 1) {
      return 1;
    }
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  /**
   * 计算组合数 C(n, r)
   */
  static combination(n: number, r: number): number {
    if (r > n || r < 0 || !Number.isInteger(n) || !Number.isInteger(r)) {
      throw new ValidationError('组合数参数无效');
    }
    if (r === 0 || r === n) {
      return 1;
    }
    r = Math.min(r, n - r); // 优化计算
    let result = 1;
    for (let i = 0; i < r; i++) {
      result = result * (n - i) / (i + 1);
    }
    return Math.round(result);
  }

  /**
   * 计算排列数 P(n, r)
   */
  static permutation(n: number, r: number): number {
    if (r > n || r < 0 || !Number.isInteger(n) || !Number.isInteger(r)) {
      throw new ValidationError('排列数参数无效');
    }
    let result = 1;
    for (let i = n; i > n - r; i--) {
      result *= i;
    }
    return result;
  }
}

/**
 * 统计工具类
 */
export class Statistics {
  /**
   * 计算总和
   */
  static sum(numbers: number[]): number {
    this.validateArray(numbers);
    return numbers.reduce((sum, num) => sum + num, 0);
  }

  /**
   * 计算平均值
   */
  static mean(numbers: number[]): number {
    this.validateArray(numbers);
    return this.sum(numbers) / numbers.length;
  }

  /**
   * 计算中位数
   */
  static median(numbers: number[]): number {
    this.validateArray(numbers);
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * 计算众数
   */
  static mode(numbers: number[]): number[] {
    this.validateArray(numbers);
    const frequency: Map<number, number> = new Map();
    
    // 计算频率
    for (const num of numbers) {
      frequency.set(num, (frequency.get(num) || 0) + 1);
    }
    
    // 找到最高频率
    const maxFreq = Math.max(...frequency.values());
    
    // 返回所有具有最高频率的数
    return Array.from(frequency.entries())
      .filter(([, freq]) => freq === maxFreq)
      .map(([num]) => num);
  }

  /**
   * 计算最小值
   */
  static min(numbers: number[]): number {
    this.validateArray(numbers);
    return Math.min(...numbers);
  }

  /**
   * 计算最大值
   */
  static max(numbers: number[]): number {
    this.validateArray(numbers);
    return Math.max(...numbers);
  }

  /**
   * 计算范围
   */
  static range(numbers: number[]): number {
    return this.max(numbers) - this.min(numbers);
  }

  /**
   * 计算方差
   */
  static variance(numbers: number[], sample: boolean = false): number {
    this.validateArray(numbers);
    const mean = this.mean(numbers);
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    const divisor = sample ? numbers.length - 1 : numbers.length;
    return this.sum(squaredDiffs) / divisor;
  }

  /**
   * 计算标准差
   */
  static standardDeviation(numbers: number[], sample: boolean = false): number {
    return Math.sqrt(this.variance(numbers, sample));
  }

  /**
   * 计算偏度
   */
  static skewness(numbers: number[]): number {
    this.validateArray(numbers);
    const mean = this.mean(numbers);
    const std = this.standardDeviation(numbers);
    const n = numbers.length;
    
    const cubedDiffs = numbers.map(num => Math.pow((num - mean) / std, 3));
    return (n / ((n - 1) * (n - 2))) * this.sum(cubedDiffs);
  }

  /**
   * 计算峰度
   */
  static kurtosis(numbers: number[]): number {
    this.validateArray(numbers);
    const mean = this.mean(numbers);
    const std = this.standardDeviation(numbers);
    const n = numbers.length;
    
    const fourthPowerDiffs = numbers.map(num => Math.pow((num - mean) / std, 4));
    const kurtosis = (n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))) * this.sum(fourthPowerDiffs);
    return kurtosis - (3 * (n - 1) * (n - 1) / ((n - 2) * (n - 3)));
  }

  /**
   * 计算四分位数
   */
  static quartiles(numbers: number[]): { q1: number; q2: number; q3: number; iqr: number } {
    this.validateArray(numbers);
    const sorted = [...numbers].sort((a, b) => a - b);
    const n = sorted.length;
    
    const q1Index = Math.floor(n * 0.25);
    const q2Index = Math.floor(n * 0.5);
    const q3Index = Math.floor(n * 0.75);
    
    const q1 = sorted[q1Index];
    const q2 = this.median(numbers);
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    
    return { q1, q2, q3, iqr };
  }

  /**
   * 计算相关系数
   */
  static correlation(x: number[], y: number[]): number {
    if (x.length !== y.length) {
      throw new ValidationError('两个数组长度必须相同');
    }
    
    Statistics.validateArray(x);
    Statistics.validateArray(y);
    
    const n = x.length;
    const meanX = this.mean(x);
    const meanY = this.mean(y);
    
    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;
    
    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      
      numerator += diffX * diffY;
      sumXSquared += diffX * diffX;
      sumYSquared += diffY * diffY;
    }
    
    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * 线性回归
   */
  static linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
    if (x.length !== y.length) {
      throw new ValidationError('两个数组长度必须相同');
    }
    
    Statistics.validateArray(x);
    Statistics.validateArray(y);
    
    const n = x.length;
    const meanX = this.mean(x);
    const meanY = this.mean(y);
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      numerator += diffX * (y[i] - meanY);
      denominator += diffX * diffX;
    }
    
    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = meanY - slope * meanX;
    
    // 计算R²
    const correlation = this.correlation(x, y);
    const r2 = correlation * correlation;
    
    return { slope, intercept, r2 };
  }

  /**
   * 获取完整统计信息
   */
  static getStatistics(numbers: number[]): StatisticsData {
    Statistics.validateArray(numbers);
    
    const quartiles = this.quartiles(numbers);
    
    return {
      count: numbers.length,
      sum: this.sum(numbers),
      mean: this.mean(numbers),
      median: this.median(numbers),
      mode: this.mode(numbers),
      min: this.min(numbers),
      max: this.max(numbers),
      range: this.range(numbers),
      variance: this.variance(numbers),
      standardDeviation: this.standardDeviation(numbers),
      skewness: this.skewness(numbers),
      kurtosis: this.kurtosis(numbers),
      quartiles
    };
  }

  /**
   * 验证数组
   */
  static validateArray(numbers: number[]): void {
    if (!Array.isArray(numbers) || numbers.length === 0) {
      throw new ValidationError('输入必须是非空数组');
    }
    
    for (const num of numbers) {
      if (!MathUtils.isValidNumber(num)) {
        throw new ValidationError('数组中包含无效数字');
      }
    }
  }
}

/**
 * 金融计算工具类
 */
export class FinancialMath {
  /**
   * 计算简单移动平均 (SMA)
   */
  static sma(prices: number[], period: number): number[] {
    if (period <= 0 || period > prices.length) {
      throw new ValidationError('周期参数无效');
    }
    
    const result: number[] = [];
    
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      result.push(Statistics.mean(slice));
    }
    
    return result;
  }

  /**
   * 计算指数移动平均 (EMA)
   */
  static ema(prices: number[], period: number): number[] {
    if (period <= 0 || period > prices.length) {
      throw new ValidationError('周期参数无效');
    }
    
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // 第一个EMA值使用SMA
    result.push(Statistics.mean(prices.slice(0, period)));
    
    for (let i = period; i < prices.length; i++) {
      const ema = (prices[i] - result[result.length - 1]) * multiplier + result[result.length - 1];
      result.push(ema);
    }
    
    return result;
  }

  /**
   * 计算相对强弱指数 (RSI)
   */
  static rsi(prices: number[], period: number = 14): number[] {
    if (period <= 0 || period >= prices.length) {
      throw new ValidationError('周期参数无效');
    }
    
    const gains: number[] = [];
    const losses: number[] = [];
    
    // 计算价格变化
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const result: number[] = [];
    
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = Statistics.mean(gains.slice(i - period + 1, i + 1));
      const avgLoss = Statistics.mean(losses.slice(i - period + 1, i + 1));
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        result.push(rsi);
      }
    }
    
    return result;
  }

  /**
   * 计算MACD
   */
  static macd(
    prices: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): { macd: number[]; signal: number[]; histogram: number[] } {
    const fastEMA = this.ema(prices, fastPeriod);
    const slowEMA = this.ema(prices, slowPeriod);
    
    // 计算MACD线
    const macdLine: number[] = [];
    const startIndex = slowPeriod - fastPeriod;
    
    for (let i = 0; i < slowEMA.length; i++) {
      macdLine.push(fastEMA[i + startIndex] - slowEMA[i]);
    }
    
    // 计算信号线
    const signalLine = this.ema(macdLine, signalPeriod);
    
    // 计算柱状图
    const histogram: number[] = [];
    const histogramStartIndex = signalPeriod - 1;
    
    for (let i = 0; i < signalLine.length; i++) {
      histogram.push(macdLine[i + histogramStartIndex] - signalLine[i]);
    }
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram
    };
  }

  /**
   * 计算布林带
   */
  static bollingerBands(
    prices: number[],
    period: number = 20,
    standardDeviations: number = 2
  ): { upper: number[]; middle: number[]; lower: number[] } {
    const sma = this.sma(prices, period);
    const upper: number[] = [];
    const lower: number[] = [];
    
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const std = Statistics.standardDeviation(slice);
      const middle = sma[i - period + 1];
      
      upper.push(middle + (std * standardDeviations));
      lower.push(middle - (std * standardDeviations));
    }
    
    return {
      upper,
      middle: sma,
      lower
    };
  }

  /**
   * 计算夏普比率
   */
  static sharpeRatio(returns: number[], riskFreeRate: number = 0): number {
    Statistics.validateArray(returns);
    
    const excessReturns = returns.map(r => r - riskFreeRate);
    const meanExcessReturn = Statistics.mean(excessReturns);
    const stdExcessReturn = Statistics.standardDeviation(excessReturns);
    
    return stdExcessReturn === 0 ? 0 : meanExcessReturn / stdExcessReturn;
  }

  /**
   * 计算最大回撤
   */
  static maxDrawdown(prices: number[]): { maxDrawdown: number; peak: number; trough: number } {
    Statistics.validateArray(prices);
    
    let maxDrawdown = 0;
    let peak = prices[0];
    let trough = prices[0];
    let currentPeak = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > currentPeak) {
        currentPeak = prices[i];
      }
      
      const drawdown = (currentPeak - prices[i]) / currentPeak;
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        peak = currentPeak;
        trough = prices[i];
      }
    }
    
    return { maxDrawdown, peak, trough };
  }

  /**
   * 计算波动率
   */
  static volatility(returns: number[], annualized: boolean = false): number {
    const std = Statistics.standardDeviation(returns);
    return annualized ? std * Math.sqrt(252) : std; // 假设252个交易日
  }
}

/**
 * 导出常用数学函数
 */
export const {
  add,
  subtract,
  multiply,
  divide,
  round,
  ceil,
  floor,
  percentage,
  growthRate,
  cagr,
  clamp,
  lerp,
  isValidNumber,
  toNumber,
  random,
  randomInt
} = MathUtils;

export const {
  sum,
  mean,
  median,
  mode,
  min,
  max,
  range,
  variance,
  standardDeviation,
  correlation,
  linearRegression,
  getStatistics
} = Statistics;

export const {
  sma,
  ema,
  rsi,
  macd,
  bollingerBands,
  sharpeRatio,
  maxDrawdown,
  volatility
} = FinancialMath;