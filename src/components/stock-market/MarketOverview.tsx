'use client';

import React from 'react';
import { BarChart3, Target, Filter, TrendingUp, RefreshCw } from 'lucide-react';

// 类型定义
export interface MarketStats {
  totalStocks: number;
  totalStrategies: number;
  activeStrategies: number;
  todayOpportunities: number;
}

export interface MarketOverviewProps {
  stats: MarketStats;
  isLoading?: boolean;
  onRefresh?: () => void;
}

// 统计卡片组件
interface StatCardProps {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  value: number;
  label: string;
  color?: string;
  isLoading?: boolean;
}

function StatCard({ icon: Icon, value, label, color = '#3b82f6', isLoading }: StatCardProps) {
  return (
    <div className="card" style={{
      transition: 'all 0.3s',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '8px',
          background: `${color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s'
        }}>
          <Icon size={24} style={{ color }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          {isLoading ? (
            <div style={{
              width: '64px',
              height: '32px',
              background: '#f3f4f6',
              borderRadius: '4px',
              animation: 'pulse 2s infinite'
            }}></div>
          ) : (
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              color: '#1f2937',
              transition: 'color 0.2s'
            }}>
              {formatNumber(value)}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: color,
            animation: 'pulse 2s infinite'
          }}></div>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>活跃</span>
        </div>
      </div>
    </div>
  );
}

// 工具函数
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// 主组件
export function MarketOverview({ stats, isLoading = false, onRefresh }: MarketOverviewProps) {
  const strategyActivationRate = stats.totalStrategies > 0 
    ? Math.round((stats.activeStrategies / stats.totalStrategies) * 100)
    : 0;
  
  const averageStocksPerStrategy = stats.activeStrategies > 0 
    ? Math.round(stats.totalStocks / stats.activeStrategies)
    : 0;
  
  const opportunityRate = stats.totalStocks > 0 
    ? Math.round((stats.todayOpportunities / stats.totalStocks) * 100)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 标题栏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>市场概览</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>实时监控投资组合和市场机会</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="btn btn-primary"
            disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={16} style={{ 
              animation: isLoading ? 'spin 1s linear infinite' : 'none'
            }} />
            <span>{isLoading ? '刷新中...' : '刷新数据'}</span>
          </button>
        )}
      </div>
      
      {/* 统计卡片网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px'
      }}>
        <StatCard
          icon={BarChart3}
          value={stats.totalStocks}
          label="股票池"
          color="#3b82f6"
          isLoading={isLoading}
        />
        <StatCard
          icon={Filter}
          value={stats.totalStrategies}
          label="选股策略"
          color="#06b6d4"
          isLoading={isLoading}
        />
        <StatCard
          icon={Target}
          value={stats.activeStrategies}
          label="启用策略"
          color="#059669"
          isLoading={isLoading}
        />
        <StatCard
          icon={TrendingUp}
          value={stats.todayOpportunities}
          label="今日机会"
          color="#f59e0b"
          isLoading={isLoading}
        />
      </div>
      
      {/* 快速洞察面板 */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>快速洞察</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              background: '#3b82f6',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }}></div>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>实时更新</span>
          </div>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '16px',
            borderRadius: '8px',
            background: 'rgba(243, 244, 246, 0.5)',
            border: '1px solid rgba(229, 231, 235, 0.5)'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>策略启用率</div>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              color: '#3b82f6'
            }}>
              {strategyActivationRate}%
            </div>
            <div style={{ marginTop: '8px' }}>
              <div style={{
                width: '100%',
                background: '#f3f4f6',
                borderRadius: '9999px',
                height: '8px'
              }}>
                <div style={{
                  background: '#3b82f6',
                  height: '8px',
                  borderRadius: '9999px',
                  transition: 'all 0.5s',
                  width: `${strategyActivationRate}%`
                }}></div>
              </div>
            </div>
          </div>
          
          <div style={{
            textAlign: 'center',
            padding: '16px',
            borderRadius: '8px',
            background: 'rgba(243, 244, 246, 0.5)',
            border: '1px solid rgba(229, 231, 235, 0.5)'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>平均每策略股票</div>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              color: '#06b6d4'
            }}>
              {averageStocksPerStrategy}
            </div>
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                {stats.totalStocks} 股票 / {stats.activeStrategies} 策略
              </span>
            </div>
          </div>
          
          <div style={{
            textAlign: 'center',
            padding: '16px',
            borderRadius: '8px',
            background: 'rgba(243, 244, 246, 0.5)',
            border: '1px solid rgba(229, 231, 235, 0.5)'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>机会发现率</div>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              color: opportunityRate > 50 ? '#059669' : opportunityRate > 20 ? '#f59e0b' : '#dc2626'
            }}>
              {opportunityRate}%
            </div>
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                {stats.todayOpportunities} 机会 / {stats.totalStocks} 股票
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 默认导出
export default MarketOverview;