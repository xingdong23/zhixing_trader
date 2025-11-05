'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, BookOpen, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ReviewView() {
  const [activeTab, setActiveTab] = useState('daily');
  
  // 日度复盘状态
  const [dailyReview, setDailyReview] = useState({
    date: new Date().toISOString().split('T')[0],
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalPnl: 0,
    mentalState: 'good' as 'excellent' | 'good' | 'normal' | 'tired' | 'stressed',
    marketCondition: 'bull' as 'bull' | 'bear' | 'sideways' | 'volatile',
    followedPlan: true,
    violations: [] as string[],
    learnings: '',
    mistakes: '',
    improvements: '',
    tomorrowPlan: ''
  });

  // 周度复盘状态
  const [weeklyReview, setWeeklyReview] = useState({
    weekStart: '',
    weekEnd: '',
    achievements: '',
    challenges: '',
    patterns: '',
    nextWeekGoals: '',
    focusAreas: [] as string[]
  });

  // 保存日度复盘
  const saveDailyReview = () => {
    const reviews = JSON.parse(localStorage.getItem('daily_reviews') || '[]');
    reviews.unshift({
      ...dailyReview,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('daily_reviews', JSON.stringify(reviews));
    toast.success('✅ 日度复盘已保存');
  };

  // 保存周度复盘
  const saveWeeklyReview = () => {
    const reviews = JSON.parse(localStorage.getItem('weekly_reviews') || '[]');
    reviews.unshift({
      ...weeklyReview,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('weekly_reviews', JSON.stringify(reviews));
    toast.success('✅ 周度复盘已保存');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">复盘系统</h2>
          <p className="text-gray-500 mt-1">系统化复盘,持续改进交易能力</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="daily">
            <Calendar className="w-4 h-4 mr-2" />
            日度复盘
          </TabsTrigger>
          <TabsTrigger value="weekly">
            <BookOpen className="w-4 h-4 mr-2" />
            周度复盘
          </TabsTrigger>
          <TabsTrigger value="monthly">
            <Target className="w-4 h-4 mr-2" />
            月度复盘
          </TabsTrigger>
          <TabsTrigger value="trade">
            <TrendingUp className="w-4 h-4 mr-2" />
            交易复盘
          </TabsTrigger>
        </TabsList>

        {/* 日度复盘 */}
        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>今日交易总结</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 基础数据 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-600">交易次数</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-gray-600">盈利次数</p>
                  <p className="text-2xl font-bold text-green-600">3</p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-gray-600">亏损次数</p>
                  <p className="text-2xl font-bold text-red-600">2</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-gray-600">总盈亏</p>
                  <p className="text-2xl font-bold text-green-600">+$1,250</p>
                </div>
              </div>

              {/* 状态评估 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">心理状态</label>
                  <Select
                    value={dailyReview.mentalState}
                    onValueChange={(value: any) => setDailyReview({ ...dailyReview, mentalState: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">😄 优秀</SelectItem>
                      <SelectItem value="good">😊 良好</SelectItem>
                      <SelectItem value="normal">😐 一般</SelectItem>
                      <SelectItem value="tired">😫 疲惫</SelectItem>
                      <SelectItem value="stressed">😰 焦虑</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">市场环境</label>
                  <Select
                    value={dailyReview.marketCondition}
                    onValueChange={(value: any) => setDailyReview({ ...dailyReview, marketCondition: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bull">📈 牛市</SelectItem>
                      <SelectItem value="bear">📉 熊市</SelectItem>
                      <SelectItem value="sideways">↔️ 震荡</SelectItem>
                      <SelectItem value="volatile">⚡ 波动剧烈</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 纪律性 */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">是否遵守交易计划?</p>
                  <div className="flex gap-2">
                    <Button
                      variant={dailyReview.followedPlan ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDailyReview({ ...dailyReview, followedPlan: true })}
                    >
                      ✅ 是
                    </Button>
                    <Button
                      variant={!dailyReview.followedPlan ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDailyReview({ ...dailyReview, followedPlan: false })}
                      className={!dailyReview.followedPlan ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                      ❌ 否
                    </Button>
                  </div>
                </div>
              </div>

              {/* 反思内容 */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">📚 今日收获</label>
                  <Textarea
                    value={dailyReview.learnings}
                    onChange={(e) => setDailyReview({ ...dailyReview, learnings: e.target.value })}
                    placeholder="今天学到了什么?哪些策略有效?..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">❌ 犯的错误</label>
                  <Textarea
                    value={dailyReview.mistakes}
                    onChange={(e) => setDailyReview({ ...dailyReview, mistakes: e.target.value })}
                    placeholder="哪些地方做错了?为什么会犯这个错误?..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">💡 改进措施</label>
                  <Textarea
                    value={dailyReview.improvements}
                    onChange={(e) => setDailyReview({ ...dailyReview, improvements: e.target.value })}
                    placeholder="下次如何改进?具体的行动计划..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">📅 明日计划</label>
                  <Textarea
                    value={dailyReview.tomorrowPlan}
                    onChange={(e) => setDailyReview({ ...dailyReview, tomorrowPlan: e.target.value })}
                    placeholder="明天关注哪些机会?准备使用什么策略?..."
                    rows={3}
                  />
                </div>
              </div>

              <Button onClick={saveDailyReview} className="w-full" size="lg">
                保存今日复盘
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 周度复盘 */}
        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>本周交易回顾</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 周统计 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-600">本周交易</p>
                  <p className="text-2xl font-bold">25 笔</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-gray-600">胜率</p>
                  <p className="text-2xl font-bold text-green-600">64%</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-gray-600">总盈亏</p>
                  <p className="text-2xl font-bold text-green-600">+$5,200</p>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p className="text-sm text-gray-600">最佳日</p>
                  <p className="text-lg font-bold">周三</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">🎯 本周成就</label>
                  <Textarea
                    value={weeklyReview.achievements}
                    onChange={(e) => setWeeklyReview({ ...weeklyReview, achievements: e.target.value })}
                    placeholder="本周达成了什么目标?有哪些进步?..."
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">💪 遇到的挑战</label>
                  <Textarea
                    value={weeklyReview.challenges}
                    onChange={(e) => setWeeklyReview({ ...weeklyReview, challenges: e.target.value })}
                    placeholder="本周遇到了什么困难?如何应对的?..."
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">📊 发现的模式</label>
                  <Textarea
                    value={weeklyReview.patterns}
                    onChange={(e) => setWeeklyReview({ ...weeklyReview, patterns: e.target.value })}
                    placeholder="发现了什么规律?哪些时间段表现更好?..."
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">🎯 下周目标</label>
                  <Textarea
                    value={weeklyReview.nextWeekGoals}
                    onChange={(e) => setWeeklyReview({ ...weeklyReview, nextWeekGoals: e.target.value })}
                    placeholder="下周的目标是什么?胜率、盈利、纪律性?..."
                    rows={4}
                  />
                </div>
              </div>

              <Button onClick={saveWeeklyReview} className="w-full" size="lg">
                保存本周复盘
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 月度复盘 */}
        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>本月交易总结</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">月度复盘功能开发中...</p>
                <p className="text-sm">将包含: 月度统计、策略效果分析、目标达成情况等</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 交易复盘 */}
        <TabsContent value="trade" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>单笔交易深度复盘</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">交易复盘功能开发中...</p>
                <p className="text-sm">将包含: 执行质量评分、经验教训、改进措施等</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

