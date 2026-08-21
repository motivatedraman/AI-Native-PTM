/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--sx-bg) / <alpha-value>)",
        surface: "rgb(var(--sx-surface) / <alpha-value>)",
        "surface-card": "rgb(var(--sx-card) / <alpha-value>)",
        "surface-hover": "rgb(var(--sx-hover) / <alpha-value>)",
        border: "rgb(var(--sx-border) / <alpha-value>)",
        "border-subtle": "rgb(var(--sx-border-3) / <alpha-value>)",
        primary: {
          DEFAULT: "#ab7631",
          hover: "#8d5f28",
          light: "#cfa45f",
          dark: "#6f4a20",
        },
        accent: {
          pink: "#a5642a",
          cyan: "#06b6d4",
          orange: "#c96a26",
        },
        /* Muted brass, theme-aware via CSS vars (html.light flips them) */
        amber: {
          200: "rgb(var(--am-200) / <alpha-value>)",
          300: "rgb(var(--am-300) / <alpha-value>)",
          400: "rgb(var(--am-400) / <alpha-value>)",
          500: "rgb(var(--am-500) / <alpha-value>)",
          600: "rgb(var(--am-600) / <alpha-value>)",
          700: "rgb(var(--am-700) / <alpha-value>)",
          800: "rgb(var(--am-800) / <alpha-value>)",
          900: "rgb(var(--am-900) / <alpha-value>)",
          950: "rgb(var(--am-950) / <alpha-value>)",
        },
        /* Warm ink scale, theme-aware */
        stone: {
          100: "rgb(var(--st-100) / <alpha-value>)",
          200: "rgb(var(--st-200) / <alpha-value>)",
          300: "rgb(var(--st-300) / <alpha-value>)",
          400: "rgb(var(--st-400) / <alpha-value>)",
          500: "rgb(var(--st-500) / <alpha-value>)",
          600: "rgb(var(--st-600) / <alpha-value>)",
          700: "rgb(var(--st-700) / <alpha-value>)",
          800: "#292524",
          900: "#1c1917",
          950: "#0c0a09",
        },
        success: {
          DEFAULT: "#10b981",
          light: "#34d399",
        },
        warning: "#cfa45f",
        danger: "#f43f5e",
        streak: "#c96a26",
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      keyframes: {
        'task-complete': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '30%': { transform: 'scale(1.15)', opacity: '1' },
          '60%': { transform: 'scale(0.95)', opacity: '0.9' },
          '100%': { transform: 'scale(1)', opacity: '0.5' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-20px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(60px) rotate(360deg)', opacity: '0' },
        },
        'check-pop': {
          '0%': { transform: 'scale(0) rotate(-180deg)', opacity: '0' },
          '70%': { transform: 'scale(1.3) rotate(10deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        'streak-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201, 106, 38, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(201, 106, 38, 0)' },
        },
        'glow-success': {
          '0%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.5)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(16, 185, 129, 0.3)' },
          '100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' },
        },
        'slide-up-fade': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        'task-complete': 'task-complete 0.5s ease-out forwards',
        'confetti-fall': 'confetti-fall 0.8s ease-out forwards',
        'check-pop': 'check-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'streak-pulse': 'streak-pulse 2s ease-in-out infinite',
        'glow-success': 'glow-success 0.8s ease-out forwards',
        'slide-up-fade': 'slide-up-fade 0.3s ease-out forwards',
        'bounce-in': 'bounce-in 0.5s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #cfa45f, #a5642a)',
        'gradient-success': 'linear-gradient(135deg, #10b981, #14b8a6)',
        'gradient-streak': 'linear-gradient(135deg, #c96a26, #ef4444)',
        'gradient-warm': 'linear-gradient(135deg, #2b2622, #38312b)',
      },
    },
  },
  plugins: [],
}
