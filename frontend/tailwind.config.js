/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        fs: {
          title: "#B3EAFF",
          glass: "#112C4A",     // overlay global 40%
          panel: "#152F52",     // form panel 50%
               // input 15%
        },
      },
      borderRadius: {
        xl2: "28px",
      },
      boxShadow: {
        soft: "0 20px 60px rgba(0,0,0,.45)",
      },
    },
  },
  plugins: [],
};