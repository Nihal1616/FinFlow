/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        bg: {
          DEFAULT: '#0a0a0f',
          2: '#111118',
          3: '#1a1a24',
          4: '#22222e',
        },
        card: {
          DEFAULT: '#16161f',
          2: '#1e1e2a',
        },
        border: {
          DEFAULT: '#2a2a38',
          2: '#363648',
        },
        accent: {
          DEFAULT: '#6c63ff',
          2: '#8b85ff',
          3: '#3d37cc',
        },
        fin: {
          green: '#22d3a0',
          red: '#ff5757',
          amber: '#ffb347',
          blue: '#4fc3f7',
        },
      },
    },
  },
  plugins: [],
};
