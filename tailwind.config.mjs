/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        // "cream" kept as a token name for compatibility; it now maps to the
        // minimal palette's paper white.
        cream: "#fdfdfb",
        "cream-2": "#f4f4f1",
        ink: "#161614",
        muted: "#71716b",
        line: "#e6e6e1",
        accent: "#e8470c",
        highlight: "#f4f4f1",
      },
      fontFamily: {
        display: ['"Instrument Sans"', "Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(20,20,18,.05), 0 12px 32px rgba(20,20,18,.07)",
        "soft-sm": "0 1px 2px rgba(20,20,18,.05), 0 6px 16px rgba(20,20,18,.06)",
        // legacy names kept so stray usages degrade gracefully
        brutal: "0 1px 2px rgba(20,20,18,.05), 0 12px 32px rgba(20,20,18,.07)",
        "brutal-sm": "0 1px 2px rgba(20,20,18,.05), 0 6px 16px rgba(20,20,18,.06)",
        "brutal-lg": "0 2px 4px rgba(20,20,18,.05), 0 20px 48px rgba(20,20,18,.08)",
        "brutal-hover": "0 2px 4px rgba(20,20,18,.05), 0 20px 48px rgba(20,20,18,.08)",
        "brutal-stamp": "none",
      },
      letterSpacing: {
        crush: "-0.025em",
        smash: "-0.03em",
      },
    },
  },
  plugins: [],
};
