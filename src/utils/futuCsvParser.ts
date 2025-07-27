import { FutuStockData, ImportedStock, Industry } from '@/types';

/**
 * 富途CSV解析器
 * 解析富途牛牛导出的CSV文件格式
 */
export class FutuCsvParser {
  
  /**
   * 解析富途CSV文本
   */
  static parseCsvText(csvText: string): FutuStockData[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV文件格式错误：至少需要标题行和一行数据');
    }

    // 解析标题行
    const headers = this.parseCSVLine(lines[0]);
    
    // 验证必需的列
    const requiredHeaders = ['代码', '名称', '最新价', '所属行业'];
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        throw new Error(`CSV文件缺少必需的列: ${required}`);
      }
    }

    const stocks: FutuStockData[] = [];
    
    // 解析数据行
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i]);
        if (values.length !== headers.length) {
          console.warn(`第${i + 1}行数据格式错误，跳过`);
          continue;
        }

        const stock: FutuStockData = {} as FutuStockData;
        
        // 映射数据
        headers.forEach((header, index) => {
          stock[header] = values[index] || '';
        });

        // 验证必需字段
        if (stock.代码 && stock.名称 && stock.最新价) {
          stocks.push(stock);
        }
      } catch (error) {
        console.warn(`解析第${i + 1}行数据时出错:`, error);
        continue;
      }
    }

    return stocks;
  }

  /**
   * 解析CSV行，处理引号包围的字段
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // 双引号转义
          current += '"';
          i += 2;
        } else {
          // 切换引号状态
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // 字段分隔符
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    // 添加最后一个字段
    result.push(current.trim());
    
    return result;
  }

  /**
   * 将富途数据转换为导入格式
   */
  static convertToImportedStock(
    futuData: FutuStockData, 
    industry?: Industry
  ): ImportedStock {
    const now = new Date();
    
    return {
      id: `futu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: futuData.代码,
      name: futuData.名称,
      market: this.determineMarket(futuData.代码),
      industryId: industry?.id,
      industry,
      price: this.parseNumber(futuData.最新价) || 0,
      change: this.parseNumber(futuData.涨跌额) || 0,
      changePercent: this.parsePercent(futuData.涨跌幅) || 0,
      volume: this.parseNumber(futuData.成交量) || 0,
      turnover: this.parseNumber(futuData.成交额) || 0,
      high: this.parseNumber(futuData.最高) || 0,
      low: this.parseNumber(futuData.最低) || 0,
      open: this.parseNumber(futuData.今开) || 0,
      preClose: this.parseNumber(futuData.昨收) || 0,
      marketCap: this.parseNumber(futuData.总市值),
      peRatio: this.parseNumber(futuData.市盈率TTM),
      pbRatio: this.parseNumber(futuData.市净率),
      dividendYield: this.parsePercent(futuData.股息率TTM),
      addedAt: now,
      updatedAt: now,
      tags: ['富途导入'],
      notes: `从富途导入 - 行业: ${futuData.所属行业}`
    };
  }

  /**
   * 根据股票代码判断市场
   */
  private static determineMarket(symbol: string): 'US' | 'HK' | 'CN' {
    // 港股：数字开头，通常5位数
    if (/^\d{5}$/.test(symbol)) {
      return 'HK';
    }
    
    // A股：6位数字
    if (/^\d{6}$/.test(symbol)) {
      return 'CN';
    }
    
    // 美股：字母开头
    if (/^[A-Z]+$/.test(symbol)) {
      return 'US';
    }
    
    // 默认美股
    return 'US';
  }

  /**
   * 解析数字字符串
   */
  private static parseNumber(value: string): number | undefined {
    if (!value || value === '-' || value === '亏损') {
      return undefined;
    }
    
    // 移除逗号和其他非数字字符（保留小数点和负号）
    const cleaned = value.replace(/[,\s]/g, '').replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    
    return isNaN(num) ? undefined : num;
  }

  /**
   * 解析百分比字符串
   */
  private static parsePercent(value: string): number | undefined {
    if (!value || value === '-') {
      return undefined;
    }
    
    // 移除%符号和其他字符
    const cleaned = value.replace(/[%\s]/g, '').replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    
    return isNaN(num) ? undefined : num;
  }

  /**
   * 提取所有行业信息
   */
  static extractIndustries(futuStocks: FutuStockData[]): Industry[] {
    const industryMap = new Map<string, Industry>();
    const now = new Date();

    futuStocks.forEach(stock => {
      const industryName = stock.所属行业;
      if (industryName && industryName !== '-' && !industryMap.has(industryName)) {
        industryMap.set(industryName, {
          id: `industry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: industryName,
          description: `${industryName}行业`,
          stockCount: 0,
          createdAt: now,
          updatedAt: now
        });
      }
    });

    // 计算每个行业的股票数量
    const industries = Array.from(industryMap.values());
    industries.forEach(industry => {
      industry.stockCount = futuStocks.filter(
        stock => stock.所属行业 === industry.name
      ).length;
    });

    return industries;
  }

  /**
   * 根据行业名称查找行业
   */
  static findIndustryByName(industries: Industry[], industryName: string): Industry | undefined {
    return industries.find(industry => industry.name === industryName);
  }
}
