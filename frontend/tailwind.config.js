/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // ── Palette primaire ──────────────────────────────────────────
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // ── Palette dark (niveaux) ────────────────────────────────────
        dark: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          850: '#162032',
          900: '#0f172a',
          950: '#080e1a',
        },
        // ── Couleurs sémantiques via CSS custom properties ────────────
        // Utilisées avec bg-background, text-foreground, etc.
        background:  'var(--background)',
        surface:     'var(--surface)',
        card:        { DEFAULT: 'var(--card)', hover: 'var(--card-hover)' },
        border:      { DEFAULT: 'var(--border)', strong: 'var(--border-strong)' },
        foreground:  'var(--foreground)',
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        'input-bg':  'var(--input-bg)',
        sidebar:     { DEFAULT: 'var(--sidebar-bg)', border: 'var(--sidebar-border)' },
        navbar:      { DEFAULT: 'var(--navbar-bg)', border: 'var(--navbar-border)' },
        overlay:     'var(--overlay)',
        modal:       'var(--modal)',
      },
      animation: {
        'fade-in':       'fadeIn 0.3s ease-out',
        'slide-up':      'slideUp 0.3s ease-out',
        'slide-down':    'slideDown 0.3s ease-out',
        'slide-in-right':'slideInRight 0.3s ease-out',
        'pulse-slow':    'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow':     'spin 3s linear infinite',
        'bounce-sm':     'bounceSm 1s ease-in-out infinite',
        'skeleton':      'skeleton 1.5s ease-in-out infinite',
        'glow':          'glow 2s ease-in-out infinite alternate',
        'theme-toggle':  'themeToggle 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceSm: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
        skeleton: {
          '0%':   { backgroundPosition: '-200px 0' },
          '100%': { backgroundPosition: 'calc(200px + 100%) 0' },
        },
        glow: {
          '0%':   { boxShadow: '0 0 5px rgba(59, 130, 246, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.6)' },
        },
        themeToggle: {
          '0%':   { transform: 'scale(1) rotate(0deg)' },
          '50%':  { transform: 'scale(0.85) rotate(180deg)' },
          '100%': { transform: 'scale(1) rotate(360deg)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-sm':   '0 0 10px rgba(59, 130, 246, 0.3)',
        'glow':      '0 0 20px rgba(59, 130, 246, 0.4)',
        'glow-lg':   '0 0 40px rgba(59, 130, 246, 0.5)',
        'inner-sm':  'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'card':      '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.07)',
        'card-dark': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        'card-lg':   '0 20px 40px -10px rgba(0, 0, 0, 0.2)',
        'card-dark-lg': '0 20px 40px -10px rgba(0, 0, 0, 0.6)',
        'light-card':'0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
}
