/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./about.html",
    "./contact.html",
    "./dashboard.html",
    "./login.html",
    "./register.html",
    "./privacy.html",
    "./terms.html",
    "./src/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3B82F6"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "sans-serif"]
      }
    }
  },
  plugins: []
}
