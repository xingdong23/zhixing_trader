// 【知行交易】主页面
// 这是应用的入口点，根据当前视图展示不同的界面

'use client';

import { useState } from 'react';
import { TopNavigation, MainModule } from '@/components/TopNavigation';
import { StockMarketRefactored as StockMarket } from '@/components/stock-market';
import { TradingManagement } from '@/components/TradingManagement';
import { IntelligentReview } from '@/components/IntelligentReview';
import { SettingsPage } from '@/components/SettingsPage';
import { NotificationSystem } from '@/components/NotificationSystem';
import { WelcomeDashboard } from '@/components/WelcomeDashboard';
import { useAppState } from '@/hooks/useAppState';

export default function Home() {
  const {
    appState,
    setCurrentView,
    addTradingPlan,
    updateTradingPlan,
    addTradeRecord,
    addPlaybook,
    deletePlaybook,
    updateSettings,
    exportData,
    importData,
    clearAllData
  } = useAppState();

  // 主模块状态
  const [currentModule, setCurrentModule] = useState<MainModule | null>(null);
  const [selectedStock, setSelectedStock] = useState<any>(null);

  // 模块切换处理
  const handleModuleChange = (module: MainModule) => {
    setCurrentModule(module);
  };

  // 回到首页
  const handleGoHome = () => {
    setCurrentModule(null);
  };

  // 股票市场相关处理
  const handleCreateTradingPlanFromStock = (stock: any) => {
    setSelectedStock(stock);
    setCurrentModule('trading');
  };

  // 设置页面处理
  const handleShowSettings = () => {
    setCurrentView('settings');
  };

  // 如果显示设置页面，也使用TopNavigation包装
  if (appState.currentView === 'settings') {
    return (
      <TopNavigation
        currentModule={currentModule || 'market'}
        onModuleChange={handleModuleChange}
        onSettings={handleShowSettings}
        onHome={handleGoHome}
      >
        <SettingsPage
          appState={appState}
          onUpdateSettings={updateSettings}
          onExportData={exportData}
          onImportData={importData}
          onClearAllData={clearAllData}
          onBack={() => setCurrentView('dashboard')}
        />
      </TopNavigation>
    );
  }

  // 主应用界面
  return (
    <TopNavigation
      currentModule={currentModule || 'market'}
      onModuleChange={handleModuleChange}
      onSettings={handleShowSettings}
      onHome={handleGoHome}
    >
      {/* 主内容区域 */}
      {!currentModule && (
        <WelcomeDashboard onModuleChange={handleModuleChange} />
      )}

      {currentModule === 'market' && (
        <StockMarket
          onCreateTradingPlan={handleCreateTradingPlanFromStock}
        />
      )}

      {currentModule === 'trading' && (
        <TradingManagement
          activePlans={appState.activePlans}
          activeRecords={appState.activeRecords}
          playbooks={appState.playbooks}
          createPlanAction={() => {}}
          updatePlanAction={updateTradingPlan}
          addRecordAction={addTradeRecord}
          selectedStock={selectedStock}
        />
      )}

      {currentModule === 'insights' && (
        <IntelligentReview
          tradingStats={appState.tradingStats}
          completedPlans={appState.activePlans.filter(p => p.status === 'closed')}
          completedRecords={appState.activeRecords.filter(r => r.status === 'closed')}
          insights={appState.insights}
          playbooks={appState.playbooks}
          onAddPlaybook={addPlaybook}
          onDeletePlaybook={deletePlaybook}
        />
      )}

      {/* 通知系统 */}
      <NotificationSystem
        activePlans={appState.activePlans}
        activeRecords={appState.activeRecords}
        settings={appState.settings}
        onUpdateSettings={updateSettings}
      />
    </TopNavigation>
  );
}
