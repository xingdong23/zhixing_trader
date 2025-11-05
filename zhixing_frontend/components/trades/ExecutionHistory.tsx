'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Clock, DollarSign, TrendingUp, Plus, X, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface TradeExecution {
  id: number;
  tradeId: number;
  executionTime: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  amount: number;
  commission: number;
  slippage: number;
  orderId?: string;
  executionId?: string;
  notes?: string;
  source: 'manual' | 'ibkr' | 'longbridge';
}

interface ExecutionHistoryProps {
  tradeId: number;
  symbol: string;
  planPrice?: number;
  executions?: TradeExecution[];
  onAddExecution?: (execution: Omit<TradeExecution, 'id'>) => void;
}

export function ExecutionHistory({ 
  tradeId, 
  symbol, 
  planPrice = 0,
  executions: initialExecutions = [],
  onAddExecution 
}: ExecutionHistoryProps) {
  const [executions, setExecutions] = useState<TradeExecution[]>(initialExecutions);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // 新执行记录表单
  const [newExecution, setNewExecution] = useState({
    side: 'buy' as 'buy' | 'sell',
    quantity: '',
    price: '',
    commission: '',
    executionTime: new Date().toISOString().slice(0, 16),
    notes: ''
  });

  // 计算汇总信息
  const calculateSummary = () => {
    if (executions.length === 0) {
      return {
        totalExecutions: 0,
        totalQuantity: 0,
        averagePrice: 0,
        totalCommission: 0,
        averageSlippage: 0,
        totalAmount: 0,
        firstExecutionTime: '',
        lastExecutionTime: ''
      };
    }

    const buyExecutions = executions.filter(e => e.side === 'buy');
    const sellExecutions = executions.filter(e => e.side === 'sell');

    const totalBuyQuantity = buyExecutions.reduce((sum, e) => sum + e.quantity, 0);
    const totalBuyAmount = buyExecutions.reduce((sum, e) => sum + e.amount, 0);
    const totalSellQuantity = sellExecutions.reduce((sum, e) => sum + e.quantity, 0);
    const totalSellAmount = sellExecutions.reduce((sum, e) => sum + e.amount, 0);

    const netQuantity = totalBuyQuantity - totalSellQuantity;
    const averageBuyPrice = totalBuyQuantity > 0 ? totalBuyAmount / totalBuyQuantity : 0;
    const averageSellPrice = totalSellQuantity > 0 ? totalSellAmount / totalSellQuantity : 0;
    
    const totalCommission = executions.reduce((sum, e) => sum + e.commission, 0);
    const averageSlippage = executions.reduce((sum, e) => sum + Math.abs(e.slippage), 0) / executions.length;

    const sortedTimes = executions.map(e => e.executionTime).sort();

    return {
      totalExecutions: executions.length,
      buyExecutions: buyExecutions.length,
      sellExecutions: sellExecutions.length,
      totalBuyQuantity,
      totalSellQuantity,
      netQuantity,
      averageBuyPrice,
      averageSellPrice,
      totalCommission,
      averageSlippage,
      totalBuyAmount,
      totalSellAmount,
      firstExecutionTime: sortedTimes[0],
      lastExecutionTime: sortedTimes[sortedTimes.length - 1]
    };
  };

  const summary = calculateSummary();

  // 添加执行记录
  const handleAddExecution = () => {
    const quantity = parseFloat(newExecution.quantity);
    const price = parseFloat(newExecution.price);
    const commission = parseFloat(newExecution.commission || '0');

    if (!quantity || !price) {
      toast.error('请填写数量和价格');
      return;
    }

    const amount = quantity * price;
    const slippage = planPrice > 0 ? ((price - planPrice) / planPrice) * 100 : 0;

    const execution: TradeExecution = {
      id: Date.now(),
      tradeId,
      side: newExecution.side,
      quantity,
      price,
      amount,
      commission,
      slippage,
      executionTime: newExecution.executionTime,
      notes: newExecution.notes,
      source: 'manual'
    };

    setExecutions([...executions, execution]);
    
    if (onAddExecution) {
      onAddExecution(execution);
    }

    // 保存到localStorage
    const allExecutions = JSON.parse(localStorage.getItem('trade_executions') || '{}');
    allExecutions[tradeId] = [...(allExecutions[tradeId] || []), execution];
    localStorage.setItem('trade_executions', JSON.stringify(allExecutions));

    toast.success('执行记录已添加');
    setShowAddDialog(false);
    
    // 重置表单
    setNewExecution({
      side: 'buy',
      quantity: '',
      price: '',
      commission: '',
      executionTime: new Date().toISOString().slice(0, 16),
      notes: ''
    });
  };

  // 删除执行记录
  const handleDeleteExecution = (executionId: number) => {
    setExecutions(executions.filter(e => e.id !== executionId));
    
    const allExecutions = JSON.parse(localStorage.getItem('trade_executions') || '{}');
    allExecutions[tradeId] = executions.filter(e => e.id !== executionId);
    localStorage.setItem('trade_executions', JSON.stringify(allExecutions));
    
    toast.success('执行记录已删除');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>执行记录</CardTitle>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> 添加执行
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 汇总信息 */}
        {executions.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">总执行次数</p>
                <p className="text-lg font-semibold">{summary.totalExecutions} 次</p>
                <p className="text-xs text-gray-400">
                  买入{summary.buyExecutions}次 / 卖出{summary.sellExecutions}次
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">净持仓</p>
                <p className="text-lg font-semibold">{summary.netQuantity} 股</p>
                <p className="text-xs text-gray-400">
                  买入{summary.totalBuyQuantity} / 卖出{summary.totalSellQuantity}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">平均价格</p>
                {(summary.averageBuyPrice ?? 0) > 0 && (
                  <p className="text-sm font-semibold text-green-600">
                    买: ${(summary.averageBuyPrice ?? 0).toFixed(2)}
                  </p>
                )}
                {(summary.averageSellPrice ?? 0) > 0 && (
                  <p className="text-sm font-semibold text-red-600">
                    卖: ${(summary.averageSellPrice ?? 0).toFixed(2)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">总佣金</p>
                <p className="text-lg font-semibold text-red-600">
                  ${summary.totalCommission.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">
                  平均滑点: {summary.averageSlippage.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* 执行列表 */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                执行明细
              </h3>
              {executions
                .sort((a, b) => new Date(b.executionTime).getTime() - new Date(a.executionTime).getTime())
                .map((exec) => (
                  <div
                    key={exec.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Badge 
                        className={`px-2 py-1 text-xs font-semibold ${
                          exec.side === 'buy' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        }`}
                      >
                        {exec.side === 'buy' ? '买入' : '卖出'}
                      </Badge>
                      
                      <div className="flex-1">
                        <p className="font-semibold">
                          {exec.quantity} 股 @ ${exec.price.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {new Date(exec.executionTime).toLocaleString('zh-CN')}
                          {exec.source !== 'manual' && (
                            <Badge variant="outline" className="text-xs">
                              {exec.source === 'ibkr' ? 'IBKR' : 'Longbridge'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold">${exec.amount.toFixed(2)}</p>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <p>佣金: ${exec.commission.toFixed(2)}</p>
                        {exec.slippage !== 0 && (
                          <p className={exec.slippage > 0 ? 'text-red-500' : 'text-green-500'}>
                            滑点: {exec.slippage > 0 ? '+' : ''}{exec.slippage.toFixed(2)}%
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 ml-2"
                      onClick={() => handleDeleteExecution(exec.id)}
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
            </div>

            {/* 时间跨度 */}
            {summary.firstExecutionTime && summary.lastExecutionTime && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  ⏱️ 执行时间跨度: {' '}
                  {new Date(summary.firstExecutionTime).toLocaleString('zh-CN')} 
                  {' '} 至 {' '}
                  {new Date(summary.lastExecutionTime).toLocaleString('zh-CN')}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无执行记录</p>
            <p className="text-sm mt-1">点击"添加执行"按钮记录交易执行详情</p>
          </div>
        )}
      </CardContent>

      {/* 添加执行记录对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加执行记录 - {symbol}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 买卖方向 */}
            <div>
              <Label>买卖方向</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={newExecution.side === 'buy' ? 'default' : 'outline'}
                  className={newExecution.side === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}
                  onClick={() => setNewExecution({ ...newExecution, side: 'buy' })}
                >
                  买入
                </Button>
                <Button
                  variant={newExecution.side === 'sell' ? 'default' : 'outline'}
                  className={newExecution.side === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}
                  onClick={() => setNewExecution({ ...newExecution, side: 'sell' })}
                >
                  卖出
                </Button>
              </div>
            </div>

            {/* 数量 */}
            <div>
              <Label htmlFor="quantity">数量 (股)</Label>
              <Input
                id="quantity"
                type="number"
                value={newExecution.quantity}
                onChange={(e) => setNewExecution({ ...newExecution, quantity: e.target.value })}
                placeholder="100"
              />
            </div>

            {/* 价格 */}
            <div>
              <Label htmlFor="price">成交价格 ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={newExecution.price}
                onChange={(e) => setNewExecution({ ...newExecution, price: e.target.value })}
                placeholder="150.00"
              />
              {planPrice > 0 && newExecution.price && (
                <p className="text-xs text-gray-500 mt-1">
                  计划价格: ${planPrice.toFixed(2)} | 
                  偏差: {(((parseFloat(newExecution.price) - planPrice) / planPrice) * 100).toFixed(2)}%
                </p>
              )}
            </div>

            {/* 佣金 */}
            <div>
              <Label htmlFor="commission">佣金 ($, 可选)</Label>
              <Input
                id="commission"
                type="number"
                step="0.01"
                value={newExecution.commission}
                onChange={(e) => setNewExecution({ ...newExecution, commission: e.target.value })}
                placeholder="1.00"
              />
            </div>

            {/* 执行时间 */}
            <div>
              <Label htmlFor="executionTime">执行时间</Label>
              <Input
                id="executionTime"
                type="datetime-local"
                value={newExecution.executionTime}
                onChange={(e) => setNewExecution({ ...newExecution, executionTime: e.target.value })}
              />
            </div>

            {/* 备注 */}
            <div>
              <Label htmlFor="notes">备注 (可选)</Label>
              <Input
                id="notes"
                value={newExecution.notes}
                onChange={(e) => setNewExecution({ ...newExecution, notes: e.target.value })}
                placeholder="部分成交, 订单号..."
              />
            </div>

            {/* 计算金额 */}
            {newExecution.quantity && newExecution.price && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-sm font-medium">
                  成交金额: ${(parseFloat(newExecution.quantity) * parseFloat(newExecution.price)).toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddExecution}>
              确认添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

