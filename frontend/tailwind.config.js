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
        background: "#090a0f",
        surface: "#12141c",
        "surface-card": "#181a24",
        "surface-hover": "#212433",
        border: "#262a3c",
        "border-subtle": "#1e2230",
        primary: {
          DEFAULT: "#4f46e5",
          hover: "#4338ca",
          light: "#6366f1"
        },
        accent: "#38bdf8",
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
