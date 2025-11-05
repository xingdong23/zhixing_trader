'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// 预设检查清单
const preTradeChecklist = [
  { id: 1, text: '市场趋势判断清晰?', category: 'market' },
  { id: 2, text: '入场点位合理?', category: 'entry' },
  { id: 3, text: '止损位置明确?', category: 'risk' },
  { id: 4, text: '止盈目标设定?', category: 'risk' },
  { id: 5, text: '仓位大小合理?', category: 'risk' },
  { id: 6, text: '风险回报比 > 2?', category: 'risk' },
  { id: 7, text: '符合交易策略?', category: 'strategy' },
  { id: 8, text: '有充分的买入理由?', category: 'analysis' },
  { id: 9, text: '情绪状态良好?', category: 'mental' },
  { id: 10, text: '没有冲动交易?', category: 'mental' },
];

const postTradeChecklist = [
  { id: 1, text: '是否按计划执行?', category: 'execution' },
  { id: 2, text: '止损/止盈是否触发?', category: 'execution' },
  { id: 3, text: '交易记录是否完整?', category: 'record' },
  { id: 4, text: '是否总结经验教训?', category: 'learning' },
  { id: 5, text: '情绪控制是否良好?', category: 'mental' },
];

export default function ChecklistView() {
  const [preTradeChecked, setPreTradeChecked] = useState<number[]>([]);
  const [postTradeChecked, setPostTradeChecked] = useState<number[]>([]);
  const [checklistHistory, setChecklistHistory] = useState<any[]>([]);

  // 切换检查项
  const togglePreTrade = (id: number) => {
    setPreTradeChecked(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const togglePostTrade = (id: number) => {
    setPostTradeChecked(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // 计算完成度
  const preTradeProgress = (preTradeChecked.length / preTradeChecklist.length) * 100;
  const postTradeProgress = (postTradeChecked.length / postTradeChecklist.length) * 100;

  // 保存检查清单
  const savePreTradeChecklist = () => {
    const history = {
      type: 'pre',
      timestamp: new Date().toISOString(),
      checked: preTradeChecked,
      total: preTradeChecklist.length,
      passed: preTradeChecked.length === preTradeChecklist.length
    };
    
    if (preTradeChecked.length === preTradeChecklist.length) {
      toast.success('✅ 交易前检查全部通过!');
    } else {
      toast.warning(`⚠️ 还有 ${preTradeChecklist.length - preTradeChecked.length} 项未完成`);
    }
    
    const histories = JSON.parse(localStorage.getItem('checklist_history') || '[]');
    histories.unshift(history);
    localStorage.setItem('checklist_history', JSON.stringify(histories.slice(0, 50)));
  };

  const savePostTradeChecklist = () => {
    const history = {
      type: 'post',
      timestamp: new Date().toISOString(),
      checked: postTradeChecked,
      total: postTradeChecklist.length,
      passed: postTradeChecked.length === postTradeChecklist.length
    };
    
    if (postTradeChecked.length === postTradeChecklist.length) {
      toast.success('✅ 交易后检查全部完成!');
    } else {
      toast.warning(`⚠️ 还有 ${postTradeChecklist.length - postTradeChecked.length} 项未完成`);
    }
    
    const histories = JSON.parse(localStorage.getItem('checklist_history') || '[]');
    histories.unshift(history);
    localStorage.setItem('checklist_history', JSON.stringify(histories.slice(0, 50)));
  };

  // 重置检查清单
  const resetPreTrade = () => {
    setPreTradeChecked([]);
    toast.info('已重置交易前检查清单');
  };

  const resetPostTrade = () => {
    setPostTradeChecked([]);
    toast.info('已重置交易后检查清单');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">检查清单系统</h2>
          <p className="text-gray-500 mt-1">系统化检查,避免情绪化交易</p>
        </div>
      </div>

      <Tabs defaultValue="pre" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pre">交易前检查</TabsTrigger>
          <TabsTrigger value="post">交易后检查</TabsTrigger>
          <TabsTrigger value="history">历史记录</TabsTrigger>
        </TabsList>

        {/* 交易前检查 */}
        <TabsContent value="pre" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>交易前检查清单</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    确保每笔交易都经过系统化评估
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-600">
                    {preTradeProgress.toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {preTradeChecked.length}/{preTradeChecklist.length}
                  </p>
                </div>
              </div>
              <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${preTradeProgress}%` }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 按类别分组 */}
              <div className="space-y-4">
                {['market', 'entry', 'risk', 'strategy', 'analysis', 'mental'].map(category => {
                  const items = preTradeChecklist.filter(item => item.category === category);
                  if (items.length === 0) return null;
                  
                  const categoryNames: Record<string, string> = {
                    market: '📊 市场分析',
                    entry: '🎯 入场点位',
                    risk: '⚠️ 风险管理',
                    strategy: '📋 策略验证',
                    analysis: '🔍 基本面分析',
                    mental: '🧠 心理准备'
                  };

                  return (
                    <div key={category} className="border rounded-lg p-4">
                      <h3 className="text-sm font-semibold mb-3">{categoryNames[category]}</h3>
                      <div className="space-y-3">
                        {items.map(item => (
                          <div key={item.id} className="flex items-start gap-3">
                            <Checkbox
                              id={`pre-${item.id}`}
                              checked={preTradeChecked.includes(item.id)}
                              onCheckedChange={() => togglePreTrade(item.id)}
                              className="mt-1"
                            />
                            <label
                              htmlFor={`pre-${item.id}`}
                              className={`cursor-pointer flex-1 ${
                                preTradeChecked.includes(item.id)
                                  ? 'text-gray-500 line-through'
                                  : ''
                              }`}
                            >
                              {item.text}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={savePreTradeChecklist}
                  className="flex-1"
                  disabled={preTradeChecked.length === 0}
                >
                  保存检查结果
                </Button>
                <Button variant="outline" onClick={resetPreTrade}>
                  重置
                </Button>
              </div>

              {/* 警告提示 */}
              {preTradeChecked.length < preTradeChecklist.length && preTradeChecked.length > 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">
                        还有 {preTradeChecklist.length - preTradeChecked.length} 项未完成
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        建议完成所有检查项后再执行交易
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {preTradeProgress === 100 && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">
                        所有检查项已完成! ✅
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        可以开始执行交易计划了
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 交易后检查 */}
        <TabsContent value="post" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>交易后检查清单</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    复盘和总结,持续改进
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-600">
                    {postTradeProgress.toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {postTradeChecked.length}/{postTradeChecklist.length}
                  </p>
                </div>
              </div>
              <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 transition-all duration-300"
                  style={{ width: `${postTradeProgress}%` }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {postTradeChecklist.map(item => (
                <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900">
                  <Checkbox
                    id={`post-${item.id}`}
                    checked={postTradeChecked.includes(item.id)}
                    onCheckedChange={() => togglePostTrade(item.id)}
                    className="mt-1"
                  />
                  <label
                    htmlFor={`post-${item.id}`}
                    className={`cursor-pointer flex-1 ${
                      postTradeChecked.includes(item.id)
                        ? 'text-gray-500 line-through'
                        : ''
                    }`}
                  >
                    {item.text}
                  </label>
                </div>
              ))}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={savePostTradeChecklist}
                  className="flex-1"
                  disabled={postTradeChecked.length === 0}
                >
                  保存检查结果
                </Button>
                <Button variant="outline" onClick={resetPostTrade}>
                  重置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 历史记录 */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>检查清单统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">暂无历史记录</p>
                <p className="text-sm">完成检查清单后会在这里显示统计数据</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

