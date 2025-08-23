'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Wand2 } from 'lucide-react';

interface AnalysisResult {
  ticker: string;
  action: string;
  price: string;
  rationale: string;
}

export default function InfluencerTrackingPage() {
  const [inputText, setInputText] = useState('');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      alert('请输入要分析的文本！');
      return;
    }

    setIsAnalyzing(true);

    // 模拟AI解析
    setTimeout(() => {
      const results: AnalysisResult[] = [];
      const stockRegex = /(?:[A-Z]{1,5}|[0-9]{6}\.(?:SS|SZ))/ig;
      const priceRegex = /(?:\$|￥|人民币)?\s?(\d{1,5}(?:\.\d+)?)/g;

      const stocks = inputText.match(stockRegex);
      if (stocks) {
        stocks.forEach(stock => {
          const prices = inputText.match(priceRegex);
          results.push({
            ticker: stock.toUpperCase(),
            action: inputText.includes('卖出') || inputText.includes('看空') ? '卖出建议' : '买入建议',
            price: prices ? prices[prices.length - 1] : '未明确',
            rationale: '基于文本关键信息提取 (模拟)'
          });
        });
      }

      setAnalysisResults(results);
      setIsAnalyzing(false);
    }, 2000);
  };

  return (
    <AppLayout title="大佬追踪">
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-text-primary">大佬观点解析</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 输入区域 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              粘贴文本
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={8}
              placeholder="在此处粘贴大佬的分析、研报摘要或新闻..."
              className="
                w-full p-3 bg-bg-primary border border-border-primary rounded-lg 
                text-text-primary placeholder-text-tertiary resize-vertical
                focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                transition-all duration-200
              "
            />
            <div className="mt-4">
              <button 
                className="btn"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                <Wand2 className="w-4 h-4" />
                {isAnalyzing ? '解析中...' : '解析文本'}
              </button>
            </div>
          </div>

          {/* 结果区域 */}
          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-4">解析结果:</h4>
            <div className="space-y-4">
              {analysisResults.length > 0 ? (
                analysisResults.map((result, index) => (
                  <div 
                    key={index}
                    className="p-4 bg-bg-primary border border-border-primary rounded-lg border-l-4 border-l-primary"
                  >
                    <h4 className="text-lg font-semibold text-text-primary mb-3">
                      {result.ticker}
                    </h4>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="text-text-secondary font-medium min-w-20 inline-block">建议操作:</span>
                        <span className={`font-medium ${
                          result.action === '卖出建议' ? 'text-danger' : 'text-success'
                        }`}>
                          {result.action}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="text-text-secondary font-medium min-w-20 inline-block">目标价位:</span>
                        <span className="text-text-primary">{result.price}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-text-secondary font-medium min-w-20 inline-block">核心逻辑:</span>
                        <span className="text-text-primary">{result.rationale}</span>
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-text-secondary text-center py-8">
                  暂无解析结果。请粘贴文本后点击解析。
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
