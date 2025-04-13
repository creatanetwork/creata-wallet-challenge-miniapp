/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-dark': '#121212',
        'primary': '#3a86ff',
        'secondary': '#8338ec',
        'accent': '#ffbe0b',
        'success': '#38b000',
        'warning': '#ff006e',
      },
      fontFamily: {
        'sans': ['Montserrat', 'sans-serif'],
        'display': ['Orbitron', 'sans-serif'],
      },
      animation: {
        'shine': 'shine 1.5s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s ease-in-out infinite',
      },
      keyframes: {
        'shine': {
          '0%': { 'background-position': '200% center' },
          '100%': { 'background-position': '-200% center' },
        },
      },
      scale: {
        '98': '0.98',
      },
    },
  },
  plugins: [],
};
