// 【知行交易】应用状态管理
// 使用React hooks管理应用的全局状态

'use client';

import { useState, useEffect } from 'react';
import { AppState, TradingStats, TradingPlan, TradingPlaybook, TradeRecord, LiveJournal } from '@/types';
import { generateDefaultPlaybooks } from '@/data/defaultPlaybooks';
import { calculateTradingStats } from '@/utils/calculations';

// 初始化默认统计数据
const initialStats: TradingStats = {
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  winRate: 0,
  totalPnL: 0,
  totalPnLPercent: 0,
  avgWinPercent: 0,
  avgLossPercent: 0,
  avgRiskRewardRatio: 0,
  disciplineScore: 75, // 初始纪律分
  perfectExecutions: 0,
  poorExecutions: 0,
  emotionBreakdown: {} as any,
  sourceBreakdown: {} as any,
  avgHoldingDays: 0,
  lastUpdated: new Date()
};

// 初始化应用状态
const initialAppState: AppState = {
  tradingStats: initialStats,
  activePlans: [],
  activeRecords: [],
  liveJournals: [],
  playbooks: generateDefaultPlaybooks(),
  insights: [],
  currentView: 'dashboard',
  settings: {
    disciplineLockCooldown: 30,
    autoGenerateInsights: true,
    notificationsEnabled: true
  }
};

export function useAppState() {
  const [appState, setAppState] = useState<AppState>(initialAppState);

  // 从localStorage加载数据
  useEffect(() => {
    const savedState = localStorage.getItem('zhixing-trader-state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setAppState(prev => ({
          ...prev,
          ...parsed,
          // 确保playbooks包含默认剧本
          playbooks: parsed.playbooks?.length > 0 ? parsed.playbooks : generateDefaultPlaybooks()
        }));
      } catch (error) {
        console.error('Failed to load saved state:', error);
      }
    }
  }, []);

  // 保存状态到localStorage
  const saveState = (newState: AppState) => {
    try {
      localStorage.setItem('zhixing-trader-state', JSON.stringify(newState));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  };

  // 更新应用状态
  const updateAppState = (updates: Partial<AppState>) => {
    setAppState(prev => {
      const newState = { ...prev, ...updates };
      saveState(newState);
      return newState;
    });
  };

  // 添加新的交易计划
  const addTradingPlan = (plan: TradingPlan) => {
    updateAppState({
      activePlans: [...appState.activePlans, plan]
    });
  };

  // 更新交易计划
  const updateTradingPlan = (planId: string, updates: Partial<TradingPlan>) => {
    const updatedPlans = appState.activePlans.map(plan =>
      plan.id === planId ? { ...plan, ...updates } : plan
    );
    updateAppState({
      activePlans: updatedPlans
    });
  };

  // 删除交易计划
  const deleteTradingPlan = (planId: string) => {
    const filteredPlans = appState.activePlans.filter(plan => plan.id !== planId);
    updateAppState({
      activePlans: filteredPlans
    });
  };

  // 添加盘中观察日志
  const addLiveJournal = (tradeId: string, journal: Omit<LiveJournal, 'id'>) => {
    const newJournal: LiveJournal = {
      ...journal,
      id: `journal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    updateAppState({
      liveJournals: [...appState.liveJournals, newJournal]
    });
  };

  // 删除剧本
  const deletePlaybook = (playbookId: string) => {
    const filteredPlaybooks = appState.playbooks.filter(playbook => playbook.id !== playbookId);
    updateAppState({
      playbooks: filteredPlaybooks
    });
  };

  // 添加交易记录
  const addTradeRecord = (record: Omit<TradeRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const fullRecord: TradeRecord = {
      ...record,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const updatedRecords = [...appState.activeRecords, fullRecord];
    const newStats = calculateTradingStats(updatedRecords);
    
    updateAppState({
      activeRecords: updatedRecords,
      tradingStats: newStats
    });
  };

  // 更新交易记录
  const updateTradeRecord = (recordId: string, updates: Partial<TradeRecord>) => {
    const updatedRecords = appState.activeRecords.map(record =>
      record.id === recordId ? { ...record, ...updates } : record
    );
    const newStats = calculateTradingStats(updatedRecords);
    
    updateAppState({
      activeRecords: updatedRecords,
      tradingStats: newStats
    });
  };

  // 添加剧本
  const addPlaybook = (playbook: Omit<TradingPlaybook, 'id' | 'createdAt' | 'updatedAt'>) => {
    const fullPlaybook: TradingPlaybook = {
      ...playbook,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    updateAppState({
      playbooks: [...appState.playbooks, fullPlaybook]
    });
  };

  // 更新剧本
  const updatePlaybook = (playbookId: string, updates: Partial<TradingPlaybook>) => {
    const updatedPlaybooks = appState.playbooks.map(playbook =>
      playbook.id === playbookId ? { ...playbook, ...updates } : playbook
    );
    updateAppState({
      playbooks: updatedPlaybooks
    });
  };

  // 切换视图
  const setCurrentView = (view: AppState['currentView']) => {
    updateAppState({ currentView: view });
  };

  // 更新设置
  const updateSettings = (settings: Partial<AppState['settings']>) => {
    updateAppState({
      settings: { ...appState.settings, ...settings }
    });
  };

  // 清除所有数据（重置功能）
  const clearAllData = () => {
    const resetState = {
      ...initialAppState,
      playbooks: generateDefaultPlaybooks() // 保留默认剧本
    };
    setAppState(resetState);
    saveState(resetState);
  };

  // 导出数据
  const exportData = () => {
    const dataToExport = {
      ...appState,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zhixing-trader-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 导入数据
  const importData = (file: File): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);

          // 验证数据格式
          if (!importedData.tradingStats || !importedData.playbooks) {
            throw new Error('无效的数据格式');
          }

          // 合并导入的数据
          const mergedState = {
            ...appState,
            ...importedData,
            // 确保默认剧本存在
            playbooks: [
              ...generateDefaultPlaybooks(),
              ...importedData.playbooks.filter((p: any) => !p.isSystemDefault)
            ]
          };

          setAppState(mergedState);
          saveState(mergedState);
          resolve(true);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  };

  return {
    // 状态
    appState,

    // 计划相关
    addTradingPlan,
    updateTradingPlan,
    deleteTradingPlan,

    // 记录相关
    addTradeRecord,
    updateTradeRecord,

    // 日志相关
    addLiveJournal,

    // 剧本相关
    addPlaybook,
    updatePlaybook,
    deletePlaybook,

    // 视图和设置
    setCurrentView,
    updateSettings,

    // 数据管理
    clearAllData,
    exportData,
    importData,

    // 通用更新
    updateAppState
  };
}
