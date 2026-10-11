/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        scaler: { DEFAULT: "#0041CA", light: "#3B6DF0" },
      },
    },
  },
  plugins: [],
};
