"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Target, Settings, TrendingUp, Calendar } from "lucide-react";
import type { Trade } from "@/app/trades/types";

interface GoalProgressCardProps {
  trades: Trade[];
}

interface TradingGoal {
  monthlyTarget: number;
  yearlyTarget: number;
  currentMonthPnl: number;
  currentYearPnl: number;
}

export default function GoalProgressCard({ trades }: GoalProgressCardProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [goal, setGoal] = useState<TradingGoal>(() => {
    try {
      const saved = localStorage.getItem("tradingGoals");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    
    return {
      monthlyTarget: 5000,
      yearlyTarget: 50000,
      currentMonthPnl: 0,
      currentYearPnl: 0,
    };
  });

  const [tempGoal, setTempGoal] = useState({
    monthlyTarget: goal.monthlyTarget,
    yearlyTarget: goal.yearlyTarget,
  });

  // 计算当月和当年的盈亏
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyPnl = trades
    .filter(t => {
      if (!t.exitTime || t.status !== "closed") return false;
      const exitDate = new Date(t.exitTime);
      return exitDate.getMonth() === currentMonth && exitDate.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + (t.netPnl || 0), 0);

  const yearlyPnl = trades
    .filter(t => {
      if (!t.exitTime || t.status !== "closed") return false;
      const exitDate = new Date(t.exitTime);
      return exitDate.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + (t.netPnl || 0), 0);

  // 计算进度百分比
  const monthlyProgress = goal.monthlyTarget > 0 
    ? Math.min((monthlyPnl / goal.monthlyTarget) * 100, 100) 
    : 0;
  const yearlyProgress = goal.yearlyTarget > 0 
    ? Math.min((yearlyPnl / goal.yearlyTarget) * 100, 100) 
    : 0;

  // 获取进度颜色
  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "text-green-600";
    if (progress >= 75) return "text-blue-600";
    if (progress >= 50) return "text-yellow-600";
    return "text-gray-600";
  };

  const handleSaveGoals = () => {
    const newGoal = {
      ...goal,
      monthlyTarget: tempGoal.monthlyTarget,
      yearlyTarget: tempGoal.yearlyTarget,
    };
    setGoal(newGoal);
    localStorage.setItem("tradingGoals", JSON.stringify(newGoal));
    setShowSettings(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-blue-600" />
              目标管理
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setTempGoal({
                  monthlyTarget: goal.monthlyTarget,
                  yearlyTarget: goal.yearlyTarget,
                });
                setShowSettings(true);
              }}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 月度目标 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold">月度目标</span>
              </div>
              <span className={`text-sm font-bold ${getProgressColor(monthlyProgress)}`}>
                {monthlyProgress.toFixed(1)}%
              </span>
            </div>
            <Progress value={monthlyProgress} className="h-2 mb-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                ${monthlyPnl.toFixed(2)} / ${goal.monthlyTarget.toFixed(2)}
              </span>
              <span className="text-gray-500">
                还需 ${Math.max(0, goal.monthlyTarget - monthlyPnl).toFixed(2)}
              </span>
            </div>
            {monthlyProgress >= 100 && (
              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-xs text-green-700 dark:text-green-400 font-semibold">
                  🎉 恭喜！已完成本月目标
                </p>
              </div>
            )}
          </div>

          {/* 年度目标 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold">年度目标</span>
              </div>
              <span className={`text-sm font-bold ${getProgressColor(yearlyProgress)}`}>
                {yearlyProgress.toFixed(1)}%
              </span>
            </div>
            <Progress value={yearlyProgress} className="h-2 mb-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                ${yearlyPnl.toFixed(2)} / ${goal.yearlyTarget.toFixed(2)}
              </span>
              <span className="text-gray-500">
                还需 ${Math.max(0, goal.yearlyTarget - yearlyPnl).toFixed(2)}
              </span>
            </div>
            {yearlyProgress >= 100 && (
              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-xs text-green-700 dark:text-green-400 font-semibold">
                  🏆 太棒了！已完成年度目标
                </p>
              </div>
            )}
          </div>

          {/* 预估完成时间 */}
          {monthlyProgress > 0 && monthlyProgress < 100 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
                💡 预测
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-500">
                按当前进度，预计{" "}
                {monthlyProgress > 0 
                  ? `${Math.ceil(30 / (monthlyProgress / 100))}天后`
                  : "需要更多交易数据"
                }
                完成月度目标
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 目标设置对话框 */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>设置盈利目标</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyTarget">月度目标 ($)</Label>
              <Input
                id="monthlyTarget"
                type="number"
                value={tempGoal.monthlyTarget}
                onChange={(e) => setTempGoal({ ...tempGoal, monthlyTarget: parseFloat(e.target.value) || 0 })}
                placeholder="例如: 5000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearlyTarget">年度目标 ($)</Label>
              <Input
                id="yearlyTarget"
                type="number"
                value={tempGoal.yearlyTarget}
                onChange={(e) => setTempGoal({ ...tempGoal, yearlyTarget: parseFloat(e.target.value) || 0 })}
                placeholder="例如: 50000"
              />
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
              <p className="font-semibold mb-1">💡 建议</p>
              <ul className="space-y-1 text-xs">
                <li>• 设置可实现的目标，避免过度冒险</li>
                <li>• 年度目标应是月度目标的 10-12 倍</li>
                <li>• 根据账户大小设定合理的收益率预期</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              取消
            </Button>
            <Button onClick={handleSaveGoals}>
              保存目标
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

