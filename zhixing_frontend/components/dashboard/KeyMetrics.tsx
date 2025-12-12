
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
  // 根据 color 确定渐变
  const gradients: Record<string, string> = {
    'bg-green-500': 'from-emerald-500 via-teal-500 to-cyan-500',
    'bg-blue-500': 'from-blue-500 via-indigo-500 to-purple-500',
    'bg-purple-500': 'from-purple-500 via-pink-500 to-rose-500',
    'bg-orange-500': 'from-orange-500 via-amber-500 to-yellow-500',
  };

  const gradient = gradients[color] || 'from-slate-600 to-slate-700';

  return (
    <Card className={`relative overflow-hidden border-0 bg-gradient-to-br ${gradient} shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl group`}>
      {/* 玻璃背景层 */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />

      {/* 装饰光斑 */}
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/20 rounded-full blur-2xl pointer-events-none group-hover:bg-white/30 transition-colors" />
      <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-black/10 rounded-full blur-2xl pointer-events-none" />

      {/* 大背景图标 */}
      <div className="absolute -bottom-2 -right-2 opacity-10 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none rotate-[-12deg]">
        {React.cloneElement(icon as React.ReactElement<any>, { className: "w-24 h-24 text-white" })}
      </div>

      <CardContent className="p-5 md:p-6 relative z-10">
        <div className="flex justify-between items-start mb-4">
          <p className="text-xs md:text-sm font-semibold text-white/80 uppercase tracking-wider">{title}</p>
          {/* 图标徽章 */}
          <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg group-hover:scale-110 transition-transform">
            {React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5 text-white" })}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-3xl md:text-4xl font-extrabold text-white drop-shadow-md">
            {value}
          </h3>

          {subValue && (
            <div className="flex items-center gap-1.5 text-sm text-white/70">
              {trend === 'up' && <TrendingUp className="w-4 h-4 text-white" />}
              {trend === 'down' && <TrendingDown className="w-4 h-4 text-white" />}
              <span className="font-medium">{subValue}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function KeyMetrics() {
  const [stats, setStats] = React.useState<{
    totalTrades: number;
    activeTrades: number;
    totalPnl: number;
    winRate: number;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const res = await fetch(`${base}/api/v1/trades/stats`);
        const data = await res.json();
        if (data.success && data.data) {
          setStats(data.data);
        }
      } catch (err) {
        console.error('获取统计数据失败:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // 根据 API 数据生成展示内容
  const metrics = [
    {
      title: "总净值 (Total PnL)",
      value: stats ? `${stats.totalPnl >= 0 ? '+' : ''}$${stats.totalPnl.toLocaleString()}` : "$0",
      subValue: `${stats?.totalTrades || 0} 笔交易`,
      icon: <DollarSign className="w-6 h-6" />,
      trend: (stats?.totalPnl || 0) >= 0 ? 'up' as const : 'down' as const,
      color: "bg-green-500"
    },
    {
      title: "胜率 (Win Rate)",
      value: stats ? `${stats.winRate.toFixed(1)}%` : "0%",
      subValue: "已平仓交易",
      icon: <Percent className="w-6 h-6" />,
      trend: (stats?.winRate || 0) >= 50 ? 'up' as const : 'down' as const,
      color: "bg-blue-500"
    },
    {
      title: "活跃交易",
      value: stats ? `${stats.activeTrades}` : "0",
      subValue: "持仓中",
      icon: <Activity className="w-6 h-6" />,
      trend: 'neutral' as const,
      color: "bg-purple-500"
    },
    {
      title: "总交易数",
      value: stats ? `${stats.totalTrades}` : "0",
      subValue: "全部交易",
      icon: <Target className="w-6 h-6" />,
      trend: 'neutral' as const,
      color: "bg-orange-500"
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-800/40 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
}

