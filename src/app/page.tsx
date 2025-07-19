// 【知行交易】主页面
// 这是应用的入口点，根据当前视图展示不同的界面

'use client';

import { useState } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { UnifiedTradingPlan } from '@/components/UnifiedTradingPlan';
import { StockMarket } from '@/components/StockMarket';
import { TradeTracker } from '@/components/TradeTracker';
import { AdvancedTradeTracker } from '@/components/AdvancedTradeTracker';
import { TradeReview } from '@/components/TradeReview';
import { InsightsLab } from '@/components/InsightsLab';
import { PlaybookManager } from '@/components/PlaybookManager';
import { NotificationSystem } from '@/components/NotificationSystem';
import { SettingsPage } from '@/components/SettingsPage';
import { useAppState } from '@/hooks/useAppState';

export default function Home() {
  const {
    appState,
    setCurrentView,
    addTradingPlan,
    updateTradingPlan,
    addTradeRecord,
    addLiveJournal,
    addPlaybook,
    deletePlaybook,
    updateSettings,
    exportData,
    importData,
    clearAllData
  } = useAppState();

  // 用于复盘的计划状态
  const [reviewingPlan, setReviewingPlan] = useState<any>(null);

  const handleNewPlan = () => {
    setCurrentView('planning');
  };

  const handleViewPlan = (planId: string) => {
    console.log('查看交易计划:', planId);
    setCurrentView('tracking');
  };

  const handleViewPlaybook = (playbookId: string) => {
    console.log('查看剧本:', playbookId);
    setCurrentView('playbooks');
  };

  const handlePlanSubmit = (plan: any) => {
    addTradingPlan(plan);
    setCurrentView('dashboard');
  };

  const handlePlanCancel = () => {
    setCurrentView('dashboard');
  };

  // 股票市场相关处理
  const handleCreateTradingPlanFromStock = (stock: any) => {
    // 从股票创建交易计划时，预填充股票信息
    setCurrentView('planning');
    // 这里可以传递股票信息到交易计划组件
  };

  // 根据当前视图渲染不同的组件
  switch (appState.currentView) {
    case 'planning':
      return (
        <UnifiedTradingPlan
          playbooks={appState.playbooks}
          onSave={handlePlanSubmit}
          onCancel={handlePlanCancel}
        />
      );

    case 'market':
      return (
        <StockMarket
          onCreateTradingPlan={handleCreateTradingPlanFromStock}
        />
      );

    case 'tracking':
      return (
        <TradeTracker
          activePlans={appState.activePlans}
          activeRecords={appState.activeRecords}
          liveJournals={appState.liveJournals}
          onUpdatePlan={updateTradingPlan}
          onCloseTrade={(planId) => {
            const plan = appState.activePlans.find(p => p.id === planId);
            if (plan) {
              setReviewingPlan(plan);
              setCurrentView('review');
            }
          }}
          onAddJournal={addLiveJournal}
          onBack={() => setCurrentView('dashboard')}
        />
      );

    case 'insights':
      return (
        <InsightsLab
          stats={appState.tradingStats}
          records={appState.activeRecords}
          onBack={() => setCurrentView('dashboard')}
        />
      );

    case 'review':
      return reviewingPlan ? (
        <TradeReview
          plan={reviewingPlan}
          onSubmitReview={(record, saveAsPlaybook) => {
            // 添加交易记录
            addTradeRecord(record);

            // 如果选择保存为剧本，创建新剧本
            if (saveAsPlaybook) {
              const newPlaybook = {
                id: `playbook_${Date.now()}`,
                name: `${reviewingPlan.symbolName}成功模式`,
                description: `基于${reviewingPlan.symbolName}的成功交易经验`,
                createdAt: new Date(),
                updatedAt: new Date(),
                template: {
                  buyingLogicTemplate: reviewingPlan.buyingLogic,
                  riskManagementTemplate: {
                    stopLossRatio: Math.abs(reviewingPlan.plannedEntryPrice - reviewingPlan.stopLoss) / reviewingPlan.plannedEntryPrice,
                    takeProfitRatio: Math.abs(reviewingPlan.takeProfit - reviewingPlan.plannedEntryPrice) / reviewingPlan.plannedEntryPrice
                  },
                  recommendedEmotion: reviewingPlan.emotion,
                  recommendedSource: reviewingPlan.informationSource
                },
                performance: {
                  totalTrades: 1,
                  winRate: record.realizedPnL! > 0 ? 1 : 0,
                  avgPnLPercent: record.realizedPnLPercent!,
                  avgRiskRewardRatio: reviewingPlan.riskRewardRatio,
                  totalPnL: record.realizedPnL!
                },
                tags: ['用户创建'],
                isSystemDefault: false
              };
              addPlaybook(newPlaybook);
            }

            // 从活跃计划中移除
            const updatedPlans = appState.activePlans.filter(p => p.id !== reviewingPlan.id);
            // TODO: 更新活跃计划列表

            setReviewingPlan(null);
            setCurrentView('dashboard');
          }}
          onCancel={() => {
            setReviewingPlan(null);
            setCurrentView('tracking');
          }}
        />
      ) : null;

    case 'playbooks':
      return (
        <PlaybookManager
          playbooks={appState.playbooks}
          onCreatePlaybook={(playbook) => {
            const newPlaybook = {
              ...playbook,
              id: `playbook_${Date.now()}`,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            addPlaybook(newPlaybook);
          }}
          onUpdatePlaybook={(playbookId, updates) => {
            updatePlaybook(playbookId, { ...updates, updatedAt: new Date() });
          }}
          onDeletePlaybook={(playbookId) => {
            if (confirm('确定要删除这个剧本吗？此操作不可撤销。')) {
              deletePlaybook(playbookId);
            }
          }}
          onBack={() => setCurrentView('dashboard')}
        />
      );

    case 'settings':
      return (
        <SettingsPage
          appState={appState}
          onUpdateSettings={updateSettings}
          onExportData={exportData}
          onImportData={importData}
          onClearAllData={clearAllData}
          onBack={() => setCurrentView('dashboard')}
        />
      );

    default:
      return (
        <>
          <Dashboard
            stats={appState.tradingStats}
            activePlans={appState.activePlans}
            playbooks={appState.playbooks}
            onNewPlan={handleNewPlan}
            onViewPlan={handleViewPlan}
            onViewPlaybook={handleViewPlaybook}
            onViewMarket={() => setCurrentView('market')}
            onViewInsights={() => setCurrentView('insights')}
            onViewSettings={() => setCurrentView('settings')}
          />
          <NotificationSystem
            activePlans={appState.activePlans}
            activeRecords={appState.activeRecords}
            settings={appState.settings}
            onUpdateSettings={updateSettings}
          />
        </>
      );
  }
}
