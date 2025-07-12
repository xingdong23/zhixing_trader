// 【知行交易】设置页面
// 管理应用设置、数据导入导出、系统配置等

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">系统设置</h1>
            <p className="text-gray-600">管理您的交易系统配置和数据</p>
          </div>
          <button
            onClick={onBack}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回仪表盘
          </button>
        </div>

        <div className="space-y-6">
          {/* 通知设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2 text-blue-500" />
                通知设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">启用通知</h4>
                  <p className="text-sm text-gray-500">接收价格警报、心态提醒等通知</p>
                </div>
                <input
                  type="checkbox"
                  checked={appState.settings.notificationsEnabled}
                  onChange={(e) => onUpdateSettings({ notificationsEnabled: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">自动生成洞察</h4>
                  <p className="text-sm text-gray-500">系统自动分析交易数据并生成个性化建议</p>
                </div>
                <input
                  type="checkbox"
                  checked={appState.settings.autoGenerateInsights}
                  onChange={(e) => onUpdateSettings({ autoGenerateInsights: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* 纪律设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="w-5 h-5 mr-2 text-red-500" />
                纪律设置
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="flex-1"
                    />
                    <span className="text-sm font-medium text-gray-900 w-16">
                      {appState.settings.disciplineLockCooldown} 分钟
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    开启纪律锁定后，修改止损价需要等待此时间才能确认，帮助避免情绪化决策
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 数据管理 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2 text-green-500" />
                数据管理
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 数据统计 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{appState.activePlans.length}</p>
                  <p className="text-sm text-gray-500">活跃计划</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{appState.activeRecords.length}</p>
                  <p className="text-sm text-gray-500">交易记录</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{appState.playbooks.length}</p>
                  <p className="text-sm text-gray-500">交易剧本</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{appState.insights.length}</p>
                  <p className="text-sm text-gray-500">智能洞察</p>
                </div>
              </div>

              {/* 导出数据 */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">导出数据</h4>
                  <p className="text-sm text-gray-500">将所有交易数据导出为JSON文件进行备份</p>
                </div>
                <button
                  onClick={onExportData}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出
                </button>
              </div>

              {/* 导入数据 */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">导入数据</h4>
                  <p className="text-sm text-gray-500">从备份文件恢复交易数据</p>
                </div>
                <div className="flex items-center space-x-3">
                  {importStatus !== 'idle' && (
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(importStatus)}
                      <span className={`text-sm ${
                        importStatus === 'success' ? 'text-green-600' : 
                        importStatus === 'error' ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {importMessage}
                      </span>
                    </div>
                  )}
                  <label className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    导入
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* 清除数据 */}
              <div className="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-red-900">清除所有数据</h4>
                  <p className="text-sm text-red-600">⚠️ 危险操作：将删除所有交易数据，不可撤销</p>
                </div>
                <button
                  onClick={handleClearData}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  清除
                </button>
              </div>
            </CardContent>
          </Card>

          {/* 系统信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Info className="w-5 h-5 mr-2 text-gray-500" />
                系统信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">应用版本</span>
                  <span className="font-medium">知行交易 v1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">数据最后更新</span>
                  <span className="font-medium">
                    {new Date(appState.tradingStats.lastUpdated).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">当前纪律分</span>
                  <span className={`font-bold ${
                    appState.tradingStats.disciplineScore >= 80 ? 'text-green-600' :
                    appState.tradingStats.disciplineScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {appState.tradingStats.disciplineScore}/100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">总交易数</span>
                  <span className="font-medium">{appState.tradingStats.totalTrades} 笔</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">胜率</span>
                  <span className="font-medium">
                    {(appState.tradingStats.winRate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 关于 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="w-5 h-5 mr-2 text-purple-500" />
                关于知行交易
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">核心理念</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    知行交易不是一个简单的交易记录工具，而是一个赋能交易者的"个人交易操作系统"。
                    它融合了战略规划、过程控制、心理干预和数据智能，旨在帮助用户克服最大的敌人——自己的人性弱点，
                    从而实现从随机交易到系统化交易的根本转变。
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">设计哲学</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 计划你的交易，交易你的计划</li>
                    <li>• 纪律比盈利更重要，成长比胜负更有价值</li>
                    <li>• 从此告别心惊胆战，让每一笔交易都成为你成长的基石</li>
                  </ul>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
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
