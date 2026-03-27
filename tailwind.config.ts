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
      fontFamily: {
        mono: ["Consolas", "Monaco", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
