/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f5f7ff",
          100: "#e7ecff",
          200: "#c9d4ff",
          300: "#9eb0ff",
          400: "#6e85ff",
          500: "#4a60f5",
          600: "#3747d8",
          700: "#2d38ad",
          800: "#27308a",
          900: "#1f265f",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
