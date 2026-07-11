/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,js}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E8F0FE',
          100: '#C5D9FC',
          200: '#9EC1FA',
          300: '#77A8F7',
          400: '#5994F4',
          500: '#1A6CFF',
          600: '#1558D2',
          700: '#1045A5',
          800: '#0B3178',
          900: '#061E4B',
        },
        surface: {
          light: '#FFFBFE',
          dark: '#1C1B1F',
        },
        container: {
          light: '#F3F1F9',
          dark: '#2E2C33',
        },
        outline: {
          light: '#79747E',
          dark: '#938F99',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        'pill': '999px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 14px 0 rgb(0 0 0 / 0.06), 0 1px 3px -1px rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
}
