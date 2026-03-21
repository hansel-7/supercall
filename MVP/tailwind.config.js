/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a25',
          600: '#22222f',
        },
        accent: {
          blue: '#3b82f6',
          amber: '#f59e0b',
          green: '#22c55e',
          purple: '#a855f7',
          red: '#ef4444',
        },
      },
    },
  },
  plugins: [],
};
