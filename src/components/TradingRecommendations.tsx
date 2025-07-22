// 【知行交易】操作建议模块
// 显示每日/每周操作建议，包括买入价、止损价、止盈价等

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TradingRecommendation } from '@/types';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  BarChart3,
  Star,
  Filter,
  Plus
} from 'lucide-react';

interface TradingRecommendationsProps {
  recommendations: TradingRecommendation[];
  onAddRecommendation: (recommendation: Omit<TradingRecommendation, 'id' | 'publishedAt'>) => void;
  onUpdateRecommendation: (id: string, updates: Partial<TradingRecommendation>) => void;
  onDeleteRecommendation: (id: string) => void;
}

export function TradingRecommendations({
  recommendations,
  onAddRecommendation,
  onUpdateRecommendation,
  onDeleteRecommendation
}: TradingRecommendationsProps) {
  const [currentTab, setCurrentTab] = useState<'daily' | 'weekly'>('daily');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // 筛选建议
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(rec => {
      const matchesType = rec.type === currentTab;
      const matchesStatus = statusFilter === 'all' || rec.status === statusFilter;
      return matchesType && matchesStatus;
    });
  }, [recommendations, currentTab, statusFilter]);

  // 统计数据
  const stats = useMemo(() => {
    const filtered = filteredRecommendations;
    return {
      total: filtered.length,
      active: filtered.filter(r => r.status === 'active').length,
      executed: filtered.filter(r => r.status === 'executed').length,
      avgConfidence: filtered.length > 0 
        ? filtered.reduce((sum, r) => sum + r.confidence, 0) / filtered.length 
        : 0
    };
  }, [filteredRecommendations]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'sell': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'hold': return <Minus className="w-4 h-4 text-gray-600" />;
      default: return null;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'buy': return 'text-green-600 bg-green-50 border-green-200';
      case 'sell': return 'text-red-600 bg-red-50 border-red-200';
      case 'hold': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'executed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'expired': return <XCircle className="w-4 h-4 text-gray-600" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题和统计 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">操作建议</h2>
          <p className="text-gray-600 mt-1">专业的买卖建议和风险管理</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>添加建议</span>
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总建议数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">活跃建议</p>
                <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">已执行</p>
                <p className="text-2xl font-bold text-green-600">{stats.executed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">平均信心度</p>
                <p className="text-2xl font-bold text-purple-600">{stats.avgConfidence.toFixed(1)}</p>
              </div>
              <Star className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选和标签页 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              <button
                onClick={() => setCurrentTab('daily')}
                className={`px-4 py-2 text-sm rounded border transition-colors ${
                  currentTab === 'daily'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                每日建议
              </button>
              <button
                onClick={() => setCurrentTab('weekly')}
                className={`px-4 py-2 text-sm rounded border transition-colors ${
                  currentTab === 'weekly'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                每周建议
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">全部状态</option>
                <option value="active">活跃</option>
                <option value="executed">已执行</option>
                <option value="expired">已过期</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRecommendations.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">暂无{currentTab === 'daily' ? '每日' : '每周'}建议</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  添加第一个建议
                </button>
              </div>
            ) : (
              filteredRecommendations.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  onUpdate={(updates) => onUpdateRecommendation(recommendation.id, updates)}
                  onDelete={() => onDeleteRecommendation(recommendation.id)}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 添加建议表单 */}
      {showAddForm && (
        <RecommendationForm
          type={currentTab}
          onSave={(recommendationData) => {
            onAddRecommendation(recommendationData);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}

// 建议卡片组件
function RecommendationCard({
  recommendation,
  onUpdate,
  onDelete
}: {
  recommendation: TradingRecommendation;
  onUpdate: (updates: Partial<TradingRecommendation>) => void;
  onDelete: () => void;
}) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'sell': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'hold': return <Minus className="w-4 h-4 text-gray-600" />;
      default: return null;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'buy': return 'text-green-600 bg-green-50 border-green-200';
      case 'sell': return 'text-red-600 bg-red-50 border-red-200';
      case 'hold': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'executed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'expired': return <XCircle className="w-4 h-4 text-gray-600" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {getActionIcon(recommendation.action)}
              <span className={`px-2 py-1 rounded-full text-xs border ${getActionColor(recommendation.action)}`}>
                {recommendation.action === 'buy' ? '买入' : 
                 recommendation.action === 'sell' ? '卖出' : '持有'}
              </span>
              {getStatusIcon(recommendation.status)}
              <span className={`px-2 py-1 rounded-full text-xs ${getRiskColor(recommendation.riskLevel)}`}>
                {recommendation.riskLevel === 'low' ? '低风险' :
                 recommendation.riskLevel === 'medium' ? '中风险' : '高风险'}
              </span>
            </div>
            <CardTitle className="text-lg">
              {recommendation.stockName} ({recommendation.stockSymbol})
            </CardTitle>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{recommendation.publishedAt.toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{recommendation.timeframe}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4" />
                <span>信心度: {recommendation.confidence}/10</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 mb-4">{recommendation.reason}</p>
        
        {/* 价格信息 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-600">当前价格</p>
            <p className="font-semibold">${recommendation.currentPrice}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">建议{recommendation.action === 'buy' ? '买入' : '卖出'}价</p>
            <p className="font-semibold text-blue-600">${recommendation.entryPrice}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">止损价</p>
            <p className="font-semibold text-red-600">${recommendation.stopLoss}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">止盈价</p>
            <p className="font-semibold text-green-600">
              ${recommendation.takeProfit.join(', $')}
            </p>
          </div>
        </div>

        {/* 技术分析 */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">技术分析</h4>
          <p className="text-sm text-blue-800">{recommendation.technicalAnalysis}</p>
        </div>

        {/* 仓位管理 */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">建议仓位: {recommendation.positionSize}</span>
          <span className="text-gray-600">
            过期时间: {recommendation.expiresAt.toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// 建议表单组件（简化版，完整版需要更多字段）
function RecommendationForm({
  type,
  onSave,
  onCancel
}: {
  type: 'daily' | 'weekly';
  onSave: (recommendation: Omit<TradingRecommendation, 'id' | 'publishedAt'>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    stockSymbol: '',
    stockName: '',
    action: 'buy' as const,
    currentPrice: '',
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    reason: '',
    technicalAnalysis: '',
    riskLevel: 'medium' as const,
    positionSize: '',
    timeframe: '',
    confidence: 7,
    expiresAt: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const recommendationData = {
      stockId: `stock_${formData.stockSymbol}`,
      stockSymbol: formData.stockSymbol,
      stockName: formData.stockName,
      type,
      action: formData.action,
      currentPrice: Number(formData.currentPrice),
      entryPrice: Number(formData.entryPrice),
      stopLoss: Number(formData.stopLoss),
      takeProfit: formData.takeProfit.split(',').map(p => Number(p.trim())),
      reason: formData.reason,
      technicalAnalysis: formData.technicalAnalysis,
      riskLevel: formData.riskLevel,
      positionSize: formData.positionSize,
      timeframe: formData.timeframe,
      expiresAt: new Date(formData.expiresAt),
      status: 'active' as const,
      confidence: formData.confidence
    };

    onSave(recommendationData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          添加{type === 'daily' ? '每日' : '每周'}建议
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 股票信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                股票代码
              </label>
              <input
                type="text"
                value={formData.stockSymbol}
                onChange={(e) => setFormData({...formData, stockSymbol: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="如：AAPL"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                股票名称
              </label>
              <input
                type="text"
                value={formData.stockName}
                onChange={(e) => setFormData({...formData, stockName: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="如：苹果公司"
                required
              />
            </div>
          </div>

          {/* 操作和价格 */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                操作类型
              </label>
              <select
                value={formData.action}
                onChange={(e) => setFormData({...formData, action: e.target.value as any})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="buy">买入</option>
                <option value="sell">卖出</option>
                <option value="hold">持有</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                当前价格
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.currentPrice}
                onChange={(e) => setFormData({...formData, currentPrice: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                建议价格
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.entryPrice}
                onChange={(e) => setFormData({...formData, entryPrice: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                止损价
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.stopLoss}
                onChange={(e) => setFormData({...formData, stopLoss: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* 止盈价格 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              止盈价格 (用逗号分隔多个价格)
            </label>
            <input
              type="text"
              value={formData.takeProfit}
              onChange={(e) => setFormData({...formData, takeProfit: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="如：150, 160, 170"
              required
            />
          </div>

          {/* 操作理由 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              操作理由
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="说明操作的理由和依据..."
              required
            />
          </div>

          {/* 技术分析 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              技术分析
            </label>
            <textarea
              value={formData.technicalAnalysis}
              onChange={(e) => setFormData({...formData, technicalAnalysis: e.target.value})}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="技术面分析详情..."
              required
            />
          </div>

          {/* 其他信息 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                风险等级
              </label>
              <select
                value={formData.riskLevel}
                onChange={(e) => setFormData({...formData, riskLevel: e.target.value as any})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">低风险</option>
                <option value="medium">中风险</option>
                <option value="high">高风险</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                建议仓位
              </label>
              <input
                type="text"
                value={formData.positionSize}
                onChange={(e) => setFormData({...formData, positionSize: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="如：10%、轻仓"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                时间框架
              </label>
              <input
                type="text"
                value={formData.timeframe}
                onChange={(e) => setFormData({...formData, timeframe: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="如：1-2周、短期"
                required
              />
            </div>
          </div>

          {/* 信心度和过期时间 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                信心度 (1-10)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.confidence}
                onChange={(e) => setFormData({...formData, confidence: Number(e.target.value)})}
                className="w-full"
              />
              <div className="text-center text-sm text-gray-600 mt-1">
                {formData.confidence}/10
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                过期时间
              </label>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({...formData, expiresAt: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              添加建议
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
