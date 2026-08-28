/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E5FE0',
          dark: '#1544B0',
          pressed: '#1544B0',
          wash: '#EEF4FF',
        },
        accent: {
          gold: '#C9973F',
          'gold-soft': '#F6EAD2',
        },
        success: '#0FA968',
        warning: '#E08A00',
        danger: '#E23B3B',
        neutral: '#64748B',
        background: '#F4F7FC',
        card: '#FFFFFF',
        text: '#0E1B33',
        'text-secondary': '#5A6B85',
      },
      fontSize: {
        'display': ['28px', { fontWeight: '800', lineHeight: '34px' }],
        'title': ['22px', { fontWeight: '700', lineHeight: '28px' }],
        'body': ['16px', { lineHeight: '24px' }],
        'label': ['13px', { lineHeight: '20px' }],
        'quran': ['20px', { lineHeight: '28px' }],
      },
      spacing: {
        '4': '16px',
        'screen': '16px',
      },
      borderRadius: {
        'card': '20px',
      },
      minHeight: {
        'touch': '48px',
      },
    },
  },
  plugins: [],
}
