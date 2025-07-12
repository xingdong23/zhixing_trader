// 【知行交易】剧本管理系统
// 管理交易剧本的创建、编辑、应用，包含预设剧本和用户自定义剧本

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  TradingPlaybook, 
  TradingEmotion, 
  InformationSource 
} from '@/types';
import { 
  BookOpen, 
  Plus, 
  Edit3, 
  Star, 
  TrendingUp, 
  Target, 
  Shield,
  ArrowLeft,
  Save,
  Trash2,
  Copy,
  Award,
  Users,
  Calendar
} from 'lucide-react';

interface PlaybookManagerProps {
  playbooks: TradingPlaybook[];
  onCreatePlaybook: (playbook: Omit<TradingPlaybook, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdatePlaybook: (playbookId: string, updates: Partial<TradingPlaybook>) => void;
  onDeletePlaybook: (playbookId: string) => void;
  onBack: () => void;
}

export function PlaybookManager({ 
  playbooks, 
  onCreatePlaybook, 
  onUpdatePlaybook, 
  onDeletePlaybook, 
  onBack 
}: PlaybookManagerProps) {
  const [selectedPlaybook, setSelectedPlaybook] = useState<TradingPlaybook | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<Partial<TradingPlaybook>>({});

  const systemPlaybooks = playbooks.filter(p => p.isSystemDefault);
  const userPlaybooks = playbooks.filter(p => !p.isSystemDefault);

  const handleEdit = (playbook: TradingPlaybook) => {
    setSelectedPlaybook(playbook);
    setEditForm(playbook);
    setIsEditing(true);
  };

  const handleCreate = () => {
    setEditForm({
      name: '',
      description: '',
      template: {
        buyingLogicTemplate: {
          technical: '',
          fundamental: '',
          news: ''
        },
        riskManagementTemplate: {
          stopLossRatio: 0.08,
          takeProfitRatio: 0.20
        },
        recommendedEmotion: TradingEmotion.CALM,
        recommendedSource: InformationSource.SELF_ANALYSIS
      },
      performance: {
        totalTrades: 0,
        winRate: 0,
        avgPnLPercent: 0,
        avgRiskRewardRatio: 0,
        totalPnL: 0
      },
      tags: [],
      isSystemDefault: false
    });
    setIsCreating(true);
  };

  const handleSave = () => {
    if (!editForm.name || !editForm.description) {
      alert('请填写剧本名称和描述');
      return;
    }

    if (isCreating) {
      onCreatePlaybook(editForm as Omit<TradingPlaybook, 'id' | 'createdAt' | 'updatedAt'>);
    } else if (selectedPlaybook) {
      onUpdatePlaybook(selectedPlaybook.id, editForm);
    }

    setIsEditing(false);
    setIsCreating(false);
    setSelectedPlaybook(null);
    setEditForm({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
    setSelectedPlaybook(null);
    setEditForm({});
  };

  const handleCopy = (playbook: TradingPlaybook) => {
    const copiedPlaybook = {
      ...playbook,
      name: `${playbook.name} (副本)`,
      isSystemDefault: false,
      performance: {
        totalTrades: 0,
        winRate: 0,
        avgPnLPercent: 0,
        avgRiskRewardRatio: 0,
        totalPnL: 0
      }
    };
    delete (copiedPlaybook as any).id;
    delete (copiedPlaybook as any).createdAt;
    delete (copiedPlaybook as any).updatedAt;
    
    onCreatePlaybook(copiedPlaybook);
  };

  const getPerformanceColor = (value: number, type: 'winRate' | 'pnl') => {
    if (type === 'winRate') {
      if (value >= 0.7) return 'text-green-600';
      if (value >= 0.5) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      if (value > 0) return 'text-green-600';
      if (value < 0) return 'text-red-600';
      return 'text-gray-600';
    }
  };

  if (isEditing || isCreating) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {isCreating ? '创建新剧本' : '编辑剧本'}
              </h1>
              <p className="text-gray-600">设计您的交易模板</p>
            </div>
            <button
              onClick={handleCancel}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              取消
            </button>
          </div>

          <div className="space-y-6">
            {/* 基本信息 */}
            <Card>
              <CardHeader>
                <CardTitle>基本信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    剧本名称 *
                  </label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="如：回踩多头排列"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    剧本描述 *
                  </label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="描述这个剧本的适用场景和关键特征..."
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    标签
                  </label>
                  <input
                    type="text"
                    value={editForm.tags?.join(', ') || ''}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) 
                    }))}
                    placeholder="技术分析, 趋势跟踪, 短线"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 买入逻辑模板 */}
            <Card>
              <CardHeader>
                <CardTitle>买入逻辑模板</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    技术面分析模板
                  </label>
                  <textarea
                    value={editForm.template?.buyingLogicTemplate?.technical || ''}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      template: {
                        ...prev.template!,
                        buyingLogicTemplate: {
                          ...prev.template!.buyingLogicTemplate,
                          technical: e.target.value
                        }
                      }
                    }))}
                    placeholder="描述技术分析的关键要素..."
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    基本面分析模板
                  </label>
                  <textarea
                    value={editForm.template?.buyingLogicTemplate?.fundamental || ''}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      template: {
                        ...prev.template!,
                        buyingLogicTemplate: {
                          ...prev.template!.buyingLogicTemplate,
                          fundamental: e.target.value
                        }
                      }
                    }))}
                    placeholder="描述基本面分析的关键要素..."
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    消息面分析模板
                  </label>
                  <textarea
                    value={editForm.template?.buyingLogicTemplate?.news || ''}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      template: {
                        ...prev.template!,
                        buyingLogicTemplate: {
                          ...prev.template!.buyingLogicTemplate,
                          news: e.target.value
                        }
                      }
                    }))}
                    placeholder="描述消息面分析的关键要素..."
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 风险管理模板 */}
            <Card>
              <CardHeader>
                <CardTitle>风险管理模板</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      建议止损比例 (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={(editForm.template?.riskManagementTemplate?.stopLossRatio || 0) * 100}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        template: {
                          ...prev.template!,
                          riskManagementTemplate: {
                            ...prev.template!.riskManagementTemplate,
                            stopLossRatio: parseFloat(e.target.value) / 100 || 0
                          }
                        }
                      }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      建议止盈比例 (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={(editForm.template?.riskManagementTemplate?.takeProfitRatio || 0) * 100}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        template: {
                          ...prev.template!,
                          riskManagementTemplate: {
                            ...prev.template!.riskManagementTemplate,
                            takeProfitRatio: parseFloat(e.target.value) / 100 || 0
                          }
                        }
                      }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      推荐交易情绪
                    </label>
                    <select
                      value={editForm.template?.recommendedEmotion || TradingEmotion.CALM}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        template: {
                          ...prev.template!,
                          recommendedEmotion: e.target.value as TradingEmotion
                        }
                      }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={TradingEmotion.CALM}>冷静分析</option>
                      <option value={TradingEmotion.CONFIDENT}>自信</option>
                      <option value={TradingEmotion.UNCERTAIN}>不确定</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      推荐信息源
                    </label>
                    <select
                      value={editForm.template?.recommendedSource || InformationSource.SELF_ANALYSIS}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        template: {
                          ...prev.template!,
                          recommendedSource: e.target.value as InformationSource
                        }
                      }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={InformationSource.SELF_ANALYSIS}>自己分析</option>
                      <option value={InformationSource.PROFESSIONAL_REPORT}>专业报告</option>
                      <option value={InformationSource.TECHNICAL_SIGNAL}>技术信号</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 操作按钮 */}
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleCancel}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                保存剧本
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">剧本管理</h1>
            <p className="text-gray-600">管理您的交易剧本库，固化成功的交易模式</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleCreate}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              创建剧本
            </button>
            <button
              onClick={onBack}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回仪表盘
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {/* 系统预设剧本 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2 text-green-500" />
              系统预设剧本 ({systemPlaybooks.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {systemPlaybooks.map((playbook) => (
                <PlaybookCard
                  key={playbook.id}
                  playbook={playbook}
                  onEdit={() => handleEdit(playbook)}
                  onCopy={() => handleCopy(playbook)}
                  onDelete={null} // 系统剧本不能删除
                  getPerformanceColor={getPerformanceColor}
                />
              ))}
            </div>
          </div>

          {/* 用户自定义剧本 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-500" />
              我的剧本 ({userPlaybooks.length})
            </h2>
            {userPlaybooks.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">暂无自定义剧本</p>
                  <p className="text-sm text-gray-400 mb-4">
                    创建您的第一个剧本，或从成功的交易中保存剧本
                  </p>
                  <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    创建剧本
                  </button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userPlaybooks.map((playbook) => (
                  <PlaybookCard
                    key={playbook.id}
                    playbook={playbook}
                    onEdit={() => handleEdit(playbook)}
                    onCopy={() => handleCopy(playbook)}
                    onDelete={() => onDeletePlaybook(playbook.id)}
                    getPerformanceColor={getPerformanceColor}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 剧本卡片组件
function PlaybookCard({ 
  playbook, 
  onEdit, 
  onCopy, 
  onDelete, 
  getPerformanceColor 
}: {
  playbook: TradingPlaybook;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: (() => void) | null;
  getPerformanceColor: (value: number, type: 'winRate' | 'pnl') => string;
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2 flex items-center">
              {playbook.name}
              {playbook.isSystemDefault && (
                <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  系统
                </span>
              )}
            </CardTitle>
            <p className="text-sm text-gray-600 line-clamp-2">{playbook.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 表现统计 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">胜率</p>
            <p className={`text-lg font-bold ${getPerformanceColor(playbook.performance.winRate, 'winRate')}`}>
              {(playbook.performance.winRate * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">平均收益</p>
            <p className={`text-lg font-bold ${getPerformanceColor(playbook.performance.avgPnLPercent, 'pnl')}`}>
              {playbook.performance.avgPnLPercent >= 0 ? '+' : ''}{playbook.performance.avgPnLPercent.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* 标签 */}
        {playbook.tags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {playbook.tags.slice(0, 3).map((tag, index) => (
                <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                  {tag}
                </span>
              ))}
              {playbook.tags.length > 3 && (
                <span className="text-xs text-gray-500">+{playbook.tags.length - 3}</span>
              )}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={onEdit}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="编辑"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onCopy}
              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="复制"
            >
              <Copy className="w-4 h-4" />
            </button>
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="text-xs text-gray-500 flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            {playbook.performance.totalTrades}笔交易
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
