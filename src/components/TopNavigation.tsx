// 【知行交易】顶部导航栏
// 清晰的三模块导航：股票市场、交易管理、智能复盘

'use client';

import React from 'react';
import { BarChart3, TrendingUp, Brain, Settings } from 'lucide-react';

export type MainModule = 'market' | 'trading' | 'insights';

interface TopNavigationProps {
  currentModule: MainModule;
  onModuleChange: (module: MainModule) => void;
  onSettings: () => void;
}

export function TopNavigation({ 
  currentModule, 
  onModuleChange, 
  onSettings 
}: TopNavigationProps) {
  const modules = [
    {
      id: 'market' as MainModule,
      name: '股票市场',
      description: '发现投资机会',
      icon: BarChart3,
      color: 'emerald'
    },
    {
      id: 'trading' as MainModule,
      name: '交易管理',
      description: '执行投资决策',
      icon: TrendingUp,
      color: 'blue'
    },
    {
      id: 'insights' as MainModule,
      name: '智能复盘',
      description: '学习和改进',
      icon: Brain,
      color: 'purple'
    }
  ];

  const getModuleStyles = (moduleId: MainModule, color: string) => {
    const isActive = currentModule === moduleId;
    
    if (isActive) {
      return {
        button: `bg-${color}-600 text-white shadow-lg`,
        text: 'text-white',
        description: 'text-white/80'
      };
    }
    
    return {
      button: `bg-white text-gray-700 hover:bg-${color}-50 hover:text-${color}-700 border border-gray-200`,
      text: 'text-gray-700',
      description: 'text-gray-500'
    };
  };

  return (
    <div className="flex h-12">
      {/* 左侧：Logo区域 - 蓝色背景 */}
      <div className="bg-blue-600 px-4 flex items-center">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs">知</span>
          </div>
          <span className="text-white font-medium">知行交易</span>
        </div>
      </div>

      {/* 右侧：导航菜单 - 白色背景 */}
      <div className="flex-1 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-full px-6">
          {/* 主导航模块 */}
          <div className="flex items-center space-x-8">
            <button className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 text-sm">
              <span>📊</span>
              <span>首页</span>
            </button>

            {modules.map((module) => {
              const isActive = currentModule === module.id;
              const getIcon = (moduleId: string) => {
                switch(moduleId) {
                  case 'market': return '📈';
                  case 'trading': return '💼';
                  case 'insights': return '🧠';
                  default: return '📊';
                }
              };

              return (
                <button
                  key={module.id}
                  onClick={() => onModuleChange(module.id)}
                  className={`flex items-center space-x-1 text-sm transition-colors ${
                    isActive
                      ? 'text-gray-900 font-medium'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  <span>{getIcon(module.id)}</span>
                  <span>{module.name}</span>
                  <span className="text-gray-400">▼</span>
                </button>
              );
            })}
          </div>

          {/* 右侧功能区 */}
          <div className="flex items-center">
            <button
              onClick={onSettings}
              className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 text-sm"
              title="系统设置"
            >
              <span>⚙️</span>
              <span>设置</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
