import React, { useMemo } from 'react';
import { ActivityCalendar, Activity } from 'react-activity-calendar';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, subDays, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

// 自定义颜色主题
// Level 0: 灰色 (无交易)
// Level 1: 深红 (大亏)
// Level 2: 浅红 (小亏)
// Level 3: 浅绿 (小赚)
// Level 4: 深绿 (大赚)
const explicitTheme = {
  light: ['#f1f5f9', '#ef4444', '#fca5a5', '#86efac', '#22c55e'],
  dark: ['#1e293b', '#ef4444', '#f87171', '#4ade80', '#16a34a'],
};

export default function TradeHeatmap() {
  // 实时获取所有交易数据
  const trades = useLiveQuery(() => db.trades.toArray()) || [];

  // 处理数据生成热力图数据
  const data = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();
    const oneYearAgo = subDays(now, 365);

    // 聚合每天的盈亏
    trades.forEach(t => {
      // 只统计已平仓或持仓中的交易 (根据需求，这里统计所有有盈亏的)
      // 如果是 active，用 unrealizedPnl；如果是 closed，用 netPnl
      let pnl = 0;
      if (t.status === 'closed') {
        pnl = t.netPnl || 0;
      } else if (t.status === 'active') {
        pnl = t.unrealizedPnl || 0;
      } else {
        return; // pending/planned 不计入热力图
      }

      // 提取日期 (YYYY-MM-DD)
      let dateStr = '';
      if (t.createdAt) {
        try {
          dateStr = format(new Date(t.createdAt), 'yyyy-MM-dd');
        } catch (e) {
          dateStr = '';
        }
      }

      if (dateStr) {
        const current = map.get(dateStr) || 0;
        map.set(dateStr, current + pnl);
      }
    });

    const activityData: Activity[] = [];

    // 生成过去一年的每一天的数据
    for (let d = oneYearAgo; d <= now; d = new Date(d.setDate(d.getDate() + 1))) {
      const dateStr = format(d, 'yyyy-MM-dd');
      const pnl = map.get(dateStr); // undefined if no trade

      let level = 0;
      let count = 0;

      if (pnl !== undefined) {
        count = Math.abs(pnl);
        if (pnl <= -200) level = 1;
        else if (pnl < 0) level = 2;
        else if (pnl < 300) level = 3;
        else level = 4;
      }

      activityData.push({
        date: dateStr,
        count: count,
        level: level,
      });
    }
    return activityData;
  }, [trades]);

  const last7Days = data.slice(-7);

  return (
    <TooltipProvider>
      <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center justify-between">
            <span>交易热力图 (Trading Activity)</span>
            {/* Legend 只在桌面端显示完整，移动端简化 */}
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground font-normal">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-[#ef4444]" title="大亏" />
                <div className="w-3 h-3 rounded-sm bg-[#f87171]" title="小亏" />
                <div className="w-3 h-3 rounded-sm bg-[#1e293b]" title="无交易" />
                <div className="w-3 h-3 rounded-sm bg-[#4ade80]" title="小赚" />
                <div className="w-3 h-3 rounded-sm bg-[#16a34a]" title="大赚" />
              </div>
              <span>More</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          {/* Desktop View: Calendar Heatmap */}
          <div className="hidden md:flex justify-center overflow-x-auto">
            <div className="min-w-[800px]">
              <ActivityCalendar
                data={data}
                theme={explicitTheme}
                labels={{
                  legend: {
                    less: 'Loss',
                    more: 'Profit',
                  },
                  months: [
                    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                  ],
                  weekdays: [
                    'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
                  ],
                  totalCount: '{{count}} active days in past year'
                }}
                showWeekdayLabels
                blockSize={14}
                blockMargin={4}
                fontSize={12}
                renderBlock={(block: React.ReactElement, activity: Activity) => (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      {block}
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover text-popover-foreground border-border">
                      <div className="text-xs font-medium">
                        <p>{activity.date}</p>
                        <p className={
                          activity.level === 0 ? 'text-muted-foreground' :
                            activity.level <= 2 ? 'text-red-500' : 'text-green-500'
                        }>
                          {activity.level === 0 ? 'No Trade' :
                            activity.level <= 2 ? `Loss: -$${activity.count.toFixed(2)}` :
                              `Profit: +$${activity.count.toFixed(2)}`}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              />
            </div>
          </div>

          {/* Mobile View: Last 7 Days Bar Chart */}
          <div className="block md:hidden h-[200px] w-full">
            <p className="text-xs text-muted-foreground mb-2">最近 7 天盈亏概览</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Days}>
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {last7Days.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.level >= 3 ? '#22c55e' : entry.level === 0 ? '#334155' : '#ef4444'}
                      fillOpacity={entry.level === 0 ? 0.3 : 1}
                    />
                  ))}
                </Bar>
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => val.slice(5)}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  stroke="#888888"
                />
                <RechartsTooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
