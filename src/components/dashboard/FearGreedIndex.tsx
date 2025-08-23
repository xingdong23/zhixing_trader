'use client';

import React, { useState, useEffect } from 'react';

interface FearGreedIndexProps {
  value?: number;
}

export default function FearGreedIndex({ value = 28 }: FearGreedIndexProps) {
  const [currentValue, setCurrentValue] = useState(value);

  // 根据指数值确定状态 - 完全按照HTML的逻辑
  const getStatus = (val: number) => {
    if (val <= 20) return { text: '极度恐惧', desc: '市场极度悲观，可能是机会区。', color: '#d32f2f' };
    if (val <= 40) return { text: '恐惧', desc: '投资者情绪悲观，保持关注。', color: '#f57c00' };
    if (val <= 60) return { text: '中性', desc: '市场情绪平稳，多空平衡。', color: '#fdd835' };
    if (val <= 80) return { text: '贪婪', desc: '投资者情绪乐观，注意风险。', color: '#7cb342' };
    return { text: '极度贪婪', desc: '市场极度乐观，风险积聚。', color: '#43a047' };
  };

  const status = getStatus(currentValue);
  // HTML中的计算方式：-90 + (28 / 100) * 180 = -90 + 50.4 = -39.6度
  const needleAngle = -90 + (currentValue / 100) * 180;

  return (
    <div 
      className="rounded-xl border p-5 mb-6"
      style={{ 
        backgroundColor: 'var(--surface-bg)',
        borderColor: 'var(--border-color)'
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '24px', alignItems: 'center' }}>
        {/* 恐慌贪婪指数仪表盘 - 完全按照HTML实现 */}
        <div className="text-center">
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', color: 'var(--text-primary)' }}>
            恐慌贪婪指数
          </h3>
          
          {/* 仪表盘容器 - 完全按照HTML的尺寸和样式 */}
          <div 
            className="relative mx-auto"
            style={{ 
              width: '200px', 
              height: '100px', 
              overflow: 'hidden',
              marginBottom: '20px'
            }}
          >
            {/* 背景半圆 - 完全按照HTML的渐变 */}
            <div 
              style={{
                width: '100%',
                height: '200px',
                background: 'conic-gradient(from -90deg at 50% 100%, #d32f2f 0%, #f57c00 25%, #fdd835 50%, #7cb342 75%, #43a047 100%)',
                borderRadius: '200px 200px 0 0'
              }}
            />
            
            {/* 内部遮罩 - 完全按照HTML的尺寸 */}
            <div 
              style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                width: '180px',
                height: '90px',
                background: 'var(--surface-bg)',
                borderRadius: '180px 180px 0 0'
              }}
            />
            
            {/* 指针 - 完全按照HTML的样式和位置 */}
            <div 
              style={{
                position: 'absolute',
                bottom: '0',
                left: '50%',
                width: '2px',
                height: '80px',
                background: 'var(--text-primary)',
                transformOrigin: 'bottom center',
                transform: `translateX(-50%) rotate(${needleAngle}deg)`,
                transition: 'transform 0.8s ease-out'
              }}
            />
            
            {/* 中心点 - 完全按照HTML的尺寸和位置 */}
            <div 
              style={{
                position: 'absolute',
                bottom: '-5px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '10px',
                height: '10px',
                background: 'var(--text-primary)',
                borderRadius: '50%'
              }}
            />
          </div>
          
          {/* 状态文本 - 完全按照HTML的样式 */}
          <div style={{ textAlign: 'center', marginTop: '-20px' }}>
            <div 
              style={{ 
                fontSize: '22px', 
                fontWeight: '600', 
                marginBottom: '4px',
                color: status.color 
              }}
            >
              {status.text} ({currentValue})
            </div>
            <div 
              style={{ 
                fontSize: '14px',
                color: 'var(--text-secondary)',
                marginTop: '4px'
              }}
            >
              {status.desc}
            </div>
          </div>
        </div>

        {/* 历史走势 - 完全按照HTML的结构 */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>
            历史走势
          </h3>
          <div 
            style={{ 
              height: '150px',
              backgroundColor: 'var(--bg-color)',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div style={{ color: 'var(--text-secondary)' }}>历史走势图表</div>
          </div>
        </div>
      </div>
    </div>
  );
}
