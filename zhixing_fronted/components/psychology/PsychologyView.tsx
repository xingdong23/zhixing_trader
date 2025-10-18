'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Brain, Heart, AlertCircle, TrendingUp, Smile, Frown, Meh } from 'lucide-react';
import { toast } from 'sonner';

// 情绪类型
const emotions = [
  { value: 'confident', label: '自信', icon: '😊', color: 'bg-green-100 text-green-700' },
  { value: 'anxious', label: '焦虑', icon: '😰', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'fearful', label: '恐惧', icon: '😱', color: 'bg-red-100 text-red-700' },
  { value: 'greedy', label: '贪婪', icon: '🤑', color: 'bg-purple-100 text-purple-700' },
  { value: 'frustrated', label: '沮丧', icon: '😤', color: 'bg-orange-100 text-orange-700' },
  { value: 'calm', label: '平静', icon: '😌', color: 'bg-blue-100 text-blue-700' },
];

// 心理模式
const psychologyPatterns = [
  {
    id: 1,
    name: '追涨杀跌',
    description: 'FOMO驱动,容易在高位买入,低位卖出',
    frequency: 'high',
    impact: 'negative',
    suggestion: '设置明确的入场规则,避免冲动交易'
  },
  {
    id: 2,
    name: '过度自信',
    description: '连续盈利后增加仓位和风险',
    frequency: 'medium',
    impact: 'negative',
    suggestion: '坚持固定仓位管理,不因短期成功而改变'
  },
  {
    id: 3,
    name: '报复性交易',
    description: '亏损后急于扳回,频繁交易',
    frequency: 'low',
    impact: 'negative',
    suggestion: '设置每日最大亏损限制,亏损后休息一天'
  },
];

export default function PsychologyView() {
  const [emotionLog, setEmotionLog] = useState({
    emotion: 'calm',
    intensity: 5,
    trigger: '',
    context: '',
    timestamp: new Date().toISOString()
  });

  // 保存情绪记录
  const saveEmotionLog = () => {
    const logs = JSON.parse(localStorage.getItem('emotion_logs') || '[]');
    logs.unshift({
      ...emotionLog,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('emotion_logs', JSON.stringify(logs.slice(0, 100)));
    toast.success('✅ 情绪记录已保存');
    
    // 重置表单
    setEmotionLog({
      emotion: 'calm',
      intensity: 5,
      trigger: '',
      context: '',
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">心理分析</h2>
          <p className="text-gray-500 mt-1">追踪情绪和心理状态,提高交易纪律性</p>
        </div>
      </div>

      {/* 情绪追踪 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              情绪追踪
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">当前情绪</label>
              <div className="grid grid-cols-3 gap-2">
                {emotions.map(emotion => (
                  <Button
                    key={emotion.value}
                    variant={emotionLog.emotion === emotion.value ? 'default' : 'outline'}
                    className={`flex flex-col h-auto py-3 ${
                      emotionLog.emotion === emotion.value ? emotion.color : ''
                    }`}
                    onClick={() => setEmotionLog({ ...emotionLog, emotion: emotion.value })}
                  >
                    <span className="text-2xl mb-1">{emotion.icon}</span>
                    <span className="text-xs">{emotion.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                情绪强度: {emotionLog.intensity}/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={emotionLog.intensity}
                onChange={(e) => setEmotionLog({ ...emotionLog, intensity: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>轻微</span>
                <span>中等</span>
                <span>强烈</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">触发因素</label>
              <Input
                value={emotionLog.trigger}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmotionLog({ ...emotionLog, trigger: e.target.value })}
                placeholder="例如: 连续亏损、错过机会..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">具体情境</label>
              <Textarea
                value={emotionLog.context}
                onChange={(e) => setEmotionLog({ ...emotionLog, context: e.target.value })}
                placeholder="详细描述当时的情况和想法..."
                rows={4}
              />
            </div>

            <Button onClick={saveEmotionLog} className="w-full">
              保存情绪记录
            </Button>
          </CardContent>
        </Card>

        {/* 情绪统计 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              情绪统计 (最近7天)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 情绪分布 */}
            <div>
              <p className="text-sm font-medium mb-3">情绪分布</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">😊</span>
                  <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: '45%' }} />
                  </div>
                  <span className="text-sm font-medium">45%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">😌</span>
                  <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: '30%' }} />
                  </div>
                  <span className="text-sm font-medium">30%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">😰</span>
                  <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500" style={{ width: '15%' }} />
                  </div>
                  <span className="text-sm font-medium">15%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">😤</span>
                  <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500" style={{ width: '10%' }} />
                  </div>
                  <span className="text-sm font-medium">10%</span>
                </div>
              </div>
            </div>

            {/* 情绪与盈亏关系 */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
              <p className="text-sm font-medium mb-2">💡 洞察</p>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <li>• 自信状态下胜率 68%</li>
                <li>• 焦虑时容易提前止盈</li>
                <li>• 贪婪时仓位过大</li>
              </ul>
            </div>

            {/* 建议 */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
              <p className="text-sm font-medium mb-2">✅ 建议</p>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <li>• 保持冷静理性的交易心态</li>
                <li>• 出现焦虑时减少交易频率</li>
                <li>• 设置冷静期避免情绪化决策</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 心理模式识别 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            心理模式识别
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {psychologyPatterns.map(pattern => (
              <div key={pattern.id} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{pattern.name}</h3>
                      <Badge
                        variant="outline"
                        className={
                          pattern.frequency === 'high'
                            ? 'bg-red-100 text-red-700'
                            : pattern.frequency === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }
                      >
                        {pattern.frequency === 'high' ? '高频' : pattern.frequency === 'medium' ? '中频' : '低频'}
                      </Badge>
                      <Badge variant="outline" className="bg-purple-100 text-purple-700">
                        {pattern.impact === 'negative' ? '负面影响' : '正面影响'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{pattern.description}</p>
                    <div className="flex items-start gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-blue-700 dark:text-blue-300">{pattern.suggestion}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 冷静期设置 */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <CardHeader>
          <CardTitle>🧘 交易冷静期</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            当情绪波动较大时,系统会建议您暂停交易,进入冷静期
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-600">2小时</p>
              <p className="text-sm text-gray-500">连续亏损后</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">1天</p>
              <p className="text-sm text-gray-500">达到每日亏损限额</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">30分钟</p>
              <p className="text-sm text-gray-500">情绪强度&gt;8时</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

