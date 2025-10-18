'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Download, Filter } from 'lucide-react';
import { toast } from 'sonner';

// Mock数据
const mockPivotData = {
  byStrategy: [
    { strategy: '动量突破', trades: 45, winRate: 62, avgPnl: 276, totalPnl: 12420, bestMonth: 'Jan', worstMonth: 'Mar' },
    { strategy: '回调买入', trades: 38, winRate: 58, avgPnl: 234, totalPnl: 8892, bestMonth: 'Feb', worstMonth: 'Apr' },
    { strategy: '趋势跟随', trades: 25, winRate: 68, avgPnl: 608, totalPnl: 15200, bestMonth: 'Jan', worstMonth: 'May' },
    { strategy: '超卖反弹', trades: 52, winRate: 55, avgPnl: 123, totalPnl: 6396, bestMonth: 'Mar', worstMonth: 'Jun' },
  ],
  bySymbol: [
    { symbol: 'AAPL', trades: 28, winRate: 64, avgPnl: 320, totalPnl: 8960, volatility: 'Low' },
    { symbol: 'TSLA', trades: 22, winRate: 55, avgPnl: 580, totalPnl: 12760, volatility: 'High' },
    { symbol: 'MSFT', trades: 18, winRate: 67, avgPnl: 280, totalPnl: 5040, volatility: 'Low' },
    { symbol: 'NVDA', trades: 15, winRate: 60, avgPnl: 720, totalPnl: 10800, volatility: 'High' },
  ],
  byTimeOfDay: [
    { time: '开盘 (9:30-10:30)', trades: 45, winRate: 58, avgPnl: 180, totalPnl: 8100 },
    { time: '午盘 (10:30-14:00)', trades: 38, winRate: 55, avgPnl: 150, totalPnl: 5700 },
    { time: '尾盘 (14:00-16:00)', trades: 37, winRate: 62, avgPnl: 220, totalPnl: 8140 },
  ],
  byDayOfWeek: [
    { day: '周一', trades: 24, winRate: 54, avgPnl: 150, totalPnl: 3600, mood: '😐' },
    { day: '周二', trades: 28, winRate: 61, avgPnl: 280, totalPnl: 7840, mood: '😊' },
    { day: '周三', trades: 26, winRate: 65, avgPnl: 320, totalPnl: 8320, mood: '😄' },
    { day: '周四', trades: 22, winRate: 59, avgPnl: 190, totalPnl: 4180, mood: '😊' },
    { day: '周五', trades: 20, winRate: 55, avgPnl: 180, totalPnl: 3600, mood: '😐' },
  ],
};

