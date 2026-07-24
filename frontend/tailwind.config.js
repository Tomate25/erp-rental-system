/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de colores premium para ERP de Maquinaria (Azul de acero, Gris oscuro y Naranja de advertencia industrial)
        brand: {
          orange: '#F59E0B',    // Amber / Warning orange
          orangeDark: '#D97706',
          slate: '#1E293B',     // Dark slate
          slateLight: '#334155',
          background: '#0F172A' // Slate-900 para dark mode
        }
      }
    },
  },
  plugins: [],
}
