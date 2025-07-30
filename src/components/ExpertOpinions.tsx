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

export function ExpertOpinions({
  stock,
  experts = [], // 现在从数据库加载
  opinions = [], // 现在从数据库加载
  onAddOpinion,
  onUpdateOpinion,
  onDeleteOpinion
}: ExpertOpinionsProps) {
  const [selectedSentiment, setSelectedSentiment] = useState<string>('');
  const [selectedExpert, setSelectedExpert] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [, setShowAddForm] = useState(false);
  const [, setEditingOpinion] = useState<ExpertOpinion | null>(null);

  // 筛选意见
  const filteredOpinions = useMemo(() => {
    return opinions.filter(opinion => {
      const matchesSearch = !searchTerm || 
        opinion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opinion.content.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSentiment = !selectedSentiment || opinion.sentiment === selectedSentiment;
      const matchesExpert = !selectedExpert || opinion.expertId === selectedExpert;
      
      return matchesSearch && matchesSentiment && matchesExpert && opinion.isActive;
    }).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [opinions, searchTerm, selectedSentiment, selectedExpert]);

  // 统计数据
  const stats = useMemo(() => {
    const total = opinions.filter(op => op.isActive).length;
    const bullish = opinions.filter(op => op.isActive && op.sentiment === 'bullish').length;
    const bearish = opinions.filter(op => op.isActive && op.sentiment === 'bearish').length;
    const neutral = opinions.filter(op => op.isActive && op.sentiment === 'neutral').length;
    const bookmarked = opinions.filter(op => op.isActive && op.isBookmarked).length;

    return { total, bullish, bearish, neutral, bookmarked };
  }, [opinions]);
  const getExpertById = (expertId: string) => {
    return experts.find(expert => expert.id === expertId);
  };

  const handleToggleBookmark = (opinion: ExpertOpinion) => {
    onUpdateOpinion(opinion.id, { isBookmarked: !opinion.isBookmarked });
  };

  const handleEditOpinion = (opinion: ExpertOpinion) => {
    setEditingOpinion(opinion);
    setShowAddForm(true);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和统计 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <MessageSquare className="w-6 h-6 mr-2 text-blue-500" />
            专家意见
          </h2>
          <p className="text-gray-600 mt-1">
            收集 {stock.symbol} - {stock.name} 的专家分析意见
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          添加意见
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-600">总意见数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.bullish}</p>
            <p className="text-sm text-gray-600">看多</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.bearish}</p>
            <p className="text-sm text-gray-600">看空</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{stats.neutral}</p>
            <p className="text-sm text-gray-600">中性</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.bookmarked}</p>
            <p className="text-sm text-gray-600">已收藏</p>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2 text-gray-500" />
            筛选意见
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="搜索意见内容..."
              />
            </div>

            {/* 情绪筛选 */}
            <select
              value={selectedSentiment}
              onChange={(e) => setSelectedSentiment(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">所有情绪</option>
              <option value="bullish">看多</option>
              <option value="bearish">看空</option>
              <option value="neutral">中性</option>
            </select>

            {/* 专家筛选 */}
            <select
              value={selectedExpert}
              onChange={(e) => setSelectedExpert(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">所有专家</option>
              {experts.map(expert => (
                <option key={expert.id} value={expert.id}>{expert.name}</option>
              ))}
            </select>

            {/* 清除筛选 */}
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedSentiment('');
                setSelectedExpert('');
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              清除筛选
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 意见列表 */}
      <div className="space-y-4">
        {filteredOpinions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">暂无专家意见</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="text-blue-600 hover:text-blue-700"
              >
                添加第一个专家意见
              </button>
            </CardContent>
          </Card>
        ) : (
          filteredOpinions.map(opinion => (
            <OpinionCard
              key={opinion.id}
              opinion={opinion}
              expert={getExpertById(opinion.expertId)}
              onToggleBookmark={() => handleToggleBookmark(opinion)}
              onEdit={() => handleEditOpinion(opinion)}
              onDelete={() => onDeleteOpinion(opinion.id)}
            />
          ))
        )}
      </div>
    </div>
  );
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
