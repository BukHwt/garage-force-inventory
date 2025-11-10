/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Garage Force Brand Colors - Green Primary Theme
        'gf-green': {
          DEFAULT: '#00A651', // Garage Force brand green
          50: '#E6F7EF',
          100: '#CCEFDF',
          200: '#99DFBF',
          300: '#66CF9F',
          400: '#33BF7F',
          500: '#00A651',
          600: '#008541',
          700: '#006331',
          800: '#004221',
          900: '#002110',
        },
        'gf-charcoal': {
          DEFAULT: '#1A1A1A', // Dark background
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
          light: '#E3E3E3',
          dark: '#2C2C2C',
        },
        // Dark theme specific colors - Level 5 brightness (1-10 scale)
        'dark': {
          bg: '#4A4A4A',        // Main background (medium gray)
          card: '#5C5C5C',      // Card backgrounds (lighter)
          border: '#787878',    // Borders (clearly visible)
          text: {
            primary: '#FFFFFF',   // Primary text (pure white)
            secondary: '#F0F0F0', // Secondary text (very light)
            muted: '#D0D0D0',     // Muted text (light gray)
          },
        },
        // Alert colors
        'alert': {
          red: '#DC2626',         // Red for low inventory alerts
          'red-bg': '#7F1D1D',    // Dark red background
          'red-border': '#991B1B', // Red border
        },
        // Category colors for badges
        'category': {
          coatings: {
            bg: '#71717A',        // Off gray/slate
            text: '#F4F4F5',
          },
          chips: {
            bg: '#6366F1',        // Indigo
            text: '#FFFFFF',
          },
          disposables: {
            bg: '#D97706',        // Mustard/amber
            text: '#FFFFFF',
          },
          equipment: {
            bg: '#0891B2',        // Cyan
            text: '#FFFFFF',
          },
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
