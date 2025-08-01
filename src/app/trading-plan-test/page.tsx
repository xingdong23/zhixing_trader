"use client";

import { useState } from 'react';
import TradingPlanForm from '@/components/TradingPlanForm';

export default function TradingPlanTestPage() {
  const [createdPlans, setCreatedPlans] = useState<string[]>([]);

  const handlePlanCreated = (planId: string) => {
    setCreatedPlans(prev => [planId, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎯 交易纪律管理系统 - 测试页面
          </h1>
          <p className="text-gray-600">
            测试强制交易计划制定功能
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：交易计划表单 */}
          <div className="lg:col-span-2">
            <TradingPlanForm onPlanCreated={handlePlanCreated} />
          </div>

          {/* 右侧：已创建的计划列表 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">📋 最近创建的计划</h3>
              {createdPlans.length === 0 ? (
                <p className="text-gray-500 text-sm">暂无交易计划</p>
              ) : (
                <div className="space-y-2">
                  {createdPlans.map((planId, index) => (
                    <div key={planId} className="bg-gray-50 rounded p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">计划 #{index + 1}</span>
                        <span className="text-xs text-gray-500">{planId.slice(0, 8)}...</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        创建时间: {new Date().toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">💡 使用说明</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• 所有必填字段必须完整填写</li>
                <li>• 买入理由至少需要10个字符</li>
                <li>• 仓位大小限制在0-100%之间</li>
                <li>• 系统会自动计算计划评分</li>
                <li>• 计划创建后可以锁定防止情绪化修改</li>
              </ul>
            </div>

            <div className="bg-blue-50 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-900">🎯 核心功能</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• <strong>强制计划制定</strong>：交易前必须完成详细计划</li>
                <li>• <strong>计划评分系统</strong>：自动评估计划完整性</li>
                <li>• <strong>风险收益比计算</strong>：科学评估交易风险</li>
                <li>• <strong>计划锁定机制</strong>：防止情绪化修改</li>
                <li>• <strong>纪律执行追踪</strong>：记录计划执行情况</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}