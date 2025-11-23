
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Percent, Target, Activity } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactElement;
  trend?: 'up' | 'down' | 'neutral';
  color: string;
}

const MetricCard = ({ title, value, subValue, icon, trend, color }: MetricCardProps) => {
  const isPositive = trend === 'up' || value.startsWith('+');
  const valueClass = isPositive 
    ? "bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent" 
    : trend === 'down' ? "text-rose-400" : "text-slate-100";

  return (
    <Card className="relative overflow-hidden border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-slate-600 hover:bg-slate-800/60 group">
      {/* Background Ambient Glow */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 ${color.replace('bg-', 'bg-')}/20 blur-[60px] rounded-full pointer-events-none`} />
      
      {/* Big Faint Background Icon */}
      <div className="absolute -bottom-4 -right-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity duration-500 pointer-events-none rotate-[-12deg]">
        {React.cloneElement(icon as React.ReactElement<any>, { className: "w-28 h-28" })}
      </div>

      <CardContent className="p-4 md:p-6 relative z-10">
        <div className="flex justify-between items-start mb-3">
           <p className="text-xs md:text-sm font-medium text-slate-400 uppercase tracking-wider">{title}</p>
           {/* Small Icon Badge */}
           <div className={`p-2 rounded-lg bg-white/5 border border-white/10 ${color.replace('bg-', 'text-')} shadow-inner group-hover:scale-110 transition-transform`}>
             {React.cloneElement(icon as React.ReactElement<any>, { className: "w-4 h-4" })}
           </div>
        </div>
        
        <div className="space-y-1">
          <h3 className={`text-2xl md:text-3xl font-bold tracking-tight ${valueClass}`}>
            {value}
          </h3>
          
          {subValue && (
            <div className={`flex items-center gap-1 text-xs md:text-sm ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-slate-400'}`}>
               {trend === 'up' && <TrendingUp className="w-3 h-3" />}
               {trend === 'down' && <TrendingDown className="w-3 h-3" />}
               <span className="font-medium">{subValue}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

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
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
}
