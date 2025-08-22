'use client';

import { TopNavigation } from '@/components/TopNavigation';
import { useState } from 'react';

export default function LayoutFixTestPage() {
  const [currentModule, setCurrentModule] = useState<'market' | 'trading' | 'insights'>('market');

  return (
    <TopNavigation
      currentModule={currentModule}
      onModuleChange={setCurrentModule}
      onSettings={() => console.log('设置')}
    >
      <div className="space-y-6">
        {/* 样式系统测试 */}
        <div className="bg-card p-6 rounded-xl border border-border">
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            🎯 布局修复验证测试
          </h1>
          <p className="text-text-secondary mb-6">
            这个页面用于验证我们的样式系统修复效果
          </p>

          {/* 颜色系统测试 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-primary text-text-inverse p-4 rounded-lg text-center">
              Primary
            </div>
            <div className="bg-secondary text-white p-4 rounded-lg text-center">
              Secondary
            </div>
            <div className="bg-success text-white p-4 rounded-lg text-center">
              Success
            </div>
            <div className="bg-danger text-white p-4 rounded-lg text-center">
              Danger
            </div>
          </div>

          {/* 布局测试 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-surface border border-border p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                左侧内容区域
              </h3>
              <p className="text-text-secondary">
                这个区域测试左右布局是否正常工作，边距和间距是否合适。
              </p>
            </div>
            <div className="bg-surface border border-border p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                右侧内容区域
              </h3>
              <p className="text-text-secondary">
                检查响应式设计在不同屏幕尺寸下的表现。
              </p>
            </div>
          </div>

          {/* 按钮测试 */}
          <div className="flex flex-wrap gap-4 mb-8">
            <button className="px-6 py-3 bg-primary text-text-inverse rounded-lg hover:bg-primary-light transition-colors">
              主要按钮
            </button>
            <button className="px-6 py-3 bg-surface border border-border text-text-primary rounded-lg hover:bg-surface-light transition-colors">
              次要按钮
            </button>
            <button className="px-6 py-3 bg-danger text-white rounded-lg hover:bg-danger-light transition-colors">
              危险按钮
            </button>
          </div>

          {/* 表格测试 */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden mb-8">
            <table className="w-full">
              <thead className="bg-surface-dark">
                <tr>
                  <th className="p-4 text-left text-text-primary font-semibold">股票代码</th>
                  <th className="p-4 text-left text-text-primary font-semibold">股票名称</th>
                  <th className="p-4 text-left text-text-primary font-semibold">价格</th>
                  <th className="p-4 text-left text-text-primary font-semibold">涨跌幅</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border hover:bg-surface-light">
                  <td className="p-4 text-text-primary font-mono">000001</td>
                  <td className="p-4 text-text-primary">平安银行</td>
                  <td className="p-4 text-text-primary">12.34</td>
                  <td className="p-4 text-success">+2.45%</td>
                </tr>
                <tr className="border-b border-border hover:bg-surface-light">
                  <td className="p-4 text-text-primary font-mono">000002</td>
                  <td className="p-4 text-text-primary">万科A</td>
                  <td className="p-4 text-text-primary">8.76</td>
                  <td className="p-4 text-danger">-1.23%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 滚动测试 */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4">滚动测试区域</h3>
            <div className="h-32 overflow-auto bg-surface-dark p-4 rounded">
              {Array.from({ length: 20 }, (_, i) => (
                <div key={i} className="py-2 text-text-secondary">
                  滚动测试行 {i + 1} - 验证滚动条样式是否正确应用
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 长内容测试 */}
        <div className="bg-card p-6 rounded-xl border border-border">
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            📏 垂直布局测试
          </h2>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="bg-surface p-4 rounded-lg mb-4 border border-border">
              <h4 className="text-text-primary font-medium mb-2">
                内容块 {i + 1}
              </h4>
              <p className="text-text-secondary">
                这是用来测试垂直滚动和布局的内容块。我们要确保在长内容情况下，
                侧边栏固定，主内容区域可以正常滚动，不会出现布局错乱的问题。
              </p>
            </div>
          ))}
        </div>
      </div>
    </TopNavigation>
  );
}