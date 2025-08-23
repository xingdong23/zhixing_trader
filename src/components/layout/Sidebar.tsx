'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ClipboardList, 
  ClipboardCheck, 
  Target, 
  HeartPulse, 
  BarChart3,
  TrendingUp 
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<any>;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: '仪表盘',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    id: 'plans',
    label: '交易计划',
    href: '/plans',
    icon: ClipboardList,
  },
  {
    id: 'strategies',
    label: '策略管理',
    href: '/strategies',
    icon: ClipboardCheck,
  },
  {
    id: 'influencer-tracking',
    label: '大佬追踪',
    href: '/influencer-tracking',
    icon: Target,
  },
  {
    id: 'mindset',
    label: '心态建设',
    href: '/mindset',
    icon: HeartPulse,
  },
  {
    id: 'review',
    label: '交易复盘',
    href: '/review',
    icon: BarChart3,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav 
      className="flex flex-col p-6 border-r transition-all duration-300"
      style={{ 
        width: '240px',
        backgroundColor: 'var(--sidebar-bg)',
        borderColor: 'var(--border-color)'
      }}
    >
      {/* 侧边栏头部 */}
      <div 
        className="flex items-center gap-3 pb-6 border-b mb-6"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <TrendingUp className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          知行交易
        </h1>
      </div>

      {/* 导航菜单 */}
      <ul className="flex-1 list-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <li key={item.id} style={{ marginBottom: '8px' }}>
              <Link
                href={item.href}
                className="flex items-center gap-4 px-4 py-3 rounded-lg font-medium transition-all duration-200 no-underline"
                style={{
                  backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  boxShadow: isActive ? '0 4px 12px rgba(0, 170, 255, 0.2)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--surface-bg)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* 侧边栏底部 - 用户信息 */}
      <div 
        className="pt-4 border-t"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div 
          className="flex items-center gap-3 p-2 rounded-lg"
          style={{ backgroundColor: 'var(--surface-bg)' }}
        >
          <img 
            src="https://placehold.co/80x80/00aaff/ffffff?text=U" 
            alt="User Avatar"
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1">
            <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              交易者
            </h4>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              知行合一
            </p>
          </div>
        </div>
      </div>
    </nav>
  );
}
