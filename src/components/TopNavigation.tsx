'use client';

import React, { useState } from 'react';
import { BarChart3, TrendingUp, Brain, Settings, Menu, X, Home } from 'lucide-react';

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
    { id: 'market' as MainModule, name: '市场', icon: BarChart3 },
    { id: 'trading' as MainModule, name: '交易', icon: TrendingUp },
    { id: 'insights' as MainModule, name: '复盘', icon: Brain }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* 顶部导航 */}
      <header style={{ 
        background: 'white', 
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '0 16px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* 左侧品牌 */}
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
            onClick={onHome}
          >
            <div style={{ 
              width: '40px', 
              height: '40px', 
              background: '#3b82f6', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold'
            }}>
              知
            </div>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
              知行交易
            </span>
          </div>

          {/* 桌面端导航 */}
          <nav style={{ display: 'flex', gap: '8px' }} className="hidden md:flex">
            {modules.map((module) => {
              const Icon = module.icon;
              const isActive = currentModule === module.id;
              return (
                <button
                  key={module.id}
                  onClick={() => onModuleChange(module.id)}
                  className="btn"
                  style={{
                    background: isActive ? '#3b82f6' : '#f3f4f6',
                    color: isActive ? 'white' : '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Icon size={16} />
                  {module.name}
                </button>
              );
            })}
          </nav>

          {/* 右侧按钮 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="btn btn-secondary md:hidden"
            >
              {isMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            
            {onHome && (
              <button onClick={onHome} className="btn btn-secondary">
                <Home size={16} />
              </button>
            )}
            
            <button onClick={onSettings} className="btn btn-secondary">
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* 移动端菜单 */}
        {isMenuOpen && (
          <div className="md:hidden" style={{ 
            background: 'white', 
            borderTop: '1px solid #e5e7eb',
            padding: '16px'
          }}>
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
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: isActive ? '#3b82f6' : 'transparent',
                    color: isActive ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <Icon size={20} />
                  {module.name}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* 主内容 */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px' }}>
        {children}
      </main>
    </div>
  );
}