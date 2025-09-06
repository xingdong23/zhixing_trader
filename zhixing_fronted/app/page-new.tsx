'use client'

import { useState } from 'react'
import { StockList } from '@/components/stocks/StockList'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'

export default function TradingSystem() {
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 主要内容区域 */}
          <div className="flex-1">
            <StockList 
              selectedConcept={selectedConcept}
              onConceptSelect={setSelectedConcept}
            />
          </div>
          
          {/* 侧边栏 */}
          <div className="w-full lg:w-96 space-y-6">
            <NotificationCenter />
          </div>
        </div>
      </div>
    </div>
  )
}
