'use client';

import React, { useState, useEffect } from 'react';
import { Search, Bell, Settings } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [syncTime, setSyncTime] = useState('');

  useEffect(() => {
    // 更新同步时间
    const updateSyncTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      setSyncTime(`数据同步于 ${timeString}`);
    };

    updateSyncTime();
    const interval = setInterval(updateSyncTime, 60000); // 每分钟更新一次

    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // TODO: 实现搜索逻辑
  };

  return (
    <header 
      className="flex justify-between items-center p-4 border-b flex-shrink-0"
      style={{ 
        backgroundColor: 'var(--sidebar-bg)',
        borderColor: 'var(--border-color)'
      }}
    >
      <div className="header-left">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
      </div>
      
      <div className="flex items-center gap-5">
        {/* 搜索栏 */}
        <div className="relative">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--text-secondary)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="搜索代码/名称/概念..."
            className="rounded-lg pl-10 pr-4 py-2 w-64 transition-all duration-200"
            style={{
              backgroundColor: 'var(--surface-bg)',
              border: `1px solid var(--border-color)`,
              color: 'var(--text-primary)'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent-primary)';
              e.target.style.boxShadow = '0 0 0 2px rgba(0, 170, 255, 0.2)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-color)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* 头部操作区 */}
        <div className="flex items-center gap-4">
          {/* 数据同步状态 */}
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <div 
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--color-green)' }}
            ></div>
            <span>{syncTime}</span>
          </div>

          {/* 通知按钮 */}
          <button 
            className="p-2 rounded-full transition-all duration-200 relative flex items-center justify-center"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-bg)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <Bell className="w-5 h-5" />
            <span 
              className="absolute top-1 right-1 w-2 h-2 rounded-full border"
              style={{ 
                backgroundColor: 'var(--color-red)',
                borderColor: 'var(--sidebar-bg)'
              }}
            ></span>
          </button>

          {/* 设置按钮 */}
          <button 
            className="p-2 rounded-full transition-all duration-200 flex items-center justify-center"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-bg)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
