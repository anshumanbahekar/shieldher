import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ShieldHer brand palette
        shield: {
          50:  "#FFF0F3",
          100: "#FFD6DE",
          200: "#FFB3C1",
          300: "#FF85A1",
          400: "#FF4D6D",
          500: "#E5294E", // primary
          600: "#C9184A",
          700: "#A4133C",
          800: "#800F2F",
          900: "#590D22",
        },
        night: {
          50:  "#F7F7F8",
          100: "#EDEDF0",
          200: "#D3D3DB",
          300: "#ABABBA",
          400: "#7A7A91",
          500: "#5C5C72",
          600: "#3D3D52",
          700: "#282836",
          800: "#16161F",
          900: "#0A0A12", // deep background
          950: "#050508",
        },
        safe: {
          DEFAULT: "#00C48C",
          dark: "#009E72",
        },
        warn: {
          DEFAULT: "#FFB800",
          dark: "#E6A600",
        },
        danger: {
          DEFAULT: "#FF3B30",
          dark: "#D93025",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-syne)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      animation: {
        "pulse-ring": "pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite",
        "sos-ping": "sos-ping 1s cubic-bezier(0, 0, 0.2, 1) infinite",
        "slide-up": "slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.3s ease-out",
        "shake": "shake 0.5s cubic-bezier(.36,.07,.19,.97) both",
        "breathe": "breathe 3s ease-in-out infinite",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(229, 41, 78, 0.7)" },
          "70%": { transform: "scale(1)", boxShadow: "0 0 0 20px rgba(229, 41, 78, 0)" },
          "100%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(229, 41, 78, 0)" },
        },
        "sos-ping": {
          "75%, 100%": { transform: "scale(2)", opacity: "0" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "shake": {
          "10%, 90%": { transform: "translate3d(-1px, 0, 0)" },
          "20%, 80%": { transform: "translate3d(2px, 0, 0)" },
          "30%, 50%, 70%": { transform: "translate3d(-4px, 0, 0)" },
          "40%, 60%": { transform: "translate3d(4px, 0, 0)" },
        },
        "breathe": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.05)", opacity: "0.8" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        "shield": "0 0 40px rgba(229, 41, 78, 0.3)",
        "shield-lg": "0 0 80px rgba(229, 41, 78, 0.4)",
        "glow-safe": "0 0 20px rgba(0, 196, 140, 0.4)",
        "glow-warn": "0 0 20px rgba(255, 184, 0, 0.4)",
        "glass": "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 0 0.5px rgba(255,255,255,0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
