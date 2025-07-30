// 【知行交易】专家意见管理
// 大佬意见收集、展示和管理功能

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Expert, ExpertOpinion, Stock, PriceGuidance, PriceGuidanceType } from '@/types';
import {
  User,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  StarOff,
  Calendar,
  Tag,
  Link,
  Image,
  Plus,
  Edit3,
  Trash2,
  Filter,
  Search,
  BookmarkPlus,
  ExternalLink,
  Target,
  Shield,
  DollarSign,
  Clock,
  Award,
  AlertTriangle
} from 'lucide-react';

interface ExpertOpinionsProps {
  stock: Stock;
  experts?: Expert[];
  opinions?: ExpertOpinion[];
  onAddOpinion: (opinion: Omit<ExpertOpinion, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateOpinion: (id: string, opinion: Partial<ExpertOpinion>) => void;
  onDeleteOpinion: (id: string) => void;
}
// 意见卡片组件
function OpinionCard({
  opinion,
  expert,
  onToggleBookmark,
  onEdit,
  onDelete
}: {
  opinion: ExpertOpinion;
  expert?: Expert;
  onToggleBookmark: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'bearish': return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'neutral': return <Minus className="w-4 h-4 text-gray-500" />;
      default: return null;
    }
  };

  const getSentimentLabel = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return '看多';
      case 'bearish': return '看空';
      case 'neutral': return '中性';
      default: return sentiment;
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

  const getPriceGuidanceIcon = (type: PriceGuidanceType) => {
    switch (type) {
      case PriceGuidanceType.BUY_POINT: return <TrendingUp className="w-3 h-3 text-green-500" />;
      case PriceGuidanceType.SELL_POINT: return <TrendingDown className="w-3 h-3 text-red-500" />;
      case PriceGuidanceType.STOP_LOSS: return <Shield className="w-3 h-3 text-red-500" />;
      case PriceGuidanceType.TAKE_PROFIT: return <Target className="w-3 h-3 text-green-500" />;
      case PriceGuidanceType.SUPPORT_LEVEL: return <TrendingUp className="w-3 h-3 text-blue-500" />;
      case PriceGuidanceType.RESISTANCE_LEVEL: return <TrendingDown className="w-3 h-3 text-orange-500" />;
      case PriceGuidanceType.TARGET_PRICE: return <DollarSign className="w-3 h-3 text-purple-500" />;
      default: return <DollarSign className="w-3 h-3 text-gray-500" />;
    }
  };

  const getPriceGuidanceLabel = (type: PriceGuidanceType) => {
    switch (type) {
      case PriceGuidanceType.BUY_POINT: return '买入点';
      case PriceGuidanceType.SELL_POINT: return '卖出点';
      case PriceGuidanceType.STOP_LOSS: return '止损位';
      case PriceGuidanceType.TAKE_PROFIT: return '止盈位';
      case PriceGuidanceType.SUPPORT_LEVEL: return '支撑位';
      case PriceGuidanceType.RESISTANCE_LEVEL: return '阻力位';
      case PriceGuidanceType.TARGET_PRICE: return '目标价';
      default: return '价格指导';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          {/* 左侧：专家信息和标题 */}
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              {expert && (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{expert.name}</p>
                    {expert.title && (
                      <p className="text-xs text-gray-500">{expert.title}</p>
                    )}
                  </div>
                  {expert.isVerified && (
                    <Award className="w-4 h-4 text-blue-500" />
                  )}
                </div>
              )}

              {/* 情绪标签 */}
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full border text-xs ${getSentimentColor(opinion.sentiment)}`}>
                {getSentimentIcon(opinion.sentiment)}
                <span>{getSentimentLabel(opinion.sentiment)}</span>
              </div>

              {/* 优先级标签 */}
              <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(opinion.priority)}`}>
                {opinion.priority === 'high' ? '重要' : opinion.priority === 'medium' ? '一般' : '参考'}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">{opinion.title}</h3>
          </div>

          {/* 右侧：操作按钮 */}
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={onToggleBookmark}
              className={`p-2 rounded-lg transition-colors ${
                opinion.isBookmarked
                  ? 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                  : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
              }`}
              title={opinion.isBookmarked ? '取消收藏' : '收藏'}
            >
              {opinion.isBookmarked ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
            </button>
            <button
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="编辑"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 意见内容 */}
        <div className="mb-4">
          <p className="text-gray-700 leading-relaxed">{opinion.content}</p>
        </div>

        {/* 价格指导 */}
        {opinion.priceGuidances.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
              <Target className="w-4 h-4 mr-1 text-blue-500" />
              价格指导
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {opinion.priceGuidances.map((guidance, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    {getPriceGuidanceIcon(guidance.type)}
                    <span className="text-sm text-gray-700">{getPriceGuidanceLabel(guidance.type)}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">${guidance.price}</p>
                    <p className={`text-xs ${
                      guidance.confidence === 'high' ? 'text-green-600' :
                      guidance.confidence === 'medium' ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {guidance.confidence === 'high' ? '高信心' :
                       guidance.confidence === 'medium' ? '中信心' : '低信心'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* K线图截图 */}
        {opinion.chartImages.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
              <Image className="w-4 h-4 mr-1 text-green-500" />
              K线图分析
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {opinion.chartImages.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`K线图 ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                />
              ))}
            </div>
          </div>
        )}

        {/* 标签 */}
        {opinion.tags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {opinion.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 底部信息 */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{opinion.publishedAt.toLocaleDateString()}</span>
            </div>
            {opinion.source && (
              <div className="flex items-center space-x-1">
                <Link className="w-4 h-4" />
                <span>{opinion.source}</span>
              </div>
            )}
          </div>

          {opinion.sourceUrl && (
            <a
              href={opinion.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
            >
              <span>查看原文</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* 用户备注 */}
        {opinion.userNotes && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>我的备注：</strong>{opinion.userNotes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
