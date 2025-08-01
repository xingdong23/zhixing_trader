"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/shared/ui/Card';
import { Button } from '@/components/shared/ui/Button';
import { Input } from '@/components/shared/ui/Form';
import { Textarea } from '@/components/shared/ui/Form';

interface TradingPlanData {
  stock_code: string;
  stock_name: string;
  plan_type: string;
  trade_direction: string;
  trade_type: string;
  buy_reason: string;
  target_price: number;
  position_size: number;
  stop_loss_price: number;
  stop_loss_ratio: number;
  take_profit_price?: number;
  take_profit_ratio?: number;
  expected_hold_period?: string;
}

interface TradingPlanFormProps {
  onPlanCreated?: (planId: string) => void;
}

export default function TradingPlanForm({ onPlanCreated }: TradingPlanFormProps) {
  const [formData, setFormData] = useState<TradingPlanData>({
    stock_code: '',
    stock_name: '',
    plan_type: 'swing_trading',
    trade_direction: 'buy',
    trade_type: 'medium_swing',
    buy_reason: '',
    target_price: 0,
    position_size: 10,
    stop_loss_price: 0,
    stop_loss_ratio: 8,
    take_profit_price: 0,
    take_profit_ratio: 15,
    expected_hold_period: '1-4周'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (field: keyof TradingPlanData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.stock_code.trim()) return '请输入股票代码';
    if (!formData.stock_name.trim()) return '请输入股票名称';
    if (!formData.buy_reason.trim() || formData.buy_reason.length < 10) {
      return '买入理由必须至少10个字符';
    }
    if (formData.target_price <= 0) return '目标价格必须大于0';
    if (formData.position_size <= 0 || formData.position_size > 100) {
      return '仓位大小必须在0-100%之间';
    }
    if (formData.stop_loss_price <= 0) return '止损价格必须大于0';
    if (formData.stop_loss_ratio <= 0) return '止损比例必须大于0';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/v1/trading-discipline/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`交易计划创建成功！计划ID: ${result.data.plan_id}`);
        setSuccess(`计划评分: ${result.data.plan_score}分，风险收益比: ${result.data.risk_reward_ratio}`);
        
        // 重置表单
        setFormData({
          stock_code: '',
          stock_name: '',
          plan_type: 'swing_trading',
          trade_direction: 'buy',
          trade_type: 'medium_swing',
          buy_reason: '',
          target_price: 0,
          position_size: 10,
          stop_loss_price: 0,
          stop_loss_ratio: 8,
          take_profit_price: 0,
          take_profit_ratio: 15,
          expected_hold_period: '1-4周'
        });

        if (onPlanCreated && result.data.plan_id) {
          onPlanCreated(result.data.plan_id);
        }
      } else {
        setError(result.error || '创建交易计划失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('Error creating trading plan:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader title="📋 创建交易计划" subtitle="强制制定交易计划，培养纪律性交易习惯" />
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                股票代码 <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.stock_code}
                onChange={(e) => handleInputChange('stock_code', e.target.value)}
                placeholder="如: AAPL, TSLA"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                股票名称 <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.stock_name}
                onChange={(e) => handleInputChange('stock_name', e.target.value)}
                placeholder="如: 苹果公司, 特斯拉"
                required
              />
            </div>
          </div>

          {/* 交易类型 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                计划类型 <span className="text-red-500">*</span>
              </label>
              <select 
                value={formData.plan_type} 
                onChange={(e) => handleInputChange('plan_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="short_term">短线交易</option>
                <option value="swing_trading">波段交易</option>
                <option value="value_investment">价值投资</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                交易方向 <span className="text-red-500">*</span>
              </label>
              <select 
                value={formData.trade_direction} 
                onChange={(e) => handleInputChange('trade_direction', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="buy">买入</option>
                <option value="sell">卖出</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                交易类型 <span className="text-red-500">*</span>
              </label>
              <select 
                value={formData.trade_type} 
                onChange={(e) => handleInputChange('trade_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="short_swing">短期波段 (1-7天)</option>
                <option value="medium_swing">中期波段 (1-8周)</option>
                <option value="long_investment">长期投资 (3个月+)</option>
              </select>
            </div>
          </div>

          {/* 买入理由 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              买入理由 <span className="text-red-500">*</span>
              <span className="text-gray-500 text-xs">(至少10个字符，包含技术面、基本面、消息面分析)</span>
            </label>
            <Textarea
              value={formData.buy_reason}
              onChange={(e) => handleInputChange('buy_reason', e.target.value)}
              placeholder="详细说明买入理由，包括：&#10;1. 技术面分析（趋势、支撑阻力、技术指标等）&#10;2. 基本面分析（公司业绩、行业前景等）&#10;3. 消息面分析（政策、新闻、市场情绪等）"
              rows={4}
              required
            />
          </div>

          {/* 价格和仓位 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                目标买入价格 <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.target_price}
                onChange={(e) => handleInputChange('target_price', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                仓位大小 (%) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.position_size}
                onChange={(e) => handleInputChange('position_size', parseFloat(e.target.value) || 0)}
                placeholder="10"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                预期持有周期
              </label>
              <select 
                value={formData.expected_hold_period} 
                onChange={(e) => handleInputChange('expected_hold_period', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1-7天">1-7天</option>
                <option value="1-4周">1-4周</option>
                <option value="1-3月">1-3月</option>
                <option value="3-12月">3-12月</option>
                <option value="1年以上">1年以上</option>
              </select>
            </div>
          </div>

          {/* 风险控制 */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">⚠️ 风险控制设置</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  止损价格 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.stop_loss_price}
                  onChange={(e) => handleInputChange('stop_loss_price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  止损比例 (%) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.stop_loss_ratio}
                  onChange={(e) => handleInputChange('stop_loss_ratio', parseFloat(e.target.value) || 0)}
                  placeholder="8.0"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  止盈价格
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.take_profit_price}
                  onChange={(e) => handleInputChange('take_profit_price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  止盈比例 (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.take_profit_ratio}
                  onChange={(e) => handleInputChange('take_profit_ratio', parseFloat(e.target.value) || 0)}
                  placeholder="15.0"
                />
              </div>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-center pt-6">
            <Button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-8 py-3"
            >
              {loading ? '创建中...' : '🚀 创建交易计划'}
            </Button>
          </div>

          {/* 消息提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <strong>错误：</strong> {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              <strong>成功：</strong> {success}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}