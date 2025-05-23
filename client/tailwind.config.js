/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        fontFamily: {
          futuristic: ["Orbitron", "sans-serif"],
        },
        colors: {
          neon: "#00FFFF",
          darkBg: "#0A0A0A",
        },
      },
    },
    plugins: [],
  };
  