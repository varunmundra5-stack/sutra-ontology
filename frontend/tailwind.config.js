/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0f4ff",
          100: "#e0e9ff",
          200: "#c7d5ff",
          300: "#a4b8ff",
          400: "#7c94fd",
          500: "#5b6ef8",
          600: "#4a54ec",
          700: "#3d43d5",
          800: "#3237ab",
          900: "#2e3387",
          950: "#1c1f52",
        },
        sidebar: {
          bg:     "#0d1117",
          hover:  "#161b22",
          border: "#21262d",
          muted:  "#8b949e",
          text:   "#e6edf3",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
      boxShadow: {
        card:       "0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
        "card-md":  "0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.04)",
        "card-lg":  "0 10px 30px 0 rgb(0 0 0 / 0.10), 0 4px 8px -2px rgb(0 0 0 / 0.06)",
        glow:       "0 0 20px rgb(91 110 248 / 0.25)",
      },
      backgroundImage: {
        "gradient-mesh": "radial-gradient(at 40% 20%, rgb(91 110 248 / 0.07) 0px, transparent 50%), radial-gradient(at 80% 0%, rgb(74 84 236 / 0.05) 0px, transparent 50%), radial-gradient(at 0% 50%, rgb(61 67 213 / 0.04) 0px, transparent 50%)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-in": "slideIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
