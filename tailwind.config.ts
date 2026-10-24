import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        danfe: {
          border: "#000000",
          bg: "#ffffff",
          header: "#f0f0f0",
        },
      },
      keyframes: {
        "splash-logo": {
          "0%": { opacity: "0", transform: "scale(0.6) rotate(-8deg)" },
          "60%": { opacity: "1", transform: "scale(1.06) rotate(1deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(0deg)" },
        },
        "splash-glow": {
          "0%, 100%": { opacity: "0.45", transform: "scale(0.95)" },
          "50%": { opacity: "0.85", transform: "scale(1.12)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        indeterminate: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(250%)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "splash-logo": "splash-logo 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
        "splash-glow": "splash-glow 2.4s ease-in-out infinite",
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        indeterminate: "indeterminate 1.4s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
      },
      fontFamily: {
        mono: ["Consolas", "Monaco", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
