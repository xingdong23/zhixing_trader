"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import ForcedTradePlanForm from "@/components/tradePlan/ForcedTradePlanForm";
import { TradePlan } from "@/lib/tradePlan";

// Mock股票数据
const mockStocks = [
  { symbol: "AAPL", name: "苹果公司", price: 182.30 },
  { symbol: "TSLA", name: "特斯拉", price: 258.50 },
  { symbol: "NVDA", name: "英伟达", price: 495.20 },
  { symbol: "MSFT", name: "微软", price: 378.50 },
];

export default function TradePlanDemoPage() {
  const router = useRouter();
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [selectedStock, setSelectedStock] = useState(mockStocks[0]);
  const [plans, setPlans] = useState<TradePlan[]>([]);

  const handleCreatePlan = (stock: typeof mockStocks[0]) => {
    setSelectedStock(stock);
    setShowPlanForm(true);
  };

  const handleSubmitPlan = (plan: TradePlan) => {
    setPlans([...plans, plan]);
    setShowPlanForm(false);
    alert(`✅ 交易计划创建成功！\n\n评分：${plan.score}分\n股票：${plan.symbol} - ${plan.name}\n类型：${plan.tradeType}\n\n计划已保存，可以开始执行交易。`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">💪 强制交易计划系统演示</h1>
          <p className="text-gray-500 mt-1">
            体验核心MVP功能 - 不填写完整计划，无法执行交易
          </p>
        </div>
      </div>

      {/* 功能说明 */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200">
        <h2 className="text-xl font-bold mb-4 text-blue-900 dark:text-blue-100">
          🎯 核心功能演示
        </h2>
        <div className="space-y-2 text-blue-800 dark:text-blue-200">
          <p>✅ <strong>强制计划制定</strong>：买入前必须填写完整的交易计划</p>
          <p>✅ <strong>实时评分系统</strong>：100分制评分，<60分无法交易</p>
          <p>✅ <strong>分类型管理</strong>：短期投机/波段交易/价值投资三种类型</p>
          <p>✅ <strong>智能建议</strong>：实时反馈改进建议</p>
          <p>✅ <strong>风险控制</strong>：自动校验仓位、止损、止盈合理性</p>
        </div>
      </Card>

      {/* 评分标准说明 */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">📋 评分标准</h2>
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">30分</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">买入理由</div>
            <div className="text-xs text-gray-500 mt-1">技术+基本面+消息面</div>
          </div>
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-3xl font-bold text-red-600">25分</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">止损设置</div>
            <div className="text-xs text-gray-500 mt-1">必须设置且合理</div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-3xl font-bold text-green-600">20分</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">止盈设置</div>
            <div className="text-xs text-gray-500 mt-1">分批止盈策略</div>
          </div>
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-3xl font-bold text-orange-600">15分</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">仓位管理</div>
            <div className="text-xs text-gray-500 mt-1">根据类型限制</div>
          </div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">10分</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">时间规划</div>
            <div className="text-xs text-gray-500 mt-1">持有周期合理</div>
          </div>
        </div>
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>⚠️ 强制执行规则：</strong>
            评分 <60分：❌ 禁止交易 | 
            60-80分：⚠️ 可交易但需改进 | 
            >80分：✅ 计划良好
          </p>
        </div>
      </Card>

      {/* 选择股票创建计划 */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">📈 选择股票并创建交易计划</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mockStocks.map((stock) => (
            <Card
              key={stock.symbol}
              className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleCreatePlan(stock)}
            >
              <div className="font-bold text-lg">{stock.symbol}</div>
              <div className="text-sm text-gray-600">{stock.name}</div>
              <div className="text-2xl font-bold mt-2">${stock.price.toFixed(2)}</div>
              <Button size="sm" className="w-full mt-3">
                创建交易计划
              </Button>
            </Card>
          ))}
        </div>
      </Card>

      {/* 已创建的计划 */}
      {plans.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">
            ✅ 已创建的交易计划 ({plans.length})
          </h2>
          <div className="space-y-4">
            {plans.map((plan, index) => (
              <Card key={index} className="p-4 bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-lg">
                      {plan.symbol} - {plan.name}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      类型：
                      {plan.tradeType === "short_term"
                        ? "短期投机"
                        : plan.tradeType === "swing"
                        ? "波段交易"
                        : "价值投资"}{" "}
                      | 买入价：${plan.targetBuyPrice.toFixed(2)} | 
                      止损：${plan.stopLoss.price.toFixed(2)} ({plan.stopLoss.percent.toFixed(2)}%)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-600">
                      {plan.score}分
                    </div>
                    <div className="text-xs text-gray-500">计划评分</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* 使用说明 */}
      <Card className="p-6 bg-gray-50 dark:bg-gray-900">
        <h2 className="text-xl font-bold mb-4">📖 使用说明</h2>
        <ol className="space-y-2 text-sm">
          <li>1️⃣ <strong>选择股票</strong>：点击上方任意股票卡片</li>
          <li>2️⃣ <strong>填写计划</strong>：按照表单要求详细填写各项内容</li>
          <li>3️⃣ <strong>查看评分</strong>：顶部实时显示计划评分和改进建议</li>
          <li>4️⃣ <strong>达到60分</strong>：只有评分≥60分才能提交计划</li>
          <li>5️⃣ <strong>提交计划</strong>：计划保存后才能执行交易</li>
        </ol>
      </Card>

      {/* 交易计划表单对话框 */}
      <Dialog open={showPlanForm} onOpenChange={setShowPlanForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              创建强制交易计划 - {selectedStock.symbol} ({selectedStock.name})
            </DialogTitle>
          </DialogHeader>
          <ForcedTradePlanForm
            symbol={selectedStock.symbol}
            name={selectedStock.name}
            currentPrice={selectedStock.price}
            onSubmit={handleSubmitPlan}
            onCancel={() => setShowPlanForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}