export default function PivotView() {
  const [dimension1, setDimension1] = useState('strategy');
  const [dimension2, setDimension2] = useState('none');
  
  // 导出CSV
  const exportToCSV = () => {
    toast.success('📥 数据导出成功');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">数据透视表</h2>
          <p className="text-gray-500 mt-1">多维度分析交易数据,发现规律</p>
        </div>
        <Button onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-2" />
          导出数据
        </Button>
      </div>

      {/* 维度选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            选择分析维度
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">主维度</label>
              <Select value={dimension1} onValueChange={setDimension1}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strategy">按策略</SelectItem>
                  <SelectItem value="symbol">按股票</SelectItem>
                  <SelectItem value="time">按时间段</SelectItem>
                  <SelectItem value="day">按星期</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">次维度(可选)</label>
              <Select value={dimension2} onValueChange={setDimension2}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无</SelectItem>
                  <SelectItem value="month">按月份</SelectItem>
                  <SelectItem value="emotion">按情绪</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 按策略分析 */}
      {dimension1 === 'strategy' && (
        <Card>
          <CardHeader>
            <CardTitle>策略维度分析</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>策略</TableHead>
                  <TableHead className="text-right">交易次数</TableHead>
                  <TableHead className="text-right">胜率</TableHead>
                  <TableHead className="text-right">平均盈亏</TableHead>
                  <TableHead className="text-right">总盈亏</TableHead>
                  <TableHead className="text-right">最佳月份</TableHead>
                  <TableHead className="text-right">最差月份</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockPivotData.byStrategy.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.strategy}</TableCell>
                    <TableCell className="text-right">{row.trades}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={row.winRate >= 60 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                        {row.winRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-green-600">${row.avgPnl}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      ${row.totalPnl.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{row.bestMonth}</TableCell>
                    <TableCell className="text-right">{row.worstMonth}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 按股票分析 */}
      {dimension1 === 'symbol' && (
        <Card>
          <CardHeader>
            <CardTitle>股票维度分析</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>股票</TableHead>
                  <TableHead className="text-right">交易次数</TableHead>
                  <TableHead className="text-right">胜率</TableHead>
                  <TableHead className="text-right">平均盈亏</TableHead>
                  <TableHead className="text-right">总盈亏</TableHead>
                  <TableHead className="text-right">波动性</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockPivotData.bySymbol.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.symbol}</TableCell>
                    <TableCell className="text-right">{row.trades}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={row.winRate >= 60 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                        {row.winRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-green-600">${row.avgPnl}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      ${row.totalPnl.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={row.volatility === 'High' ? 'text-red-600' : 'text-blue-600'}>
                        {row.volatility}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 按时间段分析 */}
      {dimension1 === 'time' && (
        <Card>
          <CardHeader>
            <CardTitle>时间段维度分析</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间段</TableHead>
                  <TableHead className="text-right">交易次数</TableHead>
                  <TableHead className="text-right">胜率</TableHead>
                  <TableHead className="text-right">平均盈亏</TableHead>
                  <TableHead className="text-right">总盈亏</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockPivotData.byTimeOfDay.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.time}</TableCell>
                    <TableCell className="text-right">{row.trades}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={row.winRate >= 60 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                        {row.winRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-green-600">${row.avgPnl}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      ${row.totalPnl.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                💡 <strong>洞察:</strong> 尾盘时段胜率最高(62%),建议重点关注14:00-16:00的交易机会
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 按星期分析 */}
      {dimension1 === 'day' && (
        <Card>
          <CardHeader>
            <CardTitle>星期维度分析</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>星期</TableHead>
                  <TableHead className="text-right">交易次数</TableHead>
                  <TableHead className="text-right">胜率</TableHead>
                  <TableHead className="text-right">平均盈亏</TableHead>
                  <TableHead className="text-right">总盈亏</TableHead>
                  <TableHead className="text-right">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockPivotData.byDayOfWeek.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.day}</TableCell>
                    <TableCell className="text-right">{row.trades}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={row.winRate >= 60 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                        {row.winRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-green-600">${row.avgPnl}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      ${row.totalPnl.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-xl">{row.mood}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 dark:text-green-300">
                💡 <strong>洞察:</strong> 周三表现最佳(胜率65%,平均盈利$320),周一和周五表现相对较弱
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 关键发现 */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            关键发现
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold mb-2">🏆 最佳组合</h3>
              <p className="text-sm text-gray-600 mb-2">
                趋势跟随策略 + NVDA + 周三 + 尾盘
              </p>
              <p className="text-lg font-bold text-green-600">胜率: 72%</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold mb-2">⚠️ 需改进</h3>
              <p className="text-sm text-gray-600 mb-2">
                超卖反弹策略 + 周一 + 开盘
              </p>
              <p className="text-lg font-bold text-red-600">胜率: 48%</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold mb-2">📊 交易频率</h3>
              <p className="text-sm text-gray-600 mb-2">
                最活跃: 超卖反弹 (52笔)
              </p>
              <p className="text-lg font-bold text-blue-600">平均: 40笔/策略</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold mb-2">💰 盈利能力</h3>
              <p className="text-sm text-gray-600 mb-2">
                最赚钱: 趋势跟随
              </p>
              <p className="text-lg font-bold text-green-600">$15,200</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

