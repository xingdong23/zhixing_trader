import Link from "next/link";
import { Plus, BarChart3, TrendingUp, Target, Clock, CheckCircle } from "lucide-react";

export default function PlanPage() {
  // 模拟交易计划数据
  const plans = [
    {
      id: 1,
      name: "苹果交易计划",
      symbol: "AAPL",
      entryPrice: "$214.29",
      targetPrice: "$235.71",
      stopLoss: "$203.57",
      status: "计划中",
      statusColor: "bg-red-500",
      description: "从选股结果创建"
    },
    {
      id: 2,
      name: "苹果交易计划",
      symbol: "AAPL", 
      entryPrice: "$214.29",
      targetPrice: "$235.71",
      stopLoss: "$203.57",
      status: "计划中",
      statusColor: "bg-red-500",
      description: "从选股结果创建"
    }
  ];

  const stats = {
    total: 5,
    waiting: 1,
    active: 1,
    completed: 0
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">知行交易</span>
              </Link>
              <nav className="flex space-x-8">
                <Link href="/" className="text-gray-500 hover:text-gray-700">仪表盘</Link>
                <Link href="/plan" className="text-gray-900 font-medium border-b-2 border-blue-500 pb-4">交易计划</Link>
                <Link href="/strategy" className="text-gray-500 hover:text-gray-700">策略管理</Link>
                <Link href="/track" className="text-gray-500 hover:text-gray-700">大佬追踪</Link>
                <Link href="/mindset" className="text-gray-500 hover:text-gray-700">心态建设</Link>
                <Link href="/review" className="text-gray-500 hover:text-gray-700">交易复盘</Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索代码/名称/概念..."
                  className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5z" />
                </svg>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题和操作按钮 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">交易计划</h1>
            <p className="text-gray-600 mt-1">1个提醒已触发</p>
          </div>
          <div className="flex space-x-3">
            <Link 
              href="/plan/create"
              className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>新建计划</span>
            </Link>
          </div>
        </div>

        {/* 交易计划管理标题 */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">交易计划管理</h2>
          <p className="text-gray-600">知行合一，严格执行交易预案</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总计划数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <Target className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">等待入场</p>
                <p className="text-2xl font-bold text-blue-600">{stats.waiting}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">已入场</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">已完成</p>
                <p className="text-2xl font-bold text-gray-600">{stats.completed}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* 交易计划列表 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">交易计划列表</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {plans.map((plan) => (
              <div key={plan.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="w-1 h-16 bg-blue-500 rounded"></div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-lg font-medium text-gray-900">{plan.name}</h4>
                          <span className={`px-2 py-1 text-xs font-medium text-white rounded ${plan.statusColor}`}>
                            {plan.status}
                          </span>
                          <button className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                            待定
                          </button>
                        </div>
                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <span>股票: <span className="font-medium">{plan.symbol}</span></span>
                          <span>入场价: <span className="font-medium">{plan.entryPrice}</span></span>
                          <span>目标价: <span className="font-medium text-green-600">{plan.targetPrice}</span></span>
                          <span>止损: <span className="font-medium text-red-600">{plan.stopLoss}</span></span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/plan/${plan.id}`}
                      className="px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                    >
                      详情
                    </Link>
                    <button className="px-3 py-1 text-sm text-gray-600 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                      重新激活
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}