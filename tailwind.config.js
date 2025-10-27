/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./about.html",
    "./dashboard.html",
    "./src/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3B82F6"  // placeholder blue
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "sans-serif"]
      }
    }
  },
  plugins: []
}
module.exports = {
  content: ["./**/*.html", "./src/js/**/*.js"],
  theme: {
    extend: {},
  },
  plugins: [],
};
