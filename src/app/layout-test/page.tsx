'use client'

import React from 'react'
import { TopNavigation, MainModule } from '@/components/TopNavigation'
import ContentTest from '@/components/ContentTest'

export default function LayoutTestPage() {
  const [currentModule, setCurrentModule] = React.useState<MainModule>('market')
  
  return (
    <TopNavigation
      currentModule={currentModule}
      onModuleChange={setCurrentModule}
      onSettings={() => {}}
    >
      <div className="p-8">
        <h1 className="text-3xl font-bold text-primary mb-6">布局测试页面</h1>
        <p className="text-text-secondary mb-6">
          这个页面用于测试左侧导航栏和右侧内容区域的布局是否正确。
        </p>
        <ContentTest />
      </div>
    </TopNavigation>
  )
}