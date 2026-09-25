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
        navy: {
          950: '#070B19',
          900: '#0B132B',
          850: '#101B3B',
          800: '#16234A',
          700: '#1E3066',
        },
        cyan: {
          accent: '#06B6D4',
          glow: '#22D3EE',
        },
        live: {
          green: '#10B981',
          amber: '#F59E0B',
          blue: '#3B82F6',
          red: '#EF4444',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.25), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)',
        'glass-md': '0 8px 32px 0 rgba(0, 0, 0, 0.35), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)',
        'glass-lg': '0 16px 48px -8px rgba(0, 0, 0, 0.45), inset 0 1px 2px 0 rgba(255, 255, 255, 0.25)',
        'glow-cyan': '0 0 25px rgba(6, 182, 212, 0.45)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-gentle': 'float 4s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        }
      }
    },
  },
  plugins: [],
}
