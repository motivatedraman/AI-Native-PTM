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
        background: "#0d0d0f",
        surface: "#141416",
        "surface-card": "#1c1c1f",
        "surface-hover": "#252528",
        border: "#2e2e33",
        "border-subtle": "#3a3a40",
        primary: {
          DEFAULT: "#8b5cf6",
          hover: "#7c3aed",
          light: "#a78bfa",
          dark: "#6d28d9",
        },
        accent: {
          pink: "#ec4899",
          cyan: "#06b6d4",
          orange: "#f97316",
        },
        success: {
          DEFAULT: "#10b981",
          light: "#34d399",
        },
        warning: "#f59e0b",
        danger: "#f43f5e",
        streak: "#f97316",
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
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(249, 115, 22, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(249, 115, 22, 0)' },
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
        'gradient-primary': 'linear-gradient(135deg, #8b5cf6, #ec4899)',
        'gradient-success': 'linear-gradient(135deg, #10b981, #06b6d4)',
        'gradient-streak': 'linear-gradient(135deg, #f97316, #ef4444)',
        'gradient-warm': 'linear-gradient(135deg, #1c1c1f, #252528)',
      },
    },
  },
  plugins: [],
}
