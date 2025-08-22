// 【知行交易】简化版顶部导航 - 确保可见性
'use client';

import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Brain, 
  Settings, 
  Menu,
  X,
  Home
} from 'lucide-react';

export type MainModule = 'market' | 'trading' | 'insights';

interface TopNavigationProps {
  currentModule: MainModule;
  onModuleChange: (module: MainModule) => void;
  onSettings: () => void;
  onHome?: () => void;
  children?: React.ReactNode;
}

export function TopNavigation({ 
  currentModule, 
  onModuleChange, 
  onSettings,
  onHome,
  children
}: TopNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const modules = [
    {
      id: 'market' as MainModule,
      name: '市场',
      description: '发现投资机会',
      icon: BarChart3,
    },
    {
      id: 'trading' as MainModule,
      name: '交易',
      description: '执行投资决策',
      icon: TrendingUp,
    },
    {
      id: 'insights' as MainModule,
      name: '复盘',
      description: '学习和改进',
      icon: Brain,
    }
  ];

  // 移动端展开时锁定滚动
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 1024 : true;
    if (isMenuOpen && isMobile) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isMenuOpen]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 简化版顶部导航栏 */}
      <header className="bg-white border-b border-gray-300 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* 左侧：品牌和移动端菜单 */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 rounded text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="菜单"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              
              <div 
                className="flex items-center gap-3 cursor-pointer" 
                onClick={onHome}
              >
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">知</span>
                </div>
                <div className="hidden sm:block">
                  <span className="text-gray-900 font-bold text-lg">知行交易</span>
                  <div className="text-xs text-gray-500 font-medium">ZHIXING TRADER</div>
                </div>
              </div>
            </div>

            {/* 桌面端导航 */}
            <nav className="hidden lg:flex items-center space-x-1">
              {modules.map((module) => {
                const active = currentModule === module.id;
                return (
                  <button
                    key={module.id}
                    onClick={() => onModuleChange(module.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <module.icon className="w-4 h-4" />
                    {module.name}
                  </button>
                );
              })}
            </nav>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-2">
              {onHome && (
                <button
                  onClick={onHome}
                  className="p-2 rounded text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="首页"
                >
                  <Home className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onSettings}
                className="p-2 rounded text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="设置"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 移动端下拉菜单 */}
          {isMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 bg-white">
              <nav className="px-4 py-4 space-y-2">
                {modules.map((module) => {
                  const active = currentModule === module.id;
                  return (
                    <button
                      key={module.id}
                      onClick={() => {
                        onModuleChange(module.id);
                        setIsMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded text-left transition-colors ${
                        active
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <module.icon className="w-5 h-5" />
                      <div>
                        <div className="font-medium">{module.name}</div>
                        <div className="text-sm opacity-75">{module.description}</div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}