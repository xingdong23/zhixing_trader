'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X, BarChart3 } from 'lucide-react';
import { FutuCsvParser } from '@/utils/futuCsvParser';
import { StockDataService } from '@/services/stockDataService';
import { ImportedStock, Industry } from '@/types';

interface WatchlistImporterProps {
  onImportComplete?: (stocks: ImportedStock[]) => void;
}

export function WatchlistImporter({ onImportComplete }: WatchlistImporterProps) {
  const [importedStocks, setImportedStocks] = useState<ImportedStock[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importStats, setImportStats] = useState<{
    totalStocks: number;
    newStocks: number;
    industries: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 解析CSV文件（支持富途格式）
  const parseCSV = (csvText: string): ImportedStock[] => {
    try {
      // 尝试解析富途格式
      const futuStocks = FutuCsvParser.parseCsvText(csvText);

      // 提取行业信息
      const extractedIndustries = FutuCsvParser.extractIndustries(futuStocks);

      // 更新行业数据
      const updatedIndustries = StockDataService.upsertIndustries(extractedIndustries);
      setIndustries(updatedIndustries);

      // 转换为导入格式
      const importedStocks = futuStocks.map(futuStock => {
        const industry = FutuCsvParser.findIndustryByName(updatedIndustries, futuStock.所属行业);
        return FutuCsvParser.convertToImportedStock(futuStock, industry);
      });

      return importedStocks;
    } catch (futuError) {
      // 如果富途格式解析失败，尝试标准格式
      console.warn('富途格式解析失败，尝试标准格式:', futuError);
      return parseStandardCSV(csvText);
    }
  };

  // 解析标准CSV格式
  const parseStandardCSV = (csvText: string): ImportedStock[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV文件格式错误：至少需要标题行和一行数据');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['symbol', 'name', 'market'];

    // 检查必需的列
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        throw new Error(`CSV文件缺少必需的列: ${required}`);
      }
    }

    const stocks: ImportedStock[] = [];
    const now = new Date();

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) {
        console.warn(`第${i + 1}行数据格式错误，跳过`);
        continue;
      }

      const stock: Partial<ImportedStock> = {
        id: `std_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        addedAt: now,
        updatedAt: now,
        tags: ['标准导入'],
        notes: '从标准CSV导入'
      };

      headers.forEach((header, index) => {
        const value = values[index];
        switch (header) {
          case 'symbol':
            stock.symbol = value;
            break;
          case 'name':
            stock.name = value;
            break;
          case 'market':
            stock.market = value as 'US' | 'HK' | 'CN';
            break;
          case 'price':
            stock.price = parseFloat(value) || 0;
            break;
          case 'change':
            stock.change = parseFloat(value) || 0;
            break;
          case 'changepercent':
            stock.changePercent = parseFloat(value) || 0;
            break;
          case 'volume':
            stock.volume = parseInt(value) || 0;
            break;
          case 'turnover':
            stock.turnover = parseFloat(value) || 0;
            break;
          case 'high':
            stock.high = parseFloat(value) || 0;
            break;
          case 'low':
            stock.low = parseFloat(value) || 0;
            break;
          case 'open':
            stock.open = parseFloat(value) || 0;
            break;
          case 'preclose':
            stock.preClose = parseFloat(value) || 0;
            break;
        }
      });

      if (stock.symbol && stock.name && stock.market) {
        stocks.push(stock as ImportedStock);
      }
    }

    return stocks;
  };

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setImportStats(null);

    try {
      const text = await file.text();
      const stocks = parseCSV(text);

      if (stocks.length === 0) {
        throw new Error('没有找到有效的股票数据');
      }

      // 保存到数据库
      const existingStocks = StockDataService.getImportedStocks();
      const existingSymbols = new Set(existingStocks.map(s => s.symbol));
      const newStocks = stocks.filter(stock => !existingSymbols.has(stock.symbol));

      // 添加新股票
      const updatedStocks = StockDataService.addStocks(stocks);

      // 更新状态
      setImportedStocks(stocks);
      setImportStats({
        totalStocks: stocks.length,
        newStocks: newStocks.length,
        industries: industries.length
      });

      setSuccess(`成功解析 ${stocks.length} 只股票，其中 ${newStocks.length} 只为新股票，涉及 ${industries.length} 个行业。导入的股票已添加到股票池中，可通过行业筛选查看。`);

      if (onImportComplete) {
        onImportComplete(updatedStocks);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setIsLoading(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 下载示例CSV
  const downloadSampleCSV = () => {
    const sampleData = [
      '"代码","名称","最新价","涨跌额","涨跌幅","成交量","成交额","今开","昨收","最高","最低","总市值","市盈率TTM","市净率","股息率TTM","所属行业"',
      '"AAPL","苹果公司","150.00","+2.50","+1.69%","1000000","150000000","149.00","147.50","152.00","148.00","2500000000000","25.5","5.2","0.5%","消费电子"',
      '"TSLA","特斯拉","200.00","-5.00","-2.44%","800000","160000000","202.00","205.00","205.00","195.00","800000000000","亏损","8.1","0.0%","电动车"',
      '"00700","腾讯控股","350.00","+10.00","+2.94%","500000","175000000","345.00","340.00","360.00","340.00","3500000000000","15.2","2.8","0.3%","互联网"',
      '"NVDA","英伟达","800.00","+20.00","+2.56%","2000000","1600000000","790.00","780.00","820.00","785.00","2000000000000","65.5","12.3","0.1%","半导体"'
    ].join('\n');

    const blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'futu_watchlist_sample.csv';
    link.click();
  };

  // 清空导入数据
  const clearImportedData = () => {
    setImportedStocks([]);
    setIndustries([]);
    setError(null);
    setSuccess(null);
    setImportStats(null);
  };

  // 清空所有数据（包括数据库）
  const clearAllData = () => {
    if (confirm('确定要清空所有导入的股票和行业数据吗？此操作不可恢复！')) {
      try {
        StockDataService.clearAllData();
        clearImportedData();
        setSuccess('所有数据已清空');
      } catch (error) {
        setError('清空数据失败');
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            自选股导入工具
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 状态显示 */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span>{success}</span>
            </div>
          )}

          {/* 导入统计 */}
          {importStats && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                导入统计
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{importStats.totalStocks}</div>
                  <div className="text-blue-700">总股票数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{importStats.newStocks}</div>
                  <div className="text-green-700">新增股票</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{importStats.industries}</div>
                  <div className="text-purple-700">涉及行业</div>
                </div>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              {isLoading ? '导入中...' : '选择CSV文件'}
            </button>
            
            <button
              onClick={downloadSampleCSV}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              <Download className="w-4 h-4" />
              下载示例文件
            </button>

            {importedStocks.length > 0 && (
              <button
                onClick={clearImportedData}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                <X className="w-4 h-4" />
                清空预览
              </button>
            )}

            <button
              onClick={clearAllData}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              <X className="w-4 h-4" />
              清空所有数据
            </button>
          </div>

          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* 格式说明 */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">支持的CSV格式：</h4>
            <div className="text-sm text-blue-700 space-y-2">
              <div>
                <strong>1. 富途牛牛格式（推荐）：</strong>
                <ul className="ml-4 space-y-1">
                  <li>• 必需列：代码、名称、最新价、所属行业</li>
                  <li>• 可选列：涨跌额、涨跌幅、成交量、成交额、市盈率TTM、市净率等</li>
                  <li>• 自动识别市场类型和行业分类</li>
                </ul>
              </div>
              <div>
                <strong>2. 标准格式：</strong>
                <ul className="ml-4 space-y-1">
                  <li>• 必需列：symbol（股票代码）, name（股票名称）, market（市场）</li>
                  <li>• 市场代码：US（美股）, HK（港股）, CN（A股）</li>
                </ul>
              </div>
              <div>
                <strong>文件要求：</strong>
                <ul className="ml-4 space-y-1">
                  <li>• 文件编码：UTF-8</li>
                  <li>• 支持引号包围的字段</li>
                  <li>• 自动去重，避免重复导入</li>
                  <li>• 导入后股票将显示在"股票池"中</li>
                  <li>• 可通过行业筛选器查看分类结果</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 导入结果预览 */}
          {importedStocks.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">导入预览 ({importedStocks.length} 只股票)</h3>
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">代码</th>
                      <th className="px-3 py-2 text-left">名称</th>
                      <th className="px-3 py-2 text-left">市场</th>
                      <th className="px-3 py-2 text-left">行业</th>
                      <th className="px-3 py-2 text-right">价格</th>
                      <th className="px-3 py-2 text-right">涨跌幅</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedStocks.map((stock, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-3 py-2 font-mono">{stock.symbol}</td>
                        <td className="px-3 py-2">{stock.name}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            stock.market === 'US' ? 'bg-blue-100 text-blue-800' :
                            stock.market === 'HK' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {stock.market}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {stock.industry ? (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                              {stock.industry.name}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">未分类</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {stock.price ? `${stock.price.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {stock.changePercent !== undefined ? (
                            <span className={stock.changePercent >= 0 ? 'text-red-600' : 'text-green-600'}>
                              {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
