/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'Times New Roman', 'serif'],
        body: ['"EB Garamond"', 'Georgia', 'Times New Roman', 'serif'],
      },
      fontSize: {
        'display': ['2.75rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'display-sm': ['2rem', { lineHeight: '1.2' }],
      },
      colors: {
        brand: {
          50: '#faf6f0',
          100: '#f0e8dc',
          200: '#dcc9a8',
          300: '#c4a574',
          400: '#9a7348',
          500: '#7d5a2f',
          600: '#5c4224',
          700: '#3d2c19',
          800: '#2a1e12',
          900: '#1a120c',
        },
      },
      boxShadow: {
        'ledger': '4px 4px 0 0 rgba(26, 18, 12, 0.06)',
        'ledger-sm': '2px 2px 0 0 rgba(26, 18, 12, 0.05)',
        'inset-brass': 'inset 0 1px 0 rgba(255, 248, 235, 0.12)',
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        sm: '0.125rem',
        md: '0.1875rem',
        lg: '0.25rem',
        xl: '0.375rem',
        '2xl': '0.5rem',
      },
    },
  },
  plugins: [],
};
