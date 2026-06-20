/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#AB9FF2',
          violet: '#AB9FF2',
          deep: '#7C5CFF',
        },
        tierA: { from: '#F5C451', to: '#E0A93C' },
        tierB: { from: '#AB9FF2', to: '#7C5CFF' },
        tierC: { from: '#3DDC97', to: '#2BB67D' },
        success: '#3DDC97',
        warning: '#FFB020',
        danger: '#FF5C5C',
        // Dark theme surfaces
        'dark-bg': '#18181B',
        'dark-surface': '#232328',
        'dark-elevated': '#2C2C32',
        'dark-text': '#F5F5F7',
        'dark-text-secondary': '#A1A1AA',
        'dark-text-muted': '#6B6B74',
        // Light theme surfaces
        'light-bg': '#FFFFFF',
        'light-surface': '#F6F5FA',
        'light-text': '#1A1A1F',
        'light-text-secondary': '#6B6B74',
      },
      borderRadius: {
        sm: '10px',
        md: '16px',
        lg: '20px',
        xl: '28px',
      },
      fontFamily: {
        display: ['SpaceGrotesk_600SemiBold'],
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
      },
    },
  },
  plugins: [],
};
