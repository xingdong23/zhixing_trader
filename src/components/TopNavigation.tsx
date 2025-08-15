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
    <div className="flex h-screen bg-gradient-to-br from-surface to-surface-dark">
      {/* 左侧导航栏 */}
      <div className="w-64 bg-surface border-r border-border flex flex-col">
        {/* Logo区域 */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center neon-glow">
              <span className="text-white font-bold text-lg">知</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">知行交易</h1>
              <p className="text-xs text-text-secondary">智能投资平台</p>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 p-4 space-y-2">
          {/* 首页按钮 */}
          <button
            className="w-full flex items-center space-x-3 p-3 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-light transition-all duration-200 group"
            title="返回首页"
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">首页</span>
            <ChevronDown className="w-4 h-4 ml-auto opacity-50" />
          </button>

          {/* 主导航模块 */}
          <div className="space-y-1 pt-4">
            <p className="text-xs text-text-muted uppercase tracking-wider px-3 mb-2">
              核心功能
            </p>
            
            {/* UI测试链接 */}
            <a
              href="/ui-test"
              className="w-full flex items-center space-x-3 p-3 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-light transition-all duration-200 group"
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
                      ? 'bg-primary/10 text-primary border border-primary/30 neon-glow'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-light hover:border-primary/30'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isActive ? 'bg-primary text-white' : 'bg-surface-light text-text-muted group-hover:bg-primary/20 group-hover:text-primary'
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
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-lg pulse-glow" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 系统状态 */}
          <div className="space-y-1 pt-4 border-t border-border">
            <p className="text-xs text-text-muted uppercase tracking-wider px-3 mb-2">
              系统状态
            </p>
            
            <div className="p-3 rounded-lg bg-surface-light/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">数据同步</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  <span className="text-xs text-success">在线</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">策略运行</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-warning rounded-full animate-pulse"></div>
                  <span className="text-xs text-warning">运行中</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* 底部设置 */}
        <div className="p-4 border-t border-border">
          <button
            onClick={onSettings}
            className="w-full flex items-center space-x-3 p-3 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-light transition-all duration-200 group"
            title="系统设置"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">设置</span>
            <ChevronDown className="w-4 h-4 ml-auto opacity-50" />
          </button>
        </div>
      </div>

      {/* 右侧主内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部状态栏 */}
        <div className="h-12 bg-surface border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-text-secondary">
              <span className="data-mono">2025-08-15 14:30:25</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-success" />
              <span className="text-sm text-text-secondary">市场活跃</span>
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 p-6">
          <div className="h-full bg-surface/50 rounded-xl border border-border/50 backdrop-blur-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
