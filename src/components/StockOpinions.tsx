// 【知行交易】股票观点追踪组件
// 支持记录和管理各种来源的股票观点

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Input, Textarea, Select, Button } from '@/components/ui';
import { StockOpinion } from '@/types';
import {
  Plus,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  User,
  Tag,
  Target,
  Shield,
  Clock,
  Star,
  Edit3,
  Trash2
} from 'lucide-react';

interface StockOpinionsProps {
  stockId: string;
  opinions: StockOpinion[];
  onAddOpinion: (opinion: Omit<StockOpinion, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateOpinion: (id: string, opinion: Partial<StockOpinion>) => void;
  onDeleteOpinion: (id: string) => void;
}

export function StockOpinions({
  stockId,
  opinions,
  onAddOpinion,
  onUpdateOpinion,
  onDeleteOpinion
}: StockOpinionsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOpinion, setEditingOpinion] = useState<StockOpinion | null>(null);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'bearish': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'neutral': return <Minus className="w-4 h-4 text-gray-600" />;
      default: return null;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return 'text-green-600 bg-green-50 border-green-200';
      case 'bearish': return 'text-red-600 bg-red-50 border-red-200';
      case 'neutral': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceStars = (confidence: number) => {
    return Array.from({ length: 10 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          i < confidence ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-4">
      {/* 添加观点按钮 */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">观点追踪</h3>
        <Button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>添加观点</span>
        </Button>
      </div>

      {/* 观点列表 */}
      <div className="space-y-4">
        {opinions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">暂无观点记录</p>
              <Button
                onClick={() => setShowAddForm(true)}
                variant="ghost"
                className="text-primary"
              >
                添加第一个观点
              </Button>
            </CardContent>
          </Card>
        ) : (
          opinions.map((opinion) => (
            <Card key={opinion.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getSentimentIcon(opinion.sentiment)}
                      <span className={`px-2 py-1 rounded-full text-xs border ${getSentimentColor(opinion.sentiment)}`}>
                        {opinion.sentiment === 'bullish' ? '看涨' : 
                         opinion.sentiment === 'bearish' ? '看跌' : '中性'}
                      </span>
                      <span className="text-sm text-gray-500">
                        来源: {opinion.source}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{opinion.title}</CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{opinion.author}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{opinion.createdAt.toLocaleDateString()}</span>
                      </div>
                      {opinion.timeframe && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{opinion.timeframe}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => setEditingOpinion(opinion)}
                      variant="ghost"
                      size="sm"
                      className="p-2"
                      title="编辑"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => onDeleteOpinion(opinion.id)}
                      variant="ghost"
                      size="sm"
                      className="p-2 text-danger hover:text-danger-dark"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">{opinion.content}</p>
                
                {/* 价格预期 */}
                {(opinion.targetPrice || opinion.stopLoss) && (
                  <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                    {opinion.targetPrice && (
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-green-600" />
                        <span className="text-sm">目标价: ${opinion.targetPrice}</span>
                      </div>
                    )}
                    {opinion.stopLoss && (
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-red-600" />
                        <span className="text-sm">止损价: ${opinion.stopLoss}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 技术面分析 */}
                {opinion.technicalAnalysis && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">技术面分析</h4>
                    <p className="text-sm text-blue-800 mb-2">{opinion.technicalAnalysis.trend}</p>
                    {opinion.technicalAnalysis.support.length > 0 && (
                      <p className="text-sm text-blue-700">
                        支撑位: {opinion.technicalAnalysis.support.join(', ')}
                      </p>
                    )}
                    {opinion.technicalAnalysis.resistance.length > 0 && (
                      <p className="text-sm text-blue-700">
                        阻力位: {opinion.technicalAnalysis.resistance.join(', ')}
                      </p>
                    )}
                  </div>
                )}

                {/* 基本面分析 */}
                {opinion.fundamentalAnalysis && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">基本面分析</h4>
                    <p className="text-sm text-green-800 mb-2">{opinion.fundamentalAnalysis.valuation}</p>
                    <p className="text-sm text-green-800">{opinion.fundamentalAnalysis.growth}</p>
                  </div>
                )}

                {/* 标签和信心度 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {opinion.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm text-gray-600">信心度:</span>
                    <div className="flex space-x-1">
                      {getConfidenceStars(opinion.confidence)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 添加/编辑观点表单 */}
      {(showAddForm || editingOpinion) && (
        <OpinionForm
          stockId={stockId}
          opinion={editingOpinion}
          onSave={(opinionData) => {
            if (editingOpinion) {
              onUpdateOpinion(editingOpinion.id, opinionData);
              setEditingOpinion(null);
            } else {
              onAddOpinion(opinionData);
              setShowAddForm(false);
            }
          }}
          onCancel={() => {
            setShowAddForm(false);
            setEditingOpinion(null);
          }}
        />
      )}
    </div>
  );
}

// 观点表单组件
function OpinionForm({
  stockId,
  opinion,
  onSave,
  onCancel
}: {
  stockId: string;
  opinion?: StockOpinion | null;
  onSave: (opinion: Omit<StockOpinion, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    stockId,
    source: opinion?.source || '',
    author: opinion?.author || '',
    type: opinion?.type || 'mixed' as const,
    title: opinion?.title || '',
    content: opinion?.content || '',
    sentiment: opinion?.sentiment || 'neutral' as const,
    targetPrice: opinion?.targetPrice || '',
    stopLoss: opinion?.stopLoss || '',
    timeframe: opinion?.timeframe || '',
    tags: opinion?.tags?.join(', ') || '',
    confidence: opinion?.confidence || 5,
    isActive: opinion?.isActive ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const opinionData = {
      ...formData,
      targetPrice: formData.targetPrice ? Number(formData.targetPrice) : undefined,
      stopLoss: formData.stopLoss ? Number(formData.stopLoss) : undefined,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    };

    onSave(opinionData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {opinion ? '编辑观点' : '添加观点'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 基础信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                观点来源
              </label>
              <Input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({...formData, source: e.target.value})}
                placeholder="如：MVP公众号、微信读书、某某大佬"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                作者/分析师
              </label>
              <Input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData({...formData, author: e.target.value})}
                placeholder="分析师姓名"
                required
              />
            </div>
          </div>

          {/* 观点标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              观点标题
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="简要描述这个观点"
              required
            />
          </div>

          {/* 观点内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              详细内容
            </label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              rows={4}
              placeholder="详细的观点分析内容..."
              required
            />
          </div>

          {/* 观点类型和情绪 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                观点类型
              </label>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as any})}
              >
                <option value="technical">技术面</option>
                <option value="fundamental">基本面</option>
                <option value="mixed">综合分析</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                观点倾向
              </label>
              <Select
                value={formData.sentiment}
                onChange={(e) => setFormData({...formData, sentiment: e.target.value as any})}
              >
                <option value="bullish">看涨</option>
                <option value="bearish">看跌</option>
                <option value="neutral">中性</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                时间框架
              </label>
              <Input
                type="text"
                value={formData.timeframe}
                onChange={(e) => setFormData({...formData, timeframe: e.target.value})}
                placeholder="如：短期、中期、长期"
              />
            </div>
          </div>

          {/* 价格预期 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                目标价
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.targetPrice}
                onChange={(e) => setFormData({...formData, targetPrice: e.target.value})}
                placeholder="目标价格"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                止损价
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.stopLoss}
                onChange={(e) => setFormData({...formData, stopLoss: e.target.value})}
                placeholder="止损价格"
              />
            </div>
          </div>

          {/* 标签和信心度 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                标签 (用逗号分隔)
              </label>
              <Input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                placeholder="如：金叉, 突破, 财报"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                信心度 (1-10)
              </label>
              <Input
                type="range"
                min="1"
                max="10"
                value={formData.confidence}
                onChange={(e) => setFormData({...formData, confidence: Number(e.target.value)})}
              />
              <div className="text-center text-sm text-gray-600 mt-1">
                {formData.confidence}/10
              </div>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
            >
              取消
            </Button>
            <Button
              type="submit"
            >
              {opinion ? '更新' : '添加'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
