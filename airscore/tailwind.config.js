/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    "./App.tsx",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  // presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        dodger: "#1E90FF",
      },
    },
  },
  plugins: [],
};
