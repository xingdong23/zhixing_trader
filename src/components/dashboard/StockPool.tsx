'use client';

import React, { useState } from 'react';
import { Upload, Eye } from 'lucide-react';

interface Stock {
  ticker: string;
  name: string;
  price: number;
  change: number;
  volume: string;
  rules: string[];
  concepts: {
    industry: string[];
    fundamentals: string[];
    custom: string[];
  };
}

interface StockPoolProps {
  onStockClick?: (stock: Stock) => void;
  onImportClick?: () => void;
}

const mockStocks: Stock[] = [
  {
    ticker: 'AAPL',
    name: '苹果',
    price: 214.29,
    change: 1.25,
    volume: '25.8B',
    rules: ['均线多头', '周线突破'],
    concepts: {
      industry: ['信息技术'],
      fundamentals: ['高毛利率', '强大护城河'],
      custom: ['科技龙头', '重点观察']
    }
  },
  {
    ticker: 'TSLA',
    name: '特斯拉',
    price: 183.01,
    change: -0.54,
    volume: '15.2B',
    rules: ['箱体震荡'],
    concepts: {
      industry: ['可选消费'],
      fundamentals: ['高增长', '高负债'],
      custom: ['新能源', '高风险']
    }
  },
  {
    ticker: 'NVDA',
    name: '英伟达',
    price: 127.08,
    change: 2.89,
    volume: '45.1B',
    rules: ['趋势向上', '成交量放大'],
    concepts: {
      industry: ['信息技术', '半导体'],
      fundamentals: ['高增长', '高研发投入'],
      custom: ['芯片', 'AI核心', '重点观察']
    }
  },
  {
    ticker: 'BABA',
    name: '阿里巴巴',
    price: 74.55,
    change: -1.10,
    volume: '8.9B',
    rules: [],
    concepts: {
      industry: ['可选消费'],
      fundamentals: ['平台经济'],
      custom: ['中概股']
    }
  },
  {
    ticker: 'NIO',
    name: '蔚来',
    price: 4.43,
    change: 3.20,
    volume: '1.2B',
    rules: ['底部放量'],
    concepts: {
      industry: ['可选消费'],
      fundamentals: ['持续亏损'],
      custom: ['新能源', '亏损股']
    }
  },
  {
    ticker: '600519.SS',
    name: '贵州茅台',
    price: 1555.00,
    change: 0.88,
    volume: '3.5B',
    rules: ['价值投资'],
    concepts: {
      industry: ['日常消费'],
      fundamentals: ['高毛利率', '强大护城河'],
      custom: ['消费白马', '长线持有']
    }
  }
];

