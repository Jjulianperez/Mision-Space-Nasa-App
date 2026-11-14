/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#0B0F19',
          900: '#131B2E',
          800: '#1E293B',
        },
        accent: '#38BDF8',
        ok: '#10B981',
        warn: '#F59E0B',
        crit: '#EF4444',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};
