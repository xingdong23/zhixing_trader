/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 主题主色（使用 <alpha-value> 以支持 /xx 透明度语法）
        primary: 'rgb(0 255 208 / <alpha-value>)',
        secondary: 'rgb(59 130 246 / <alpha-value>)',
        accent: 'rgb(245 158 11 / <alpha-value>)',
        success: 'rgb(16 185 129 / <alpha-value>)',
        danger: 'rgb(239 68 68 / <alpha-value>)',
        warning: 'rgb(245 158 11 / <alpha-value>)',
        info: 'rgb(59 130 246 / <alpha-value>)',

        // 基础表面与边框（映射到 CSS 变量，支持 /opacity 语法）
        surface: {
          DEFAULT: 'rgb(30 41 59 / <alpha-value>)',
          light: 'rgb(30 41 59 / <alpha-value>)',
          dark: 'rgb(15 23 42 / <alpha-value>)',
        },
        card: {
          DEFAULT: 'rgb(30 41 59 / 0.8)'
        },
        border: {
          DEFAULT: 'rgba(148, 163, 184, 0.3)',
          secondary: 'rgba(148, 163, 184, 0.2)',
          accent: 'rgba(0, 255, 208, 0.3)'
        },

        // 文本色组，便于使用 text-text-primary 这类类名
        text: {
          primary: '#e2e8f0',
          secondary: '#cbd5e1',
          muted: '#94a3b8',
          inverse: '#0f172a',
        },
      },
    },
  },
  plugins: [],
}