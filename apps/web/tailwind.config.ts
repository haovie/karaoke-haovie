import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        karaoke: {
          dark: '#111827',
          primary: '#8b5cf6',
          secondary: '#ec4899',
          accent: '#14b8a6'
        }
      }
    },
  },
  plugins: [],
} satisfies Config;