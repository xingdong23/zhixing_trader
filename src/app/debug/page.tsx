// 【知行交易】调试页面 - 用于验证数据获取和显示
'use client';

import { useState, useEffect } from 'react';

export default function DebugPage() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔄 开始获取股票数据...');
        const response = await fetch('/api/stocks?page=1&page_size=10');
        console.log('📡 响应状态:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 完整响应数据:', data);
        console.log('📊 股票数据:', data.data?.stocks);
        console.log('📈 股票数量:', data.data?.stocks?.length);
        
        setStocks(data.data?.stocks || []);
      } catch (err) {
        console.error('❌ 获取数据失败:', err);
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">数据调试页面</h1>
        <div>加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">数据调试页面</h1>
        <div className="text-red-500">错误: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">数据调试页面</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">数据统计</h2>
        <p>股票数量: {stocks.length}</p>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">原始数据</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-40 text-xs">
          {JSON.stringify(stocks.slice(0, 3), null, 2)}
        </pre>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">股票列表</h2>
        <div className="space-y-2">
          {stocks.slice(0, 10).map((stock, index) => (
            <div key={index} className="border p-3 rounded">
              <div><strong>{stock.name}</strong> ({stock.symbol})</div>
              <div>市场: {stock.market} | ID: {stock.id}</div>
              <div>添加时间: {stock.addedAt}</div>
            </div>
          ))}
        </div>
        {stocks.length > 10 && (
          <p className="text-gray-500 mt-2">显示前10只股票，共{stocks.length}只</p>
        )}
      </div>
    </div>
  );
}