export default function StockPool({ onStockClick, onImportClick }: StockPoolProps) {
  const [stocks] = useState<Stock[]>(mockStocks);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // 获取所有概念标签
  const getAllConcepts = () => {
    const concepts = { industry: new Set<string>(), fundamentals: new Set<string>(), custom: new Set<string>() };
    stocks.forEach(stock => {
      stock.concepts.industry.forEach(tag => concepts.industry.add(tag));
      stock.concepts.fundamentals.forEach(tag => concepts.fundamentals.add(tag));
      stock.concepts.custom.forEach(tag => concepts.custom.add(tag));
    });
    return concepts;
  };

  const allConcepts = getAllConcepts();

  // 处理标签筛选
  const handleTagFilter = (tag: string) => {
    setActiveFilters(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // 筛选股票
  const filteredStocks = stocks.filter(stock => {
    if (activeFilters.length === 0) return true;
    const allStockConcepts = Object.values(stock.concepts).flat();
    return activeFilters.every(filter => allStockConcepts.includes(filter));
  });

  return (
    <div 
      className="rounded-xl border p-5 mb-6"
      style={{ 
        backgroundColor: 'var(--surface-bg)',
        borderColor: 'var(--border-color)'
      }}
    >
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>股票池</h3>
        <button 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-white hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
          style={{ backgroundColor: 'var(--accent-primary)' }}
          onClick={onImportClick}
        >
          <Upload className="w-4 h-4" />
          导入股票列表
        </button>
      </div>

      {/* 多维标签筛选 - 完全按照HTML实现 */}
      <div 
        style={{ 
          paddingBottom: '10px',
          marginBottom: '20px',
          borderBottom: '1px solid var(--border-color)'
        }}
      >
        {/* 行业分类 */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            marginBottom: '10px', 
            gap: '10px' 
          }}
        >
          <span 
            style={{ 
              fontWeight: '600',
              color: 'var(--text-secondary)',
              marginRight: '10px',
              fontSize: '13px',
              minWidth: '70px'
            }}
          >
            行业分类:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {[...allConcepts.industry].map(tag => (
              <span
                key={tag}
                onClick={() => handleTagFilter(tag)}
                className="cursor-pointer transition-all duration-200"
                style={{
                  backgroundColor: activeFilters.includes(tag) ? 'var(--accent-secondary)' : 'var(--surface-bg)',
                  color: activeFilters.includes(tag) ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${activeFilters.includes(tag) ? 'var(--accent-secondary)' : 'var(--border-color)'}`,
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  boxShadow: activeFilters.includes(tag) ? '0 0 10px rgba(0, 212, 255, 0.3)' : 'none'
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* 基本面 */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            marginBottom: '10px', 
            gap: '10px' 
          }}
        >
          <span 
            style={{ 
              fontWeight: '600',
              color: 'var(--text-secondary)',
              marginRight: '10px',
              fontSize: '13px',
              minWidth: '70px'
            }}
          >
            基本面:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {[...allConcepts.fundamentals].map(tag => (
              <span
                key={tag}
                onClick={() => handleTagFilter(tag)}
                className="cursor-pointer transition-all duration-200"
                style={{
                  backgroundColor: activeFilters.includes(tag) ? 'var(--accent-secondary)' : 'var(--surface-bg)',
                  color: activeFilters.includes(tag) ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${activeFilters.includes(tag) ? 'var(--accent-secondary)' : 'var(--border-color)'}`,
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  boxShadow: activeFilters.includes(tag) ? '0 0 10px rgba(0, 212, 255, 0.3)' : 'none'
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* 自定义 */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            marginBottom: '10px', 
            gap: '10px' 
          }}
        >
          <span 
            style={{ 
              fontWeight: '600',
              color: 'var(--text-secondary)',
              marginRight: '10px',
              fontSize: '13px',
              minWidth: '70px'
            }}
          >
            自定义:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {[...allConcepts.custom].map(tag => (
              <span
                key={tag}
                onClick={() => handleTagFilter(tag)}
                className="cursor-pointer transition-all duration-200"
                style={{
                  backgroundColor: activeFilters.includes(tag) ? 'var(--accent-secondary)' : 'var(--surface-bg)',
                  color: activeFilters.includes(tag) ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${activeFilters.includes(tag) ? 'var(--accent-secondary)' : 'var(--border-color)'}`,
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  boxShadow: activeFilters.includes(tag) ? '0 0 10px rgba(0, 212, 255, 0.3)' : 'none'
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* 重置筛选按钮 - 完全按照HTML */}
        {activeFilters.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <button 
              onClick={() => setActiveFilters([])}
              className="transition-all duration-200"
              style={{
                backgroundColor: 'var(--surface-bg)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              重置筛选
            </button>
          </div>
        )}
      </div>

      {/* 股票表格 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ borderBottom: `1px solid var(--border-color)` }}>
              <th 
                className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                代码/名称
              </th>
              <th 
                className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                现价
              </th>
              <th 
                className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                涨跌幅
              </th>
              <th 
                className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                成交额
              </th>
              <th 
                className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                匹配模式
              </th>
              <th 
                className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredStocks.map((stock) => (
              <tr 
                key={stock.ticker}
                className="transition-colors duration-200"
                style={{ 
                  borderBottom: `1px solid var(--border-color)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--sidebar-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <td className="py-3 px-4">
                  <div>
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {stock.name}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {stock.ticker}
                    </div>
                  </div>
                </td>
                <td 
                  className="py-3 px-4 font-mono font-medium"
                  style={{ color: stock.change >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}
                >
                  {stock.price.toFixed(2)}
                </td>
                <td 
                  className="py-3 px-4 font-mono font-medium"
                  style={{ color: stock.change >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}
                >
                  {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                </td>
                <td className="py-3 px-4 font-mono" style={{ color: 'var(--text-primary)' }}>
                  {stock.volume}
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {stock.rules.length > 0 ? (
                      stock.rules.map((rule, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 text-xs rounded"
                          style={{ 
                            backgroundColor: '#4a5568',
                            color: 'var(--text-primary)',
                            marginRight: '4px'
                          }}
                        >
                          {rule}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>无</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <button 
                    onClick={() => onStockClick?.(stock)}
                    className="inline-flex items-center gap-2 px-3 py-1 text-sm rounded-lg border transition-all duration-200"
                    style={{
                      backgroundColor: 'var(--surface-bg)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border-color)'
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
