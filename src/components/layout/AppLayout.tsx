'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppLayout({ children, title = '仪表盘' }: AppLayoutProps) {
  return (
    <div 
      className="flex h-screen"
      style={{ fontFamily: 'var(--font-family)' }}
    >
      {/* 侧边栏 */}
      <Sidebar />
      
      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 头部 */}
        <Header title={title} />
        
        {/* 页面内容 */}
        <div 
          className="flex-1 p-6 overflow-y-auto"
        >
          {children}
        </div>
      </main>
    </div>
  );
}
