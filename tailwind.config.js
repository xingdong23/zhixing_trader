/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // 知行交易系统 - 自定义设计系统
      colors: {
        // 主色调系统
        primary: {
          DEFAULT: '#00d4ff',
          dark: '#0099cc',
          light: '#33ddff',
        },
        // 功能色彩
        success: '#00ff88',
        warning: '#ffb800',
        danger: '#ff6b6b',
        info: '#7c3aed',
        // 背景色系统
        bg: {
          primary: '#0f1419',
          secondary: '#1a1f2e',
          tertiary: '#252b3d',
          hover: '#2d3748',
          active: '#3d4852',
        },
        // 文本色系统
        text: {
          primary: '#ffffff',
          secondary: '#b4bcd0',
          tertiary: '#6b7280',
          muted: '#4b5563',
        },
        // 边框色系统
        border: {
          primary: '#374151',
          secondary: '#2d3748',
          accent: '#00d4ff',
        },
      },
      // 字体系统
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'SF Mono',
          'Monaco',
          'Cascadia Code',
          'Roboto Mono',
          'monospace',
        ],
      },
      // 间距系统 (基于 8px 网格)
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
      },
      // 圆角系统
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
      // 阴影系统
      boxShadow: {
        sm: '0 2px 4px rgba(0, 0, 0, 0.1)',
        DEFAULT: '0 4px 12px rgba(0, 0, 0, 0.15)',
        lg: '0 8px 24px rgba(0, 0, 0, 0.2)',
        glow: '0 0 20px rgba(0, 212, 255, 0.3)',
      },
      // 动画配置
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-in-out',
      },
      // 关键帧动画
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 212, 255, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.8)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      // 屏幕尺寸
      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
}