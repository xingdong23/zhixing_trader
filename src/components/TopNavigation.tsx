// 【知行交易】顶部导航栏 - 现代极客金融风格
// 采用侧边栏导航 + 深色主题的专业金融界面

'use client';

import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Brain, 
  Settings, 
  Home,
  ChevronDown,
  Activity,
  Target,
  Lightbulb
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
  const modules = [
    {
      id: 'market' as MainModule,
      name: '股票市场',
      description: '发现投资机会',
      icon: BarChart3,
      color: 'primary',
      accent: '📈'
    },
    {
      id: 'trading' as MainModule,
      name: '交易管理',
      description: '执行投资决策',
      icon: TrendingUp,
      color: 'accent',
      accent: '💼'
    },
    {
      id: 'insights' as MainModule,
      name: '智能复盘',
      description: '学习和改进',
      icon: Brain,
      color: 'info',
      accent: '🧠'
    }
  ];

  return (
    <div className="flex h-screen">
      {/* 左侧导航栏 */}
      <div className="fixed left-0 top-0 w-[280px] h-screen bg-[rgba(15,23,42,0.95)] backdrop-blur-[20px] border-r border-[rgba(148,163,184,0.1)] z-[100] flex flex-col">
        {/* Logo区域 */}
        <div className="p-6 border-b border-[rgba(148,163,184,0.1)]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00ffd0] to-[#3b82f6] rounded-lg flex items-center justify-center">
              <span className="text-[#0f172a] font-bold text-lg">知</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#e2e8f0]">知行交易</h1>
              <p className="text-xs text-[#94a3b8]">智能投资平台</p>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 p-4 space-y-2">
          {/* 首页按钮 */}
          <button
            className="w-full flex items-center space-x-3 p-3 rounded-lg text-[#cbd5e1] hover:text-[#e2e8f0] hover:bg-[rgba(30,41,59,0.6)] transition-all duration-200 group"
            title="返回首页"
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">首页</span>
            <ChevronDown className="w-4 h-4 ml-auto opacity-50" />
          </button>

          {/* 主导航模块 */}
          <div className="space-y-1 pt-4">
            <p className="text-xs text-[#64748b] uppercase tracking-wider px-3 mb-2">
              核心功能
            </p>
            
            {/* UI测试链接 */}
            <a
              href="/ui-test"
              className="w-full flex items-center space-x-3 p-3 rounded-lg text-[#cbd5e1] hover:text-[#e2e8f0] hover:bg-[rgba(30,41,59,0.6)] transition-all duration-200 group"
              title="UI组件测试"
            >
              <Lightbulb className="w-5 h-5" />
              <span className="font-medium">UI测试</span>
              <ChevronDown className="w-4 h-4 ml-auto opacity-50" />
            </a>
            
            {modules.map((module) => {
              const isActive = currentModule === module.id;
              const Icon = module.icon;
              
              return (
                <button
                  key={module.id}
                  onClick={() => onModuleChange(module.id)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 group relative overflow-hidden ${
                    isActive
                      ? 'bg-[rgba(0,255,208,0.1)] text-[#00ffd0] border border-[rgba(0,255,208,0.3)]'
                      : 'text-[#cbd5e1] hover:text-[#e2e8f0] hover:bg-[rgba(30,41,59,0.6)] hover:border-[rgba(0,255,208,0.3)]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isActive ? 'bg-[#00ffd0] text-[#0f172a]' : 'bg-[rgba(30,41,59,0.6)] text-[#94a3b8] group-hover:bg-[rgba(0,255,208,0.2)] group-hover:text-[#00ffd0]'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{module.name}</div>
                    <div className="text-xs opacity-70">{module.description}</div>
                  </div>
                  <span className="text-lg opacity-50">{module.accent}</span>
                  
                  {/* 活跃指示器 */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00ffd0] rounded-r-lg" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 系统状态 */}
          <div className="space-y-1 pt-4 border-t border-[rgba(148,163,184,0.1)]">
            <p className="text-xs text-[#64748b] uppercase tracking-wider px-3 mb-2">
              系统状态
            </p>
            
            <div className="p-3 rounded-lg bg-[rgba(30,41,59,0.6)] border border-[rgba(148,163,184,0.1)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#cbd5e1]">数据同步</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
                  <span className="text-xs text-[#10b981]">在线</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#cbd5e1]">策略运行</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-[#f59e0b] rounded-full animate-pulse"></div>
                  <span className="text-xs text-[#f59e0b]">运行中</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* 底部设置 */}
        <div className="p-4 border-t border-[rgba(148,163,184,0.1)]">
          <button
            onClick={onSettings}
            className="w-full flex items-center space-x-3 p-3 rounded-lg text-[#cbd5e1] hover:text-[#e2e8f0] hover:bg-[rgba(30,41,59,0.6)] transition-all duration-200 group"
            title="系统设置"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">设置</span>
            <ChevronDown className="w-4 h-4 ml-auto opacity-50" />
          </button>
        </div>
      </div>

      {/* 右侧主内容区域 */}
      <div className="flex-1 flex flex-col ml-[280px]">
        {/* 顶部状态栏 */}
        <div className="h-12 bg-[rgba(15,23,42,0.6)] border-b border-[rgba(148,163,184,0.1)] flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-[#94a3b8] font-mono">
              2025-08-15 14:30:25
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-[#10b981]" />
              <span className="text-sm text-[#10b981]">市场活跃</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="px-3 py-1.5 bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] rounded-lg text-[#3b82f6] text-sm hover:bg-[rgba(59,130,246,0.2)] transition-all">
              设置
            </button>
            <button className="px-3 py-1.5 bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] rounded-lg text-[#3b82f6] text-sm hover:bg-[rgba(59,130,246,0.2)] transition-all">
              通知
            </button>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="h-full card p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
