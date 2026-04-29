/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT:'#1D9E75', dark:'#157a5b', light:'#e1f5ee' }
      }
    }
  },
  plugins: []
}
