// 【知行交易】设置页面 - 重构版
// 统一样式系统，解决样式混乱问题

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui';
import { AppState } from '@/types';
import { 
  Settings, 
  Download, 
  Upload, 
  Trash2, 
  ArrowLeft,
  Bell,
  Lock,
  Brain,
  Database,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

interface SettingsPageProps {
  appState: AppState;
  onUpdateSettings: (settings: Partial<AppState['settings']>) => void;
  onExportData: () => void;
  onImportData: (file: File) => Promise<boolean>;
  onClearAllData: () => void;
  onBack: () => void;
}

export function SettingsPage({ 
  appState, 
  onUpdateSettings, 
  onExportData, 
  onImportData, 
  onClearAllData, 
  onBack 
}: SettingsPageProps) {
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus('loading');
    try {
      await onImportData(file);
      setImportStatus('success');
      setImportMessage('数据导入成功！');
      setTimeout(() => setImportStatus('idle'), 3000);
    } catch (error) {
      setImportStatus('error');
      setImportMessage(error instanceof Error ? error.message : '导入失败');
      setTimeout(() => setImportStatus('idle'), 5000);
    }
    
    // 清空文件输入
    event.target.value = '';
  };

  const handleClearData = () => {
    if (confirm('⚠️ 警告：此操作将清除所有交易数据，包括计划、记录和自定义剧本。系统预设剧本将保留。\n\n此操作不可撤销，确定要继续吗？')) {
      if (confirm('请再次确认：您真的要清除所有数据吗？')) {
        onClearAllData();
        alert('数据已清除完成。');
      }
    }
  };

  const getStatusIcon = (status: typeof importStatus) => {
    switch (status) {
      case 'loading': return <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 页面标题 */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">系统设置</h1>
            <p className="text-slate-400">管理您的交易系统配置和数据</p>
          </div>
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center text-slate-300 hover:text-white hover:bg-slate-700/50 border-slate-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回仪表盘
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 通知设置 */}
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-white">
                <Bell className="w-5 h-5 mr-2 text-cyan-400" />
                通知设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                <div className="flex-1">
                  <h4 className="font-medium text-white">启用通知</h4>
                  <p className="text-sm text-slate-400">接收价格警报、心态提醒等通知</p>
                </div>
                <input
                  type="checkbox"
                  checked={appState.settings.notificationsEnabled}
                  onChange={(e) => onUpdateSettings({ notificationsEnabled: e.target.checked })}
                  className="w-5 h-5 text-cyan-500 bg-slate-600 border-slate-500 rounded focus:ring-cyan-500 focus:ring-2"
                />
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                <div className="flex-1">
                  <h4 className="font-medium text-white">自动生成洞察</h4>
                  <p className="text-sm text-slate-400">系统自动分析交易数据并生成个性化建议</p>
                </div>
                <input
                  type="checkbox"
                  checked={appState.settings.autoGenerateInsights}
                  onChange={(e) => onUpdateSettings({ autoGenerateInsights: e.target.checked })}
                  className="w-5 h-5 text-cyan-500 bg-slate-600 border-slate-500 rounded focus:ring-cyan-500 focus:ring-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* 纪律设置 */}
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-white">
                <Lock className="w-5 h-5 mr-2 text-red-400" />
                纪律设置
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-slate-700/30">
                  <label className="block text-sm font-medium text-white mb-3">
                    纪律锁定冷却时间 (分钟)
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="5"
                      max="120"
                      step="5"
                      value={appState.settings.disciplineLockCooldown}
                      onChange={(e) => onUpdateSettings({ 
                        disciplineLockCooldown: parseInt(e.target.value) 
                      })}
                      className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <span className="text-sm font-medium text-white min-w-fit">
                      {appState.settings.disciplineLockCooldown} 分钟
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-3">
                    开启纪律锁定后，修改止损价需要等待此时间才能确认，帮助避免情绪化决策
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 数据管理 */}
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm lg:col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-white">
                <Database className="w-5 h-5 mr-2 text-green-400" />
                数据管理
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 数据统计 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-700/30 rounded-xl">
                <div className="text-center">
                  <p className="text-3xl font-bold text-cyan-400">{appState.activePlans.length}</p>
                  <p className="text-sm text-slate-400">活跃计划</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-400">{appState.activeRecords.length}</p>
                  <p className="text-sm text-slate-400">交易记录</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-400">{appState.playbooks.length}</p>
                  <p className="text-sm text-slate-400">交易剧本</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-400">{appState.insights.length}</p>
                  <p className="text-sm text-slate-400">智能洞察</p>
                </div>
              </div>

              {/* 操作按钮组 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 导出数据 */}
                <div className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
                  <div className="mb-3">
                    <h4 className="font-medium text-white">导出数据</h4>
                    <p className="text-sm text-slate-400">将所有交易数据导出为JSON文件进行备份</p>
                  </div>
                  <Button
                    onClick={onExportData}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    导出数据
                  </Button>
                </div>

                {/* 导入数据 */}
                <div className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
                  <div className="mb-3">
                    <h4 className="font-medium text-white">导入数据</h4>
                    <p className="text-sm text-slate-400">从备份文件恢复交易数据</p>
                  </div>
                  <div className="space-y-2">
                    {importStatus !== 'idle' && (
                      <div className="flex items-center justify-center space-x-2 p-2 rounded-lg bg-slate-600/30">
                        {getStatusIcon(importStatus)}
                        <span className={`text-sm ${
                          importStatus === 'success' ? 'text-green-400' : 
                          importStatus === 'error' ? 'text-red-400' : 'text-cyan-400'
                        }`}>
                          {importMessage}
                        </span>
                      </div>
                    )}
                    <Button className="w-full bg-green-600 hover:bg-green-500 text-white border-green-500 relative overflow-hidden">
                      <Upload className="w-4 h-4 mr-2" />
                      导入数据
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileImport}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </Button>
                  </div>
                </div>

                {/* 清除数据 */}
                <div className="p-4 bg-red-900/20 rounded-xl border border-red-700/30">
                  <div className="mb-3">
                    <h4 className="font-medium text-red-400">清除所有数据</h4>
                    <p className="text-sm text-red-300">⚠️ 危险操作：将删除所有交易数据，不可撤销</p>
                  </div>
                  <Button
                    variant="danger"
                    onClick={handleClearData}
                    className="w-full bg-red-600 hover:bg-red-500 text-white border-red-500"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    清除数据
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 系统信息 */}
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-white">
                <Info className="w-5 h-5 mr-2 text-slate-400" />
                系统信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 rounded-lg bg-slate-700/30">
                  <span className="text-slate-400">应用版本</span>
                  <span className="font-medium text-white">知行交易 v1.0.0</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-slate-700/30">
                  <span className="text-slate-400">数据最后更新</span>
                  <span className="font-medium text-white">
                    {new Date(appState.tradingStats.lastUpdated).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-slate-700/30">
                  <span className="text-slate-400">当前纪律分</span>
                  <span className={`font-bold ${
                    appState.tradingStats.disciplineScore >= 80 ? 'text-green-400' :
                    appState.tradingStats.disciplineScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {appState.tradingStats.disciplineScore}/100
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-slate-700/30">
                  <span className="text-slate-400">总交易数</span>
                  <span className="font-medium text-white">{appState.tradingStats.totalTrades} 笔</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-slate-700/30">
                  <span className="text-slate-400">胜率</span>
                  <span className="font-medium text-white">
                    {(appState.tradingStats.winRate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 关于 */}
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-white">
                <Brain className="w-5 h-5 mr-2 text-purple-400" />
                关于知行交易
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-700/30">
                  <h4 className="font-medium text-white mb-2">核心理念</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    知行交易不是一个简单的交易记录工具，而是一个赋能交易者的"个人交易操作系统"。
                    它融合了战略规划、过程控制、心理干预和数据智能，旨在帮助用户克服最大的敌人——自己的人性弱点，
                    从而实现从随机交易到系统化交易的根本转变。
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-700/30">
                  <h4 className="font-medium text-white mb-2">设计哲学</h4>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>• 计划你的交易，交易你的计划</li>
                    <li>• 纪律比盈利更重要，成长比胜负更有价值</li>
                    <li>• 从此告别心惊胆战，让每一笔交易都成为你成长的基石</li>
                  </ul>
                </div>
                <div className="pt-4 border-t border-slate-600/30">
                  <p className="text-xs text-slate-400 text-center">
                    © 2024 知行交易 - 您的个人交易操作系统
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
