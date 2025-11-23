
import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Brain, AlertTriangle, TrendingUp } from 'lucide-react';

// Mock Data for Psychology Analysis
const mockData = [
  { mood: 'FOMO/追高', pnl: -1250, count: 15, winRate: 0.20 },
  { mood: 'Confident/自信', pnl: 3400, count: 28, winRate: 0.75 },
  { mood: 'Revenge/报复', pnl: -2800, count: 8, winRate: 0.12 },
  { mood: 'Bored/无聊', pnl: -450, count: 12, winRate: 0.45 },
  { mood: 'Disciplined/纪律', pnl: 1800, count: 22, winRate: 0.68 },
];

export default function PsychologyAnalysis() {
  // 1. Calculate Insights
  const worstMood = [...mockData].sort((a, b) => a.pnl - b.pnl)[0];
  const bestMood = [...mockData].sort((a, b) => b.pnl - a.pnl)[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Chart Section */}
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    情绪盈亏分析 (Emotional PnL)
                </CardTitle>
                <CardDescription>
                    分析不同心理状态下的交易表现，找出你的“情绪漏洞”
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={mockData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis dataKey="mood" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis 
                                stroke="#888888" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip 
                                cursor={{fill: 'transparent'}}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
                                        <p className="font-medium mb-2">{data.mood}</p>
                                        <div className="space-y-1 text-sm">
                                            <p className={data.pnl >= 0 ? "text-green-500" : "text-red-500"}>
                                            累计盈亏: ${data.pnl}
                                            </p>
                                            <p className="text-muted-foreground">
                                            胜率: {(data.winRate * 100).toFixed(0)}% ({data.count} 笔)
                                            </p>
                                        </div>
                                        <div className="mt-2 text-xs text-muted-foreground max-w-[200px]">
                                            {data.pnl < -1000 ? "⚠️ 这是一个危险的亏损源。" : 
                                             data.pnl > 1000 ? "✨ 保持这种状态！" : ""}
                                        </div>
                                        </div>
                                    );
                                    }
                                    return null;
                                }}
                            />
                            <ReferenceLine y={0} stroke="#666" />
                            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                                {mockData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>

        {/* Insights Section */}
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/10">
            <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2 text-base">
                    <AlertTriangle className="w-4 h-4" />
                    风险警示
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                    数据分析显示，你最大的亏损来自于 <strong>【{worstMood.mood}】</strong> 状态。
                </p>
                <p className="text-sm font-medium text-red-600">
                    累计亏损: ${worstMood.pnl} (胜率仅 {(worstMood.winRate * 100).toFixed(0)}%)
                </p>
                <div className="mt-4 p-3 bg-white dark:bg-black/20 rounded text-xs text-muted-foreground">
                    🤖 AI 建议：当你感到愤怒或想要报复市场时，请强制关机休息至少 2 小时。
                </div>
            </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
            <CardHeader>
                <CardTitle className="text-green-600 flex items-center gap-2 text-base">
                    <TrendingUp className="w-4 h-4" />
                    最佳状态
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                    你在 <strong>【{bestMood.mood}】</strong> 状态下表现最好。
                </p>
                <p className="text-sm font-medium text-green-600">
                    累计盈利: +${bestMood.pnl} (胜率 {(bestMood.winRate * 100).toFixed(0)}%)
                </p>
                <div className="mt-4 p-3 bg-white dark:bg-black/20 rounded text-xs text-muted-foreground">
                    🤖 AI 建议：记录下此时的环境和心情，尝试在未来的交易中复制这种“心流”状态。
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
