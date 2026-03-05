/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef7ee',
          100: '#feeed6',
          200: '#fbd9ac',
          300: '#f8be78',
          400: '#f49a42',
          500: '#f17f1c',
          600: '#e26512',
          700: '#bb4c11',
          800: '#953d16',
          900: '#783415',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-ring': 'pulseRing 1.5s ease-out infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(241, 127, 28, 0.4)' },
          '100%': { boxShadow: '0 0 0 12px rgba(241, 127, 28, 0)' },
        },
      },
    },
  },
  plugins: [],
};
