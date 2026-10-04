/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },
      backdropBlur: {
        xs: '2px',
      },
      borderWidth: {
        3: '3px',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Paleta Precision Enterprise (de la captura de pantalla)
        precision: {
          // Primary: #1A73E8 (Azul Eléctrico Corporativo)
          primary: '#1A73E8',
          'primary-hover': '#1557B0',
          'primary-light': '#E8F0FE',
          'primary-dark': '#10458C',

          // Secondary: #37474F (Gris Pizarra / Slate Charcoal)
          secondary: '#37474F',
          'secondary-hover': '#263238',
          'secondary-light': '#ECEFF1',
          'secondary-dark': '#1C252A',

          // Tertiary: #C55500 (Naranja Terracota / Ámbar Industrial)
          tertiary: '#C55500',
          'tertiary-hover': '#A34400',
          'tertiary-light': '#FDF2E9',
          'tertiary-dark': '#823500',

          // Neutral: #747780 (Gris Neutro Precision)
          neutral: '#747780',
          'neutral-light': '#F4F6F9',
          'neutral-border': '#E5E8EE',
          'neutral-dark': '#1B1D22',

          // Fondos del sistema
          canvas: '#EFF3F8',
          card: '#FFFFFF',
        }
      }
    },
  },
  plugins: [],
}
