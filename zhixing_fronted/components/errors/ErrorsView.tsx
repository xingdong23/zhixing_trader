'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Target, TrendingUp, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

// 错误类型
const errorCategories = [
  { id: 'entry', name: '入场时机', icon: '🎯', color: 'bg-blue-100 text-blue-700' },
  { id: 'exit', name: '出场时机', icon: '🚪', color: 'bg-purple-100 text-purple-700' },
  { id: 'position', name: '仓位管理', icon: '📊', color: 'bg-green-100 text-green-700' },
  { id: 'risk', name: '风险控制', icon: '⚠️', color: 'bg-red-100 text-red-700' },
  { id: 'strategy', name: '策略执行', icon: '📋', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'emotion', name: '情绪控制', icon: '😤', color: 'bg-orange-100 text-orange-700' },
];

// 常见错误
const commonErrors = [
  {
    id: 1,
    category: 'entry',
    error: '追高买入',
    frequency: 12,
    cost: -2400,
    solution: '等待回调至支撑位再入场',
    status: 'improving'
  },
  {
    id: 2,
    category: 'exit',
    error: '提前止盈',
    frequency: 8,
    cost: -1800,
    solution: '设置移动止盈,给足利润空间',
    status: 'recurring'
  },
  {
    id: 3,
    category: 'risk',
    error: '止损设置过宽',
    frequency: 5,
    cost: -3200,
    solution: '严格按照ATR的1.5倍设置止损',
    status: 'resolved'
  },
  {
    id: 4,
    category: 'emotion',
    error: '报复性交易',
    frequency: 3,
    cost: -1200,
    solution: '设置每日最大亏损限额,达到后停止交易',
    status: 'recurring'
  },
];

export default function ErrorsView() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newError, setNewError] = useState({
    category: 'entry',
    error: '',
    cost: '',
    solution: ''
  });

  // 筛选错误
  const filteredErrors = selectedCategory === 'all'
    ? commonErrors
    : commonErrors.filter(e => e.category === selectedCategory);

  // 计算统计
  const totalErrors = commonErrors.reduce((sum, e) => sum + e.frequency, 0);
  const totalCost = commonErrors.reduce((sum, e) => sum + e.cost, 0);
  const resolvedCount = commonErrors.filter(e => e.status === 'resolved').length;
  const improvingCount = commonErrors.filter(e => e.status === 'improving').length;

  // 保存新错误
  const saveNewError = () => {
    if (!newError.error || !newError.solution) {
      toast.error('请填写错误描述和改进措施');
      return;
    }

    const errors = JSON.parse(localStorage.getItem('trading_errors') || '[]');
    errors.unshift({
      ...newError,
      id: Date.now(),
      frequency: 1,
      status: 'new',
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('trading_errors', JSON.stringify(errors));
    toast.success('✅ 错误记录已保存');
    
    // 重置表单
    setNewError({
      category: 'entry',
      error: '',
      cost: '',
      solution: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">错误分析</h2>
          <p className="text-gray-500 mt-1">识别和改进交易中的常见错误</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{totalErrors}</p>
              <p className="text-sm text-gray-500 mt-1">总错误次数</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">${Math.abs(totalCost).toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">错误成本</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{resolvedCount}</p>
              <p className="text-sm text-gray-500 mt-1">已解决</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{improvingCount}</p>
              <p className="text-sm text-gray-500 mt-1">改进中</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧 - 错误列表 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 分类筛选 */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              全部
            </Button>
            {errorCategories.map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.icon} {cat.name}
              </Button>
            ))}
          </div>

          {/* 错误列表 */}
          <div className="space-y-3">
            {filteredErrors.map(error => {
              const category = errorCategories.find(c => c.id === error.category);
              return (
                <Card key={error.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={category?.color}>
                            {category?.icon} {category?.name}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              error.status === 'resolved'
                                ? 'bg-green-100 text-green-700'
                                : error.status === 'improving'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-red-100 text-red-700'
                            }
                          >
                            {error.status === 'resolved' ? '✅ 已解决' : error.status === 'improving' ? '🔄 改进中' : '⚠️ 反复出现'}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-lg mb-2">{error.error}</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-gray-500">出现次数:</span>
                            <span className="font-semibold ml-2">{error.frequency} 次</span>
                          </div>
                          <div>
                            <span className="text-gray-500">造成损失:</span>
                            <span className="font-semibold ml-2 text-red-600">${Math.abs(error.cost).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">💡 改进措施: </span>
                            {error.solution}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 右侧 - 添加新错误 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">记录新错误</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">错误类型</label>
                <Select
                  value={newError.category}
                  onValueChange={(value) => setNewError({ ...newError, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {errorCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">错误描述</label>
                <Textarea
                  value={newError.error}
                  onChange={(e) => setNewError({ ...newError, error: e.target.value })}
                  placeholder="描述具体的错误..."
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">造成损失 ($)</label>
                <input
                  type="number"
                  value={newError.cost}
                  onChange={(e) => setNewError({ ...newError, cost: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">改进措施</label>
                <Textarea
                  value={newError.solution}
                  onChange={(e) => setNewError({ ...newError, solution: e.target.value })}
                  placeholder="如何避免这个错误?..."
                  rows={3}
                />
              </div>

              <Button onClick={saveNewError} className="w-full">
                保存错误记录
              </Button>
            </CardContent>
          </Card>

          {/* 改进进度 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">改进进度</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>已解决</span>
                    <span className="font-semibold">{resolvedCount}/{commonErrors.length}</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${(resolvedCount / commonErrors.length) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>改进中</span>
                    <span className="font-semibold">{improvingCount}/{commonErrors.length}</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${(improvingCount / commonErrors.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

