/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Inter',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        accent: {
          DEFAULT: '#ef4444',
          soft: '#dc2626',
        },
      },
    },
  },
  plugins: [],
};
