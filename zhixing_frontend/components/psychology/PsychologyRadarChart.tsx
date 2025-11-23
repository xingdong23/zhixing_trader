
import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, AlertTriangle, Zap } from 'lucide-react';

// Mock Data: 5 Dimensions of Trading Psychology
const mockData = [
  { subject: 'FOMO Control', score: 65, fullMark: 100, description: '抵制追高诱惑的能力' },
  { subject: 'Discipline', score: 88, fullMark: 100, description: '严格执行交易计划' },
  { subject: 'Confidence', score: 75, fullMark: 100, description: '对策略的信任度' },
  { subject: 'Patience', score: 45, fullMark: 100, description: '等待完美入场机会' },
  { subject: 'Risk Control', score: 90, fullMark: 100, description: '仓位与止损管理' },
];

export default function PsychologyRadarChart() {
  // Find the weakest link (lowest score)
  const weakestLink = [...mockData].sort((a, b) => a.score - b.score)[0];

  // Dynamic insights based on the lowest score subject
  const getInsight = (subject: string) => {
    switch (subject) {
      case 'FOMO Control':
        return "您常在价格快速波动时冲动入场。建议：必须等待K线收盘确认。";
      case 'Discipline':
        return "存在偏离交易计划的行为。建议：每笔交易前强制核对检查清单。";
      case 'Confidence':
        return "近期连败影响了信心。建议：降低仓位，寻找高胜率机会重建信心。";
      case 'Patience':
        return "70% 的亏损发生在开盘前 15 分钟或震荡区间。建议：减少出手频率，只做A+级机会。";
      case 'Risk Control':
        return "单笔亏损有时超过预期。建议：严格设置硬止损，并在开仓前计算风险回报比。";
      default:
        return "继续保持记录，数据越多分析越准确。";
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-none shadow-lg hover:bg-card/60 transition-colors">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Brain className="w-5 h-5 text-primary" />
          心理能力雷达 (Psychology Radar)
        </CardTitle>
        <CardDescription>
          基于最近 50 笔交易的情绪与执行评分
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={mockData}>
              {/* Cyberpunk Style Grid */}
              <PolarGrid stroke="#374151" strokeDasharray="3 3" />
              
              {/* Axis Labels */}
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: '#9ca3af', fontSize: 12 }} 
              />
              
              {/* Radius Axis (optional, hidden for cleaner look or styled) */}
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              
              {/* The Radar Shape */}
              <Radar
                name="Score"
                dataKey="score"
                stroke="#10b981" // bright emerald
                strokeWidth={2}
                fill="#10b981"   // emerald fill
                fillOpacity={0.3}
                isAnimationActive={true}
              />
              
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(17, 24, 39, 0.9)', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#f3f4f6'
                }}
                itemStyle={{ color: '#34d399' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Dynamic Insight Section */}
        <div className="mt-4 p-4 rounded-lg bg-red-950/20 border border-red-900/30 flex items-start gap-3">
            <div className="p-2 bg-red-500/10 rounded-full flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
                <h4 className="text-sm font-semibold text-red-400 mb-1">
                    短板预警: {weakestLink.subject} ({weakestLink.score}/100)
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {getInsight(weakestLink.subject)}
                </p>
            </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2 text-xs text-emerald-500">
            <Zap className="w-3 h-3" />
            <span>Risk Control is excellent (90/100)</span>
        </div>
      </CardContent>
    </Card>
  );
}
