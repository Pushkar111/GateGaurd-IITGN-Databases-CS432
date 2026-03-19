/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--bg-base) / <alpha-value>)',
        surface:    'hsl(var(--bg-surface) / <alpha-value>)',
        elevated:   'hsl(var(--bg-elevated) / <alpha-value>)',
        overlay:    'hsl(var(--bg-overlay) / <alpha-value>)',
        foreground: 'hsl(var(--text-primary) / <alpha-value>)',
        muted:      'hsl(var(--text-muted) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          hover:   'hsl(var(--primary-hover) / <alpha-value>)',
        },
        accent:   'hsl(var(--accent) / <alpha-value>)',
        success:  'hsl(var(--success) / <alpha-value>)',
        warning:  'hsl(var(--warning) / <alpha-value>)',
        danger:   'hsl(var(--danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'calc(var(--radius) + 4px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      backdropBlur: {
        glass: '20px',
      },
      animation: {
        'mesh-shift':  'meshShift 20s ease infinite',
        'orb-float':   'orbFloat 25s ease-in-out infinite',
        'pulse-glow':  'pulseGlow 2s ease-in-out infinite',
        'fade-in-up':  'fadeInUp 0.5s ease forwards',
        'shimmer':     'shimmer 2s linear infinite',
        'spin-slow':   'spin 8s linear infinite',
      },
      keyframes: {
        meshShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        orbFloat: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%':      { transform: 'translate(40px, -60px) scale(1.05)' },
          '66%':      { transform: 'translate(-30px, 40px) scale(0.95)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(99,102,241,0.3)' },
          '50%':      { opacity: '0.7', boxShadow: '0 0 40px rgba(99,102,241,0.6)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        glass:      '0 4px 24px rgba(0,0,0,0.2), 0 0 60px rgba(99,102,241,0.04)',
        'glass-lg': '0 8px 40px rgba(0,0,0,0.3), 0 0 80px rgba(99,102,241,0.08)',
        'indigo':   '0 0 30px rgba(99,102,241,0.25)',
        'emerald':  '0 0 30px rgba(16,185,129,0.25)',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
};
