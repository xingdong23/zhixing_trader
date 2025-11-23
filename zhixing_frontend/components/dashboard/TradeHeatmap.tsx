
import React from 'react';
import { ActivityCalendar, Activity } from 'react-activity-calendar';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip as RechartsTooltip } from 'recharts';

// 生成模拟数据
const generateMockData = (): Activity[] => {
  const data: Activity[] = [];
  const now = new Date();
  const oneYearAgo = subDays(now, 365);

  for (let d = oneYearAgo; d <= now; d = new Date(d.setDate(d.getDate() + 1))) {
    // 30% 的概率有交易
    if (Math.random() > 0.7) {
      // 随机盈亏: -500 到 +1000
      const pnl = Math.floor(Math.random() * 1500) - 500;
      let level = 0;
      
      // 映射 PnL 到 Level (0-4)
      // Level 0: 无交易 (由外层if控制，这里实际上是 level 0 data不生成或者count=0)
      // 但 react-activity-calendar 需要 data point 存在。
      
      // 这里的 Level 定义：
      // 1: 大亏 (<= -200)
      // 2: 小亏 (< 0)
      // 3: 小赚 (> 0)
      // 4: 大赚 (>= 300)
      
      if (pnl <= -200) level = 1;
      else if (pnl < 0) level = 2;
      else if (pnl < 300) level = 3;
      else level = 4;

      data.push({
        date: format(d, 'yyyy-MM-dd'),
        count: Math.abs(pnl), // count 用于显示 intensity，但在我们的逻辑里主要用 level
        level: level,
      });
    } else {
        data.push({
            date: format(d, 'yyyy-MM-dd'),
            count: 0,
            level: 0
        });
    }
  }
  return data;
};

const data = generateMockData();

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
                    totalCount: '{{count}} active days in 2024'
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
                                     activity.level <= 2 ? `Loss: -$${activity.count}` : 
                                     `Profit: +$${activity.count}`}
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
                    cursor={{fill: 'transparent'}}
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
