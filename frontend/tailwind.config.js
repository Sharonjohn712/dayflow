/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['Jost', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'serif'],
      },
      colors: {
        cream:   '#F2EAE0',
        peach:   '#F0E2C3',
        blush:   '#F6C7B3',
        mist:    '#DCECE9',
        sage:    '#C3DEDD',
        steel:   '#82B2C0',
        surface: '#faf6f0',
        border:  '#e0d0be',
        border2: '#cdbba8',
        text1:   '#3b2e24',
        text2:   '#7a6050',
        muted:   '#a89080',
        muted2:  '#c9b5a3',
        accent:  '#5596a8',
        warm:    '#d9855e',
        green:   '#4e9280',
        gold:    '#b8813c',
      },
      borderRadius: {
        DEFAULT: '0.625rem',
        card: '1rem',
        pill: '9999px',
      },
    },
  },
  plugins: [],
}
