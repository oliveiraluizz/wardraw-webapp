import type { Config } from "tailwindcss";

/** "Dark Combat UI" tokens extracted from "Wardraw — Telas do app.html". */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0F0F11",
        surface: { DEFAULT: "#18181B", 2: "#232327", 3: "#2A2A30" },
        line: "#34343A",
        ink: { DEFAULT: "#F4F1EC", muted: "#AAA69E", soft: "#D9D3CA" },
        brand: { DEFAULT: "#C8102E", hot: "#FF5A6A", hover: "#FF8A96", deep: "#1F0E12", edge: "#52202A" },
        ok: { DEFAULT: "#5BD68A", bg: "#16301F", edge: "#1E7A45" },
        gold: { DEFAULT: "#F2C14E", bg: "#221D10", edge: "#5A4A1E", text: "#E9DDBE" },
      },
      fontFamily: {
        display: ["Anton", "sans-serif"],
        sans: ["Barlow", "system-ui", "sans-serif"],
        cond: ["Barlow Condensed", "sans-serif"],
      },
      borderRadius: { card: "16px" },
    },
  },
  plugins: [],
} satisfies Config;
