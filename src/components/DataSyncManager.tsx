'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { apiGet, apiPost, API_ENDPOINTS } from '../utils/api';

interface SyncStatus {
  is_syncing: boolean;
  last_sync_time: string | null;
  next_sync_time: string | null;
}

interface SyncResult {
  success: boolean;
  message: string;
  sync_type?: string;
  start_time?: string;
  status?: string;
  sync_result?: any;
}

interface DataStatistics {
  total_records: number;
  symbols: string[];
  timeframes: string[];
}

export default function DataSyncManager() {
  const [mounted, setMounted] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [dataStats, setDataStats] = useState<DataStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [failedList, setFailedList] = useState<string[]>([]);
  const [watchlistCount, setWatchlistCount] = useState(0);

  // 获取同步状态
  const fetchSyncStatus = async () => {
    try {
      const response = await apiGet(API_ENDPOINTS.SYNC_STATUS);
      const data = await response.json();

      if (data.success) {
        setSyncStatus(data.sync_status);
        setDataStats(data.data_statistics);
        setWatchlistCount(data.watchlist_count);
      }
    } catch (error) {
      console.error('获取同步状态失败:', error);
    }
  };

  // 获取最近一次同步结果（包含失败详情）
  const fetchLastResult = async () => {
    try {
      const res = await apiGet(API_ENDPOINTS.SYNC_LAST_RESULT);
      const data = await res.json();
      if (data?.success) {
        const lr = data.data;
        setLastSyncResult({ success: lr?.status === 'completed', message: lr?.status || 'unknown', sync_result: lr });
        const details = lr?.details || {};
        const failed = Object.keys(details).filter(sym => details[sym]?.success === false);
        setFailedList(failed);
      }
    } catch (e) {
      // ignore
    }
  };

  // 触发数据同步
  const triggerSync = async (forceFullSync: boolean = false) => {
    setIsLoading(true);
    try {
      const response = await apiPost(API_ENDPOINTS.SYNC_TRIGGER(forceFullSync));
      const result = await response.json();

      setLastSyncResult(result);

      if (result.success) {
        // 同步开始后，定期检查状态
        setTimeout(() => {
          fetchSyncStatus();
          fetchLastResult();
        }, 2000);
      }
    } catch (error) {
      console.error('触发同步失败:', error);
      setLastSyncResult({
        success: false,
        message: `触发同步失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 组件加载时获取状态
  useEffect(() => {
    setMounted(true);
    fetchSyncStatus();
    fetchLastResult();

    // 定期刷新状态
    const interval = setInterval(fetchSyncStatus, 30000); // 30秒刷新一次

    return () => clearInterval(interval);
  }, []);

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '从未同步';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getSyncStatusColor = () => {
    if (syncStatus?.is_syncing) return 'text-blue-600';
    if (lastSyncResult?.success) return 'text-green-600';
    if (lastSyncResult?.success === false) return 'text-red-600';
    return 'text-gray-600';
  };

  const getSyncStatusText = () => {
    if (syncStatus?.is_syncing) return '同步中...';
    if (lastSyncResult?.success) return '同步成功';
    if (lastSyncResult?.success === false) return '同步失败';
    return '待同步';
  };

  // 避免hydration错误
  if (!mounted) {
    return (
      <div className="bg-surface rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">数据同步管理</h2>
          <div className="text-sm font-medium text-gray-600">加载中...</div>
        </div>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">数据同步管理</h2>
        <div className={`text-sm font-medium ${getSyncStatusColor()}`}>
          {getSyncStatusText()}
        </div>
      </div>

      {/* 同步状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">自选股数量</div>
          <div className="text-2xl font-bold text-gray-900">{watchlistCount}</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">K线记录</div>
          <div className="text-2xl font-bold text-gray-900">
            {dataStats?.total_records || 0}
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">数据维度</div>
          <div className="text-2xl font-bold text-gray-900">
            {dataStats?.timeframes?.length || 0}
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">最后同步</div>
          <div className="text-sm font-medium text-gray-900">
            {formatDateTime(syncStatus?.last_sync_time || null)}
          </div>
        </div>
      </div>

      {/* 同步操作按钮 */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => triggerSync(false)}
          disabled={isLoading || syncStatus?.is_syncing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '启动中...' : '增量同步'}
        </button>

        <button
          onClick={() => triggerSync(true)}
          disabled={isLoading || syncStatus?.is_syncing}
          className="px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '启动中...' : '全量同步'}
        </button>

        <button
          onClick={fetchSyncStatus}
          className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          刷新状态
        </button>
      </div>

      {/* 同步结果显示 */}
      {lastSyncResult && (
        <div className={`rounded-lg p-4 mb-4 ${
          lastSyncResult.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className={`text-sm font-medium ${
            lastSyncResult.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {lastSyncResult.message}
          </div>
          
          {lastSyncResult.sync_result && (
            <div className="mt-2 text-xs text-gray-600">
              <div>同步类型: {lastSyncResult.sync_result.sync_type}</div>
              <div>成功股票: {lastSyncResult.sync_result.success_stocks}/{lastSyncResult.sync_result.total_stocks}</div>
              <div>日线记录: {lastSyncResult.sync_result.daily_records} 条</div>
              <div>小时线记录: {lastSyncResult.sync_result.hourly_records} 条</div>
              <div>耗时: {lastSyncResult.sync_result.duration_seconds} 秒</div>
              {failedList.length > 0 && (
                <div className="mt-2">
                  <div className="text-red-700 font-medium">失败股票（{failedList.length}）:</div>
                  <div className="mt-1 max-h-24 overflow-y-auto text-red-700">
                    {failedList.join(', ')}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const r = await apiPost(API_ENDPOINTS.SYNC_RETRY_FAILED(false));
                          const d = await r.json();
                          if (d?.success) {
                            setTimeout(() => { fetchSyncStatus(); fetchLastResult(); }, 2000);
                          }
                        } catch {}
                      }}
                      className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded"
                    >
                      重试失败（增量）
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const r = await apiPost(API_ENDPOINTS.SYNC_RETRY_FAILED(true));
                          const d = await r.json();
                          if (d?.success) {
                            setTimeout(() => { fetchSyncStatus(); fetchLastResult(); }, 2000);
                          }
                        } catch {}
                      }}
                      className="px-3 py-1 border border-orange-600 text-orange-700 hover:bg-orange-50 rounded"
                    >
                      重试失败（全量）
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 数据统计详情 */}
      {dataStats && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">数据详情</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-600 mb-2">支持的时间维度</div>
              <div className="flex flex-wrap gap-1">
                {dataStats.timeframes?.map(tf => (
                  <span key={tf} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {tf}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <div className="text-xs text-gray-600 mb-2">已同步股票 ({dataStats.symbols?.length || 0})</div>
              <div className="text-xs text-gray-800 max-h-20 overflow-y-auto">
                {dataStats.symbols?.join(', ') || '暂无数据'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 同步说明 */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">同步说明</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <div>• <strong>增量同步</strong>: 只下载最近30天日线和7天小时线数据，速度快</div>
          <div>• <strong>全量同步</strong>: 下载1年日线和60天小时线数据，数据完整</div>
          <div>• 建议每天开盘前进行增量同步，每周进行一次全量同步</div>
          <div>• 同步完成后，选股策略将使用本地数据，提升执行速度</div>
        </div>
      </div>
    </div>
  );
}
