/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#1e40af',
        danger: '#dc2626',
        warning: '#f59e0b',
        success: '#10b981',
      },
    },
  },
  plugins: [],
}
