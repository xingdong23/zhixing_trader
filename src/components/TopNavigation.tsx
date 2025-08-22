// 【知行交易】现代化顶部导航
// 专业金融系统导航组件

'use client';

import React, { useState } from 'react';
import { BarChart3, TrendingUp, Brain, Settings, Menu, X, Home, Bell } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '@/utils/cn';

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
  const [notifications] = useState(3); // 模拟通知数量

  const modules = [
    { 
      id: 'market' as MainModule, 
      name: '市场分析', 
      icon: BarChart3,
      description: '智能选股与市场数据'
    },
    { 
      id: 'trading' as MainModule, 
      name: '交易管理', 
      icon: TrendingUp,
      description: '交易计划与执行'
    },
    { 
      id: 'insights' as MainModule, 
      name: '复盘分析', 
      icon: Brain,
      description: '交易复盘与优化'
    }
  ];

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-[1020] bg-bg-secondary/95 backdrop-blur-xl border-b border-border-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 左侧品牌区域 */}
            <div 
              className="flex items-center gap-4 cursor-pointer group"
              onClick={onHome}
            >
              {/* LOGO */}
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-glow transition-all duration-300">
                  <span className="text-bg-primary font-bold text-lg">知</span>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary-dark/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
              </div>
              
              {/* 品牌名称 */}
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold gradient-text">
                  知行交易
                </h1>
                <p className="text-xs text-text-tertiary -mt-1">
                  智能量化交易系统
                </p>
              </div>
            </div>

            {/* 中间导航区域 - 桌面端 */}
            <nav className="hidden lg:flex items-center space-x-1">
              {modules.map((module) => {
                const Icon = module.icon;
                const isActive = currentModule === module.id;
                return (
                  <button
                    key={module.id}
                    onClick={() => onModuleChange(module.id)}
                    className={cn(
                      'group relative px-4 py-2.5 rounded-lg transition-all duration-200',
                      'flex items-center gap-3 min-w-[140px]',
                      isActive 
                        ? 'bg-primary/10 text-primary border border-primary/20' 
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                    )}
                  >
                    <Icon className={cn(
                      'w-5 h-5 transition-colors',
                      isActive ? 'text-primary' : 'text-text-tertiary group-hover:text-text-secondary'
                    )} />
                    <div className="text-left">
                      <div className={cn(
                        'text-sm font-medium',
                        isActive ? 'text-primary' : 'text-text-primary'
                      )}>
                        {module.name}
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {module.description}
                      </div>
                    </div>
                    
                    {/* 激活指示器 */}
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* 右侧操作区域 */}
            <div className="flex items-center gap-2">
              {/* 通知按钮 */}
              <div className="relative">
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="w-5 h-5" />
                  {notifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-xs rounded-full flex items-center justify-center">
                      {notifications}
                    </span>
                  )}
                </Button>
              </div>
              
              {/* 设置按钮 */}
              <Button variant="ghost" size="sm" onClick={onSettings}>
                <Settings className="w-5 h-5" />
              </Button>
              
              {/* 移动端菜单按钮 */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="lg:hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* 移动端下拉菜单 */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-border-secondary bg-bg-tertiary/50 backdrop-blur-sm">
            <div className="px-4 py-3 space-y-1">
              {modules.map((module) => {
                const Icon = module.icon;
                const isActive = currentModule === module.id;
                return (
                  <button
                    key={module.id}
                    onClick={() => {
                      onModuleChange(module.id);
                      setIsMenuOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                      isActive 
                        ? 'bg-primary/10 text-primary border border-primary/20' 
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <div className="text-left">
                      <div className="text-sm font-medium">{module.name}</div>
                      <div className="text-xs text-text-tertiary">{module.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* 主内容区域 */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}