'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Heart, TrendingUp, AlertCircle, Brain } from 'lucide-react';
import { toast } from 'sonner';
import PsychologyAnalysis from './PsychologyAnalysis';
import PsychologyRadarChart from './PsychologyRadarChart';

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">心理分析</h2>
          <p className="text-muted-foreground mt-1">追踪情绪和心理状态,提高交易纪律性</p>
        </div>
      </div>

      {/* 核心分析图表区域 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PsychologyAnalysis />
        <PsychologyRadarChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧：情绪录入 */}
        <div className="lg:col-span-5">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                每日情绪追踪
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-3 block">当前情绪状态</label>
                <div className="grid grid-cols-3 gap-3">
                  {emotions.map(emotion => (
                    <Button
                      key={emotion.value}
                      variant={emotionLog.emotion === emotion.value ? 'default' : 'outline'}
                      className={`flex flex-col h-auto py-4 transition-all ${
                        emotionLog.emotion === emotion.value ? emotion.color + ' border-primary ring-2 ring-primary/20' : 'hover:bg-accent'
                      }`}
                      onClick={() => setEmotionLog({ ...emotionLog, emotion: emotion.value })}
                    >
                      <span className="text-3xl mb-2">{emotion.icon}</span>
                      <span className="text-xs font-medium">{emotion.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium">情绪强度</label>
                  <span className="text-sm text-muted-foreground">{emotionLog.intensity}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={emotionLog.intensity}
                  onChange={(e) => setEmotionLog({ ...emotionLog, intensity: parseInt(e.target.value) })}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>平静</span>
                  <span>中等</span>
                  <span>极强</span>
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
                <label className="text-sm font-medium mb-2 block">具体情境与想法</label>
                <Textarea
                  value={emotionLog.context}
                  onChange={(e) => setEmotionLog({ ...emotionLog, context: e.target.value })}
                  placeholder="详细描述当时的情况..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <Button onClick={saveEmotionLog} className="w-full" size="lg">
                保存记录
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：辅助信息 */}
        <div className="lg:col-span-7 space-y-6">
          {/* 心理模式识别 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                心理模式识别
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {psychologyPatterns.map(pattern => (
                  <div key={pattern.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{pattern.name}</h3>
                          <Badge
                            variant="outline"
                            className={
                              pattern.frequency === 'high'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : pattern.frequency === 'medium'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }
                          >
                            {pattern.frequency === 'high' ? '高频' : pattern.frequency === 'medium' ? '中频' : '低频'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{pattern.description}</p>
                        <div className="flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
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
          <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">🧘</span>
                交易冷静期建议
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4 text-sm">
                当情绪波动强度 &gt; 7 时，系统强烈建议您暂停交易。
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white/80 dark:bg-black/40 rounded-lg text-center shadow-sm backdrop-blur">
                  <p className="text-2xl font-bold text-purple-600">2h</p>
                  <p className="text-xs text-muted-foreground mt-1">连续亏损后</p>
                </div>
                <div className="p-4 bg-white/80 dark:bg-black/40 rounded-lg text-center shadow-sm backdrop-blur">
                  <p className="text-2xl font-bold text-blue-600">24h</p>
                  <p className="text-xs text-muted-foreground mt-1">触及日亏损</p>
                </div>
                <div className="p-4 bg-white/80 dark:bg-black/40 rounded-lg text-center shadow-sm backdrop-blur">
                  <p className="text-2xl font-bold text-green-600">30m</p>
                  <p className="text-xs text-muted-foreground mt-1">情绪激动时</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

