/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1c1917',
        cream: '#faf7f2',
        moss: '#3f6b4b',
        clay: '#c47a4a',
        mist: '#e8efe9',
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Source Sans 3"', 'Segoe UI', 'sans-serif'],
      },
      backgroundImage: {
        'soft-mesh':
          'radial-gradient(ellipse at 20% 20%, #e8efe9 0%, transparent 50%), radial-gradient(ellipse at 80% 0%, #f3e6d8 0%, transparent 45%), linear-gradient(180deg, #faf7f2 0%, #f0ebe3 100%)',
      },
    },
  },
  plugins: [],
};
