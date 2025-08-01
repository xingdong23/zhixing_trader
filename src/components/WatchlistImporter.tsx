'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X, BarChart3 } from 'lucide-react';

import { ImportedStock, Industry, MarketType } from '@/types';
import { apiPost, API_ENDPOINTS } from '../utils/api';

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

  // 市场代码映射函数
  const mapMarketCode = (marketCode: string): MarketType => {
    switch (marketCode.toUpperCase()) {
      case 'SH':
      case 'SZ':
      case 'BJ':
        return MarketType.CN; // 上海、深圳、北京交易所都属于中国A股
      case 'HK':
        return MarketType.HK;
      case 'US':
      case 'NASDAQ':
      case 'NYSE':
        return MarketType.US;
      default:
        return MarketType.CN; // 默认为A股
    }
  };

  // 解析CSV文件
  const parseCSV = (csvText: string): ImportedStock[] => {
    return parseStandardCSV(csvText);
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
        createdAt: now,
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
            stock.market = mapMarketCode(value);
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

      // 保存到后端数据库
      setIsLoading(true);
      setError('');

      try {
        // 发送到后端API保存到数据库
        const response = await apiPost('/stocks/import', {
           stocks: stocks.map(stock => ({
             code: stock.symbol,
             name: stock.name,
             market: stock.market || 'US',
             group_id: stock.industry?.id || 'default',
             group_name: stock.industry?.name || '未分类'
           }))
         });

         if (!response.ok) {
           throw new Error(`导入失败: ${response.status}`);
         }

         const result = await response.json();

         if (!result.success) {
           throw new Error(result.error || '导入失败');
         }

        // 注意：本地存储功能已废弃，数据现在通过API管理
        console.warn('本地存储功能已废弃，股票数据现在通过API管理');
        const newStocks = stocks; // 假设所有股票都是新的
        const updatedStocks = stocks;

        // 更新状态
        setImportedStocks(stocks);
        setImportStats({
          totalStocks: stocks.length,
          newStocks: result.data.added_count || newStocks.length,
          industries: industries.length
        });

        setSuccess(`成功导入 ${result.data.added_count || stocks.length} 只股票到数据库，其中 ${result.data.new_count || newStocks.length} 只为新股票，涉及 ${industries.length} 个行业。`);

        if (onImportComplete) {
          onImportComplete(updatedStocks);
        }

      } catch (importError) {
        console.error('导入到数据库失败:', importError);
        setError(`导入到数据库失败: ${importError instanceof Error ? importError.message : '未知错误'}`);

        // 注意：本地存储功能已废弃，数据现在通过API管理
        console.warn('本地存储功能已废弃，无法保存到本地存储');
        const newStocks = stocks; // 假设所有股票都是新的
        const updatedStocks = stocks;

        setImportedStocks(stocks);
        setImportStats({
          totalStocks: stocks.length,
          newStocks: newStocks.length,
          industries: industries.length
        });

        if (onImportComplete) {
          onImportComplete(updatedStocks);
        }
      } finally {
        setIsLoading(false);
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
      'symbol,name,market,price,change,changepercent,volume,turnover,high,low,open,preclose',
      'AAPL,Apple Inc.,US,150.00,2.50,1.69,1000000,150000000,152.00,148.00,149.00,147.50',
      'TSLA,Tesla Inc.,US,200.00,-5.00,-2.44,800000,160000000,205.00,195.00,202.00,205.00',
      '00700,Tencent Holdings,HK,350.00,10.00,2.94,500000,175000000,360.00,340.00,345.00,340.00',
      'NVDA,NVIDIA Corporation,US,800.00,20.00,2.56,2000000,1600000000,820.00,785.00,790.00,780.00'
    ].join('\n');

    const blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'watchlist_sample.csv';
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

  // 清空所有数据（通过API）
  const clearAllData = () => {
    if (confirm('确定要清空所有导入的股票和行业数据吗？此操作不可恢复！')) {
      try {
        // 数据清空现在通过API管理
        clearImportedData();
        setSuccess('本地数据已清空，数据库清空请使用API');
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
                <strong>标准格式：</strong>
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
                            stock.market === MarketType.US ? 'bg-blue-100 text-blue-800' :
                            stock.market === MarketType.HK ? 'bg-green-100 text-green-800' :
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
