
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Percent, Target, Activity } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color: string;
}

const MetricCard = ({ title, value, subValue, icon, trend, color }: MetricCardProps) => (
  <Card className="relative overflow-hidden border-none shadow-lg bg-white/5 backdrop-blur-lg hover:bg-white/10 transition-all duration-300 group">
    <div className={`absolute top-0 left-0 w-1 h-full ${color}`} />
    <CardContent className="p-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
          {subValue && (
            <p className={`text-xs flex items-center gap-1 ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'}`}>
              {trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3" />}
              {subValue}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-white/10 ${color.replace('bg-', 'text-')} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function KeyMetrics() {
  // TODO: Replace with real data from store/API
  const metrics = [
    {
      title: "总净值 (Total PnL)",
      value: "+$12,450.80",
      subValue: "+15.3% vs 上月",
      icon: <DollarSign className="w-6 h-6" />,
      trend: 'up' as const,
      color: "bg-green-500"
    },
    {
      title: "胜率 (Win Rate)",
      value: "68.5%",
      subValue: "近30天",
      icon: <Percent className="w-6 h-6" />,
      trend: 'up' as const,
      color: "bg-blue-500"
    },
    {
      title: "盈亏比 (Profit Factor)",
      value: "2.45",
      subValue: "健康 (>1.5)",
      icon: <Activity className="w-6 h-6" />,
      trend: 'neutral' as const,
      color: "bg-purple-500"
    },
    {
      title: "平均盈亏 (Avg R:R)",
      value: "1:2.8",
      subValue: "风险收益比",
      icon: <Target className="w-6 h-6" />,
      trend: 'up' as const,
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
}
