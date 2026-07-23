/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './app.jsx',
    './main.jsx',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nexus: {
          bg1: '#0a0a0a',
          bg2: '#111111',
          bg3: '#1a1a1a',
          bg4: '#222222',
        }
      }
    }
  },
  plugins: []
};
