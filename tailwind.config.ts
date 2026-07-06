import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#030712",
        card: "#0d1117",
        "card-2": "#070d14",
        borderc: "#1a2332",
        "borderc-2": "#243044",
        accent: "#f97316",
        "accent-2": "#fb923c",
        bluec: "#60a5fa",
        gold: "#eab308",
        greenc: "#4ade80",
        redc: "#f87171",
        muted: "#9ca3af",
        "muted-2": "#6b7280",
      },
      fontFamily: {
        ui: ["var(--font-inter)", "system-ui", "sans-serif"],
        disp: ["var(--font-space-grotesk)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
