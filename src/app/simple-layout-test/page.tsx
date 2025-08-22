'use client';

import { TopNavigation } from '@/components/TopNavigation';
import { useState } from 'react';

export default function SimpleLayoutTest() {
  const [currentModule, setCurrentModule] = useState<'market' | 'trading' | 'insights'>('market');

  return (
    <TopNavigation
      currentModule={currentModule}
      onModuleChange={setCurrentModule}
      onSettings={() => console.log('设置')}
    >
      <div className="space-y-6">
        {/* 布局测试标题 */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h1 className="text-2xl font-bold text-white mb-4">
            🎯 布局修复测试页面
          </h1>
          <p className="text-slate-300 mb-4">
            这个页面用于测试导航栏布局修复效果
          </p>
          
          {/* 测试内容区域 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-slate-700 p-4 rounded border border-slate-600">
              <h3 className="text-white font-semibold mb-2">左侧导航栏</h3>
              <p className="text-slate-300 text-sm">
                ✅ 固定宽度256px<br/>
                ✅ 深色背景<br/>
                ✅ 响应式隐藏/显示
              </p>
            </div>
            
            <div className="bg-slate-700 p-4 rounded border border-slate-600">
              <h3 className="text-white font-semibold mb-2">主内容区域</h3>
              <p className="text-slate-300 text-sm">
                ✅ flex-1 自适应宽度<br/>
                ✅ 正确的滚动设置<br/>
                ✅ 合适的内边距
              </p>
            </div>
            
            <div className="bg-slate-700 p-4 rounded border border-slate-600">
              <h3 className="text-white font-semibold mb-2">顶部状态栏</h3>
              <p className="text-slate-300 text-sm">
                ✅ 固定高度56px<br/>
                ✅ 水平对齐<br/>
                ✅ 按钮正常显示
              </p>
            </div>
          </div>
        </div>

        {/* 长内容测试 */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">
            📏 滚动测试区域
          </h2>
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="bg-slate-700 p-3 rounded mb-3 border border-slate-600">
              <h4 className="text-white font-medium mb-1">
                测试内容块 {i + 1}
              </h4>
              <p className="text-slate-300 text-sm">
                这是用来测试垂直滚动的内容。当内容超出视口高度时，主内容区域应该可以正常滚动，
                而左侧导航栏保持固定。这样可以确保用户始终可以访问导航功能。
              </p>
            </div>
          ))}
        </div>

        {/* 宽度测试 */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">
            📐 宽度测试
          </h2>
          <div className="bg-slate-700 p-4 rounded border border-slate-600">
            <p className="text-slate-300">
              这个区域测试主内容区域的宽度是否正确。在大屏幕上，这个内容应该占据除了256px导航栏之外的所有空间。
              在小屏幕上，应该占据全宽，导航栏通过覆盖层显示。
            </p>
          </div>
        </div>
      </div>
    </TopNavigation>
  );
}