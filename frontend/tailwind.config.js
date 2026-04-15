/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fffdf0',
          100: '#fef9d0',
          200: '#fef0a0',
          300: '#fde264',
          400: '#fbcf2e',
          500: '#f5b800',
          600: '#d49500',
          700: '#a97200',
          800: '#8a5c00',
          900: '#6b4700',
        },
        brand: {
          dark: '#0a0a1a',
          navy: '#0f1535',
          blue: '#1a237e',
        }
      }
    }
  },
  plugins: []
}
