/**
 * 数据验证工具函数
 * 提供统一的数据验证逻辑
 */

// 移除不存在的导入

// 验证工具类
export class ValidationUtils {
  // 股票相关验证常量
  static readonly STOCK = {
    SYMBOL: {
      MIN_LENGTH: 1,
      MAX_LENGTH: 10,
      PATTERN: /^[A-Z0-9]{1,10}$/
    },
    NAME: {
      MAX_LENGTH: 50
    },
    PRICE: {
      MIN: 0.01,
      MAX: 999999.99
    },
    VOLUME: {
      MIN: 0,
      MAX: 999999999
    }
  } as const;

  static readonly STOCK_SYMBOL_PATTERN = /^[A-Z0-9]{1,10}$/;
  
  // 交易相关验证常量
  static readonly TRADING = {
    AMOUNT: {
      MIN: 100,
      MAX: 10000000
    },
    POSITION: {
      MIN: 0,
      MAX: 1
    },
    PRICE: {
      MIN: 0.01,
      MAX: 999999.99
    },
    QUANTITY: {
      MIN: 1,
      MAX: 999999999
    }
  } as const;
  
  // 策略相关验证常量
  static readonly STRATEGY = {
    NAME: {
      MIN_LENGTH: 1,
      MAX_LENGTH: 50
    },
    DESCRIPTION: {
      MIN_LENGTH: 0,
      MAX_LENGTH: 500
    }
  } as const;
  
  // 概念相关验证常量
  static readonly CONCEPT = {
    NAME: {
      MIN_LENGTH: 1,
      MAX_LENGTH: 30
    },
    DESCRIPTION: {
      MIN_LENGTH: 0,
      MAX_LENGTH: 500
    }
  } as const;

  // 验证股票代码
  static isValidStockSymbol(symbol: string): boolean {
    if (!symbol || typeof symbol !== 'string') return false;
    if (symbol.length < ValidationUtils.STOCK.SYMBOL.MIN_LENGTH) return false;
    if (symbol.length > ValidationUtils.STOCK.SYMBOL.MAX_LENGTH) return false;
    return ValidationUtils.STOCK.SYMBOL.PATTERN.test(symbol);
  }

  // 验证股票名称
  static isValidStockName(name: string): boolean {
    if (!name || typeof name !== 'string') return false;
    if (name.length > ValidationUtils.STOCK.NAME.MAX_LENGTH) return false;
    return true;
  }

  // 验证股票价格
  static isValidStockPrice(price: number): boolean {
    if (typeof price !== 'number' || isNaN(price)) return false;
    return price >= ValidationUtils.STOCK.PRICE.MIN && price <= ValidationUtils.STOCK.PRICE.MAX;
  }

  // 验证交易量
  static isValidVolume(volume: number): boolean {
    if (typeof volume !== 'number' || isNaN(volume)) return false;
    return volume >= ValidationUtils.STOCK.VOLUME.MIN && volume <= ValidationUtils.STOCK.VOLUME.MAX;
  }

  // 验证交易金额
  static isValidTradeAmount(amount: number): boolean {
    if (typeof amount !== 'number' || isNaN(amount)) return false;
    return amount >= ValidationUtils.TRADING.AMOUNT.MIN && amount <= ValidationUtils.TRADING.AMOUNT.MAX;
  }

  // 验证仓位大小
  static isValidPositionSize(size: number): boolean {
    if (typeof size !== 'number' || isNaN(size)) return false;
    return size >= ValidationUtils.TRADING.POSITION.MIN && size <= ValidationUtils.TRADING.POSITION.MAX;
  }

  // 验证策略名称
  static isValidStrategyName(name: string): boolean {
    if (!name || typeof name !== 'string') return false;
    if (name.length < ValidationUtils.STRATEGY.NAME.MIN_LENGTH) return false;
    if (name.length > ValidationUtils.STRATEGY.NAME.MAX_LENGTH) return false;
    return true;
  }

  // 验证概念名称
  static isValidConceptName(name: string): boolean {
    if (!name || typeof name !== 'string') return false;
    if (name.length < ValidationUtils.CONCEPT.NAME.MIN_LENGTH) return false;
    if (name.length > ValidationUtils.CONCEPT.NAME.MAX_LENGTH) return false;
    return true;
  }

