/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy:   '#211e69',
          blue:   '#1778f1',
          yellow: '#efff00',
          orange: '#f94a14',
          white:  '#ffffff',
          black:  '#000000',
        },
      },
      letterSpacing: {
        brand: '0.03em',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
