'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, Target, BarChart3, Trophy } from 'lucide-react';

// 策略模板
const strategyTemplates = [
  {
    id: 1,
    name: '动量突破',
    description: '突破关键阻力位,MACD金叉确认',
    tags: ['momentum', 'breakout'],
    icon: '🚀',
    stats: { trades: 45, winRate: 0.62, totalPnl: 12450, avgWin: 520, avgLoss: -280 }
  },
  {
    id: 2,
    name: '回调买入',
    description: '上升趋势中的回调至支撑位',
    tags: ['pullback', 'support'],
    icon: '📉',
    stats: { trades: 38, winRate: 0.58, totalPnl: 8900, avgWin: 480, avgLoss: -250 }
  },
  {
    id: 3,
    name: '趋势跟随',
    description: '跟随主要趋势,移动止损保护利润',
    tags: ['trend', 'long-term'],
    icon: '📈',
    stats: { trades: 25, winRate: 0.68, totalPnl: 15200, avgWin: 850, avgLoss: -320 }
  },
  {
    id: 4,
    name: '超卖反弹',
    description: 'RSI超卖后的反弹机会',
    tags: ['oversold', 'short-term'],
    icon: '⚡',
    stats: { trades: 52, winRate: 0.55, totalPnl: 6400, avgWin: 380, avgLoss: -220 }
  },
];

export default function StrategiesView() {
  const [selectedStrategy, setSelectedStrategy] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">策略管理</h2>
          <p className="text-gray-500 mt-1">管理和优化交易策略</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          创建策略
        </Button>
      </div>

      {/* 策略卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {strategyTemplates.map((strategy) => (
          <Card
            key={strategy.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedStrategy === strategy.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedStrategy(strategy.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-3xl mb-2">{strategy.icon}</div>
                  <CardTitle className="text-lg">{strategy.name}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{strategy.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                {strategy.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">交易次数</p>
                  <p className="font-semibold">{strategy.stats.trades}</p>
                </div>
                <div>
                  <p className="text-gray-500">胜率</p>
                  <p className="font-semibold text-green-600">
                    {(strategy.stats.winRate * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">总盈亏</p>
                  <p className={`font-semibold ${strategy.stats.totalPnl > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${strategy.stats.totalPnl.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">盈亏比</p>
                  <p className="font-semibold">
                    {Math.abs(strategy.stats.avgWin / strategy.stats.avgLoss).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 策略对比 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            策略对比分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 胜率对比 */}
            <div>
              <p className="text-sm font-medium mb-3">胜率对比</p>
              <div className="space-y-2">
                {strategyTemplates.map(strategy => (
                  <div key={strategy.id} className="flex items-center gap-3">
                    <div className="w-32 text-sm">{strategy.name}</div>
                    <div className="flex-1">
                      <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 flex items-center justify-end px-2"
                          style={{ width: `${strategy.stats.winRate * 100}%` }}
                        >
                          <span className="text-xs text-white font-semibold">
                            {(strategy.stats.winRate * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 盈利对比 */}
            <div>
              <p className="text-sm font-medium mb-3">总盈亏对比</p>
              <div className="space-y-2">
                {strategyTemplates.map(strategy => (
                  <div key={strategy.id} className="flex items-center gap-3">
                    <div className="w-32 text-sm">{strategy.name}</div>
                    <div className="flex-1">
                      <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full flex items-center justify-end px-2 ${
                            strategy.stats.totalPnl > 0 ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{
                            width: `${Math.min((Math.abs(strategy.stats.totalPnl) / 20000) * 100, 100)}%`
                          }}
                        >
                          <span className="text-xs text-white font-semibold">
                            ${strategy.stats.totalPnl.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 最佳策略 */}
      <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-2 border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            本月最佳策略
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-5xl">🏆</div>
            <div>
              <h3 className="text-2xl font-bold">趋势跟随</h3>
              <p className="text-gray-600">胜率 68% | 盈亏比 2.66 | 总盈利 $15,200</p>
              <p className="text-sm text-gray-500 mt-1">
                该策略在上升趋势中表现优异,建议增加仓位
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

