// 【知行交易】顶部导航栏 - 简化布局版本
// 解决CSS变量冲突和布局问题

'use client';

import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Brain, 
  Settings, 
  Home,
  Activity,
  Menu,
  X
} from 'lucide-react';

export type MainModule = 'market' | 'trading' | 'insights';

interface TopNavigationProps {
  currentModule: MainModule;
  onModuleChange: (module: MainModule) => void;
  onSettings: () => void;
  children?: React.ReactNode;
}

export function TopNavigation({ 
  currentModule, 
  onModuleChange, 
  onSettings,
  children
}: TopNavigationProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const modules = [
    {
      id: 'market' as MainModule,
      name: '股票市场',
      description: '发现投资机会',
      icon: BarChart3,
      accent: '📈'
    },
    {
      id: 'trading' as MainModule,
      name: '交易管理',
      description: '执行投资决策',
      icon: TrendingUp,
      accent: '💼'
    },
    {
      id: 'insights' as MainModule,
      name: '智能复盘',
      description: '学习和改进',
      icon: Brain,
      accent: '🧠'
    }
  ];

  return (
    <div className="h-screen bg-slate-900 flex">
      {/* 移动端菜单按钮 */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-all shadow-lg"
      >
        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* 左侧导航栏 - 使用简单固定布局 */}
      <aside 
        className={`
          bg-slate-800 border-r border-slate-700 h-full flex flex-col
          transition-all duration-300 ease-in-out
          ${isSidebarOpen 
            ? 'fixed inset-y-0 left-0 z-40 w-64' 
            : 'hidden lg:flex lg:w-64'
          }
        `}
      >
        {/* Logo区域 */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-slate-900 font-bold text-lg">知</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">知行交易</h1>
              <p className="text-xs text-slate-400">智能投资平台</p>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 p-4 space-y-2">
          {/* 首页按钮 */}
          <button className="w-full flex items-center space-x-3 p-3 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-all">
            <Home className="w-5 h-5" />
            <span className="font-medium">首页</span>
          </button>

          {/* 主导航模块 */}
          <div className="space-y-1 pt-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider px-3 mb-2">核心功能</p>
            
            {modules.map((module) => {
              const isActive = currentModule === module.id;
              const Icon = module.icon;
              
              return (
                <button
                  key={module.id}
                  onClick={() => {
                    onModuleChange(module.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isActive ? 'bg-cyan-500 text-slate-900' : 'bg-slate-700 text-slate-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{module.name}</div>
                    <div className="text-xs opacity-70">{module.description}</div>
                  </div>
                  <span className="text-lg opacity-50">{module.accent}</span>
                </button>
              );
            })}
          </div>

          {/* 系统状态 */}
          <div className="space-y-1 pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-500 uppercase tracking-wider px-3 mb-2">系统状态</p>
            
            <div className="p-3 rounded-lg bg-slate-700 border border-slate-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">数据同步</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-500">在线</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">策略运行</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-yellow-500">运行中</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* 底部设置 */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onSettings}
            className="w-full flex items-center space-x-3 p-3 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-all"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">设置</span>
          </button>
        </div>
      </aside>

      {/* 移动端遮罩层 */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 主内容区域 */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900">
        {/* 顶部状态栏 */}
        <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center px-6 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-slate-400 font-mono">
              2025-08-15 14:30:25
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-500">市场活跃</span>
            </div>
          </div>
        </header>
        </header>

        {/* 主内容区域 */}
        <div className="flex-1 overflow-auto bg-slate-900 p-6">
          <div className="max-w-full mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}