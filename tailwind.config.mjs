/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#fefdf8",
        "cream-2": "#faf9f5",
        ink: "#0a0a0a",
        accent: "#ff5b1f",
        "accent-blue": "#3a4eff",
        "accent-green": "#1d8a4a",
        "accent-purple": "#8b3aff",
        highlight: "#fff7a8",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "Inter", "system-ui", "sans-serif"],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        brutal: "8px 8px 0 #0a0a0a",
        "brutal-sm": "6px 6px 0 #0a0a0a",
        "brutal-lg": "12px 12px 0 #0a0a0a",
        "brutal-hover": "12px 12px 0 #0a0a0a",
        "brutal-stamp": "4px 4px 0 #0a0a0a",
      },
      letterSpacing: {
        crush: "-0.05em",
        smash: "-0.06em",
      },
    },
  },
  plugins: [],
};
