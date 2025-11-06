/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Garage Force Brand Colors
        'gf-red': {
          DEFAULT: '#E31E24',
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#E31E24',
          600: '#C81D22',
          700: '#A01A1E',
          800: '#7F161A',
          900: '#661216',
        },
        'gf-charcoal': {
          DEFAULT: '#2C2C2C',
          50: '#F7F7F7',
          100: '#E3E3E3',
          200: '#C8C8C8',
          300: '#A4A4A4',
          400: '#717171',
          500: '#58595B',
          600: '#2C2C2C',
          700: '#232323',
          800: '#1A1A1A',
          900: '#0F0F0F',
        },
        'gf-gray': {
          DEFAULT: '#58595B',
          light: '#F5F5F5',
        },
      },
      fontFamily: {
        'heading': ['Montserrat', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'body': ['Open Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
