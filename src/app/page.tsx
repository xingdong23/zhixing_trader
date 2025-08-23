// 【知行交易】暗色主题首页
// 展示系统核心功能和现代化设计

'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Dashboard } from '@/components/dashboard';

export default function HomePage() {
  const [selectedStock, setSelectedStock] = useState(null);

  const handleStockClick = (stock: any) => {
    setSelectedStock(stock);
    // TODO: 打开股票详情模态框
    console.log('Stock clicked:', stock);
  };

  const handleImportClick = () => {
    // TODO: 打开导入模态框
    console.log('Import clicked');
  };

  return (
    <AppLayout title="仪表盘">
      <Dashboard 
        onStockClick={handleStockClick}
        onImportClick={handleImportClick}
      />
    </AppLayout>
  );
}