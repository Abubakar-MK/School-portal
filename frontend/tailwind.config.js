/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        maroon: {
          DEFAULT: '#7a1215',
          dark: '#5c0d0f',
          light: '#a3181c',
        },
        gold: {
          DEFAULT: '#e0b325',
          light: '#f5d76e',
        },
      },
    },
  },
  plugins: [],
};
