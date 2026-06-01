import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        display: ["var(--font-geist)", "Geist", "Inter", "sans-serif"]
      },
      colors: {
        background: "#09090B",
        surface: "#111113",
        elevated: "#18181B",
        primary: "#7C3AED",
        accent: "#A855F7",
        success: "#22C55E",
        mutedText: "#A1A1AA"
      },
      boxShadow: {
        glow: "0 0 80px rgba(124, 58, 237, 0.22)",
        panel: "0 24px 80px rgba(0, 0, 0, 0.42)"
      },
      backgroundImage: {
        "voxa-radial": "radial-gradient(circle at 20% 10%, rgba(124,58,237,.22), transparent 32%), radial-gradient(circle at 78% 18%, rgba(34,197,94,.1), transparent 30%), linear-gradient(180deg, #09090B 0%, #0D0D10 48%, #09090B 100%)"
      }
    }
  },
  plugins: [animate]
};

export default config;
