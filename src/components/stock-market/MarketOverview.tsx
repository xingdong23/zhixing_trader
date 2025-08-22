'use client';

import React from 'react';
import { BarChart3, Target, Filter, TrendingUp, RefreshCw, Activity, Zap } from 'lucide-react';

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
  gradient: string;
  isLoading?: boolean;
  index: number;
}

function StatCard({ icon: Icon, value, label, gradient, isLoading, index }: StatCardProps) {
  return (
    <div 
      className="glass-card animate-slide-up"
      style={{
        animationDelay: `${index * 0.1}s`,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* 渐变装饰 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: gradient
      }} />

      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
          }}>
            <Icon size={28} />
          </div>
          <div style={{ textAlign: 'right' }}>
            {isLoading ? (
              <div style={{
                width: '80px',
                height: '36px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                animation: 'pulse 2s infinite'
              }}></div>
            ) : (
              <div style={{
                fontSize: '36px',
                fontWeight: '700',
                fontFamily: 'Monaco, monospace',
                color: 'var(--text-primary)',
                lineHeight: 1
              }}>
                {formatNumber(value)}
              </div>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            color: 'var(--text-primary)' 
          }}>
            {label}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: gradient,
              boxShadow: `0 0 8px ${gradient}40`,
              animation: 'pulse 2s infinite'
            }}></div>
            <span style={{ 
              fontSize: '12px', 
              color: 'var(--text-secondary)',
              fontWeight: '500'
            }}>
              活跃
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 洞察卡片组件
function InsightCard({ 
  title, 
  value, 
  subtitle, 
  color, 
  percentage 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  color: string; 
  percentage?: number; 
}) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '20px',
      borderRadius: '12px',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid var(--border)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ 
        fontSize: '14px', 
        color: 'var(--text-secondary)', 
        marginBottom: '12px',
        fontWeight: '500'
      }}>
        {title}
      </div>
      <div style={{
        fontSize: '28px',
        fontWeight: '700',
        fontFamily: 'Monaco, monospace',
        color: color,
        marginBottom: '8px'
      }}>
        {value}
      </div>
      {percentage !== undefined && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            height: '6px'
          }}>
            <div style={{
              background: color,
              height: '6px',
              borderRadius: '20px',
              transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              width: `${Math.min(percentage, 100)}%`,
              boxShadow: `0 0 8px ${color}40`
            }}></div>
          </div>
        </div>
      )}
      {subtitle && (
        <div style={{ 
          fontSize: '12px', 
          color: 'var(--text-secondary)',
          fontWeight: '500'
        }}>
          {subtitle}
        </div>
      )}
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
      <div className="glass-card animate-slide-up" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '24px'
      }}>
        <div>
          <h2 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: 'var(--text-primary)', 
            margin: 0,
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--success) 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            市场概览
          </h2>
          <p style={{ 
            fontSize: '14px', 
            color: 'var(--text-secondary)', 
            marginTop: '4px',
            fontWeight: '500'
          }}>
            实时监控投资组合和市场机会
          </p>
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        <StatCard
          icon={BarChart3}
          value={stats.totalStocks}
          label="股票池"
          gradient="linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)"
          isLoading={isLoading}
          index={0}
        />
        <StatCard
          icon={Filter}
          value={stats.totalStrategies}
          label="选股策略"
          gradient="linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)"
          isLoading={isLoading}
          index={1}
        />
        <StatCard
          icon={Target}
          value={stats.activeStrategies}
          label="启用策略"
          gradient="linear-gradient(135deg, var(--success) 0%, #00cc6a 100%)"
          isLoading={isLoading}
          index={2}
        />
        <StatCard
          icon={TrendingUp}
          value={stats.todayOpportunities}
          label="今日机会"
          gradient="linear-gradient(135deg, var(--warning) 0%, #f97316 100%)"
          isLoading={isLoading}
          index={3}
        />
      </div>
      
      {/* 快速洞察面板 */}
      <div className="glass-card animate-slide-up" style={{ padding: '32px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '24px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Zap size={20} />
            </div>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: 'var(--text-primary)', 
              margin: 0 
            }}>
              智能洞察
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} style={{ color: 'var(--success)' }} />
            <span style={{ 
              fontSize: '12px', 
              color: 'var(--text-secondary)',
              fontWeight: '500'
            }}>
              实时更新
            </span>
          </div>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px'
        }}>
          <InsightCard
            title="策略启用率"
            value={`${strategyActivationRate}%`}
            subtitle={`${stats.activeStrategies} / ${stats.totalStrategies} 策略`}
            color="var(--primary)"
            percentage={strategyActivationRate}
          />
          
          <InsightCard
            title="平均覆盖度"
            value={averageStocksPerStrategy}
            subtitle={`${stats.totalStocks} 股票 / ${stats.activeStrategies} 策略`}
            color="#06b6d4"
          />
          
          <InsightCard
            title="机会发现率"
            value={`${opportunityRate}%`}
            subtitle={`${stats.todayOpportunities} 机会 / ${stats.totalStocks} 股票`}
            color={opportunityRate > 50 ? 'var(--success)' : opportunityRate > 20 ? 'var(--warning)' : 'var(--danger)'}
            percentage={opportunityRate}
          />
        </div>
      </div>
    </div>
  );
}

// 默认导出
export default MarketOverview;