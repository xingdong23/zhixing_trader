'use client';

import React from 'react';
import FearGreedIndex from './FearGreedIndex';
import StockPool from './StockPool';

interface DashboardProps {
  onStockClick?: (stock: any) => void;
  onImportClick?: () => void;
}

export default function Dashboard({ onStockClick, onImportClick }: DashboardProps) {
  return (
    <div className="space-y-6">
      {/* 恐慌贪婪指数 */}
      <FearGreedIndex />
      
      {/* 股票池 */}
      <StockPool 
        onStockClick={onStockClick}
        onImportClick={onImportClick}
      />
    </div>
  );
}