  /**
   * 验证邮箱地址
   */
  static isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证手机号码
   */
  static isValidPhone(phone: string): boolean {
    if (!phone || typeof phone !== 'string') return false;
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }
}

// 验证结果接口
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// 验证选项接口
export interface ValidationOptions {
  strict?: boolean;
  skipEmpty?: boolean;
  customRules?: Record<string, (value: any) => boolean>;
}

/**
 * 基础验证函数
 */
export class Validator {
  /**
   * 验证股票代码
   */
  static validateStockCode(code: string): ValidationResult {
    const errors: string[] = [];
    
    if (!code || typeof code !== 'string') {
      errors.push('股票代码不能为空');
      return { isValid: false, errors };
    }
    
    const trimmedCode = code.trim().toUpperCase();
    
    if (trimmedCode.length < ValidationUtils.STOCK.SYMBOL.MIN_LENGTH || 
        trimmedCode.length > ValidationUtils.STOCK.SYMBOL.MAX_LENGTH) {
      errors.push(`股票代码长度必须在${ValidationUtils.STOCK.SYMBOL.MIN_LENGTH}-${ValidationUtils.STOCK.SYMBOL.MAX_LENGTH}位之间`);
    }
    
    if (!/^[A-Z0-9]+$/.test(trimmedCode)) {
      errors.push('股票代码只能包含字母和数字');
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * 验证股票名称
   */
  static validateStockName(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (!name || typeof name !== 'string') {
      errors.push('股票名称不能为空');
      return { isValid: false, errors };
    }
    
    const trimmedName = name.trim();
    
    if (trimmedName.length > ValidationUtils.STOCK.NAME.MAX_LENGTH) {
      errors.push(`股票名称长度不能超过${ValidationUtils.STOCK.NAME.MAX_LENGTH}字符`);
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * 验证价格
   */
  static validatePrice(price: number): ValidationResult {
    const errors: string[] = [];
    
    if (typeof price !== 'number' || isNaN(price)) {
      errors.push('价格必须是有效数字');
      return { isValid: false, errors };
    }
    
    if (price < 0) {
      errors.push('价格不能为负数');
    }
    
    if (price > ValidationUtils.TRADING.PRICE.MAX) {
      errors.push(`价格不能超过${ValidationUtils.TRADING.PRICE.MAX}`);
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * 验证数量
   */
  static validateQuantity(quantity: number): ValidationResult {
    const errors: string[] = [];
    
    if (typeof quantity !== 'number' || isNaN(quantity)) {
      errors.push('数量必须是有效数字');
      return { isValid: false, errors };
    }
    
    if (quantity <= 0) {
      errors.push('数量必须大于0');
    }
    
    if (quantity > ValidationUtils.TRADING.QUANTITY.MAX) {
      errors.push(`数量不能超过${ValidationUtils.TRADING.QUANTITY.MAX}`);
    }
    
    if (quantity % ValidationUtils.TRADING.QUANTITY.MIN !== 0) {
      errors.push(`数量必须是${ValidationUtils.TRADING.QUANTITY.MIN}的倍数`);
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * 验证策略名称
   */
  static validateStrategyName(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (!name || typeof name !== 'string') {
      errors.push('策略名称不能为空');
      return { isValid: false, errors };
    }
    
    const trimmedName = name.trim();
    
    if (trimmedName.length < ValidationUtils.STRATEGY.NAME.MIN_LENGTH || 
        trimmedName.length > ValidationUtils.STRATEGY.NAME.MAX_LENGTH) {
      errors.push(`策略名称长度必须在${ValidationUtils.STRATEGY.NAME.MIN_LENGTH}-${ValidationUtils.STRATEGY.NAME.MAX_LENGTH}字符之间`);
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * 验证概念名称
   */
  static validateConceptName(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (!name || typeof name !== 'string') {
      errors.push('概念名称不能为空');
      return { isValid: false, errors };
    }
    
    const trimmedName = name.trim();
    
    if (trimmedName.length < ValidationUtils.CONCEPT.NAME.MIN_LENGTH || 
        trimmedName.length > ValidationUtils.CONCEPT.NAME.MAX_LENGTH) {
      errors.push(`概念名称长度必须在${ValidationUtils.CONCEPT.NAME.MIN_LENGTH}-${ValidationUtils.CONCEPT.NAME.MAX_LENGTH}字符之间`);
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * 验证邮箱地址
   */
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    
    if (!email || typeof email !== 'string') {
      errors.push('邮箱地址不能为空');
      return { isValid: false, errors };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('邮箱地址格式不正确');
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * 验证手机号码
   */
  static validatePhone(phone: string): ValidationResult {
    const errors: string[] = [];
    
    if (!phone || typeof phone !== 'string') {
      errors.push('手机号码不能为空');
      return { isValid: false, errors };
    }
    
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      errors.push('手机号码格式不正确');
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * 验证日期
   */
  static validateDate(date: string | Date): ValidationResult {
    const errors: string[] = [];
    
    let dateObj: Date;
    
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      errors.push('日期格式不正确');
      return { isValid: false, errors };
    }
    
    if (isNaN(dateObj.getTime())) {
      errors.push('日期格式不正确');
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * 验证URL
   */
  static validateUrl(url: string): ValidationResult {
    const errors: string[] = [];
    
    if (!url || typeof url !== 'string') {
      errors.push('URL不能为空');
      return { isValid: false, errors };
    }
    
    try {
      new URL(url);
    } catch {
      errors.push('URL格式不正确');
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * 验证JSON字符串
   */
  static validateJson(jsonString: string): ValidationResult {
    const errors: string[] = [];
    
    if (!jsonString || typeof jsonString !== 'string') {
      errors.push('JSON字符串不能为空');
      return { isValid: false, errors };
    }
    
    try {
      JSON.parse(jsonString);
    } catch {
      errors.push('JSON格式不正确');
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * 批量验证
   */
  static validateBatch(validations: Array<() => ValidationResult>): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    
    for (const validation of validations) {
      const result = validation();
      if (!result.isValid) {
        allErrors.push(...result.errors);
      }
      if (result.warnings) {
        allWarnings.push(...result.warnings);
      }
    }
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings.length > 0 ? allWarnings : undefined
    };
  }
  
  /**
   * 自定义验证
   */
  static validateCustom(
    value: any,
    rules: Array<(value: any) => string | null>,
    options: ValidationOptions = {}
  ): ValidationResult {
    const errors: string[] = [];
    
    if (options.skipEmpty && (value === null || value === undefined || value === '')) {
      return { isValid: true, errors: [] };
    }
    
    for (const rule of rules) {
      const error = rule(value);
      if (error) {
        errors.push(error);
        if (!options.strict) {
          break; // 非严格模式下，遇到第一个错误就停止
        }
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }
}

/**
 * 常用验证规则
 */
export const ValidationRules = {
  required: (value: any) => {
    if (value === null || value === undefined || value === '') {
      return '此字段为必填项';
    }
    return null;
  },
  
  minLength: (min: number) => (value: string) => {
    if (typeof value === 'string' && value.length < min) {
      return `最少需要${min}个字符`;
    }
    return null;
  },
  
  maxLength: (max: number) => (value: string) => {
    if (typeof value === 'string' && value.length > max) {
      return `最多允许${max}个字符`;
    }
    return null;
  },
  
  min: (min: number) => (value: number) => {
    if (typeof value === 'number' && value < min) {
      return `值不能小于${min}`;
    }
    return null;
  },
  
  max: (max: number) => (value: number) => {
    if (typeof value === 'number' && value > max) {
      return `值不能大于${max}`;
    }
    return null;
  },
  
  pattern: (regex: RegExp, message: string) => (value: string) => {
    if (typeof value === 'string' && !regex.test(value)) {
      return message;
    }
    return null;
  },
  
  oneOf: (options: any[], message?: string) => (value: any) => {
    if (!options.includes(value)) {
      return message || `值必须是以下选项之一：${options.join(', ')}`;
    }
    return null;
  }
};

/**
 * 验证工具函数
 */
export const validateStockCode = Validator.validateStockCode;
export const validateStockName = Validator.validateStockName;
export const validatePrice = Validator.validatePrice;
export const validateQuantity = Validator.validateQuantity;
export const validateStrategyName = Validator.validateStrategyName;
export const validateConceptName = Validator.validateConceptName;
export const validateEmail = Validator.validateEmail;
export const validatePhone = Validator.validatePhone;
export const validateDate = Validator.validateDate;
export const validateUrl = Validator.validateUrl;
export const validateJson = Validator.validateJson;
export const validateBatch = Validator.validateBatch;
export const validateCustom = Validator.validateCustom;