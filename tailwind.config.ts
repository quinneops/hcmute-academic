import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Primary Palette - Academic Blues
        primary: {
          DEFAULT: "#002068",
          container: "#003399",
          fixed: "#dce1ff",
          dim: "#b5c4ff",
          on: "#ffffff",
          "on-container": "#8aa4ff",
          "on-fixed": "#00164e",
          "on-fixed-variant": "#153ea3",
        },

        // Secondary Palette - Neutral Grays
        secondary: {
          DEFAULT: "#576066",
          container: "#dbe4eb",
          fixed: "#dbe4eb",
          dim: "#bfc8ce",
          on: "#ffffff",
          "on-container": "#5d666c",
          "on-fixed": "#141d22",
          "on-fixed-variant": "#3f484e",
        },

        // Tertiary Palette - Excellence Accents
        tertiary: {
          DEFAULT: "#735c00",
          container: "#cca730",
          fixed: "#ffe088",
          dim: "#e9c349",
          on: "#ffffff",
          "on-container": "#4f3d00",
          "on-fixed": "#241a00",
          "on-fixed-variant": "#574500",
        },

        // Surface Hierarchy (No-Line Rule)
        background: "#f8f9fb",
        surface: {
          DEFAULT: "#f8f9fb",
          dim: "#d8dadc",
          bright: "#f8f9fb",
          "container-lowest": "#ffffff",
          "container-low": "#f2f4f6",
          container: "#eceef0",
          "container-high": "#e6e8ea",
          "container-highest": "#e0e3e5",
        },

        // Content
        "on-surface": "#191c1e",
        "on-surface-variant": "#444653",
        "on-background": "#191c1e",

        // Semantic
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
          on: "#ffffff",
          "on-container": "#93000a",
        },

        // Utility
        outline: "#747684",
        "outline-variant": "#c4c5d5",

        // Border
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        headline: ["Be Vietnam Pro", "var(--font-be-vietnam-pro)", "sans-serif"],
        body: ["Inter", "var(--font-inter)", "sans-serif"],
        label: ["Be Vietnam Pro", "var(--font-be-vietnam-pro)", "sans-serif"],
      },
      fontSize: {
        "display-sm": ["2.25rem", { letterSpacing: "-0.02em", fontWeight: "800" }],
        "display-md": ["2.75rem", { letterSpacing: "-0.02em", fontWeight: "800" }],
        "display-lg": ["3.5rem", { letterSpacing: "-0.02em", fontWeight: "800" }],
        "headline-sm": ["1.5rem", { letterSpacing: "-0.015em", fontWeight: "700" }],
        "headline-md": ["1.75rem", { letterSpacing: "-0.015em", fontWeight: "700" }],
        "headline-lg": ["2rem", { letterSpacing: "-0.015em", fontWeight: "700" }],
        "title-sm": ["1rem", { fontWeight: "600" }],
        "title-md": ["1.125rem", { fontWeight: "600" }],
        "title-lg": ["1.375rem", { fontWeight: "600" }],
        "body-sm": ["0.875rem", { fontWeight: "400" }],
        "body-md": ["1rem", { fontWeight: "400" }],
        "label-sm": ["0.6875rem", { letterSpacing: "0.05em", fontWeight: "600" }],
        "label-md": ["0.75rem", { letterSpacing: "0.05em", fontWeight: "600" }],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        full: "9999px",
      },
      boxShadow: {
        // Ambient shadows (4% opacity)
        "ambient-sm": "0 1px 2px rgba(25, 28, 30, 0.04)",
        "ambient-md": "0 4px 8px rgba(25, 28, 30, 0.04)",
        "ambient-lg": "0 8px 16px rgba(25, 28, 30, 0.04)",
        "ambient-xl": "0 24px 48px rgba(25, 28, 30, 0.04)",

        // Elevated (8% opacity on hover)
        "elevated-sm": "0 1px 3px rgba(25, 28, 30, 0.08)",
        "elevated-md": "0 4px 12px rgba(25, 28, 30, 0.08)",
        "elevated-lg": "0 24px 30px rgba(25, 28, 30, 0.08)",

        // Glow effects
        "glow-primary": "0 8px 24px rgba(0, 32, 104, 0.15)",
        "glow-primary-dim": "0 8px 24px rgba(0, 32, 104, 0.10)",
      },
      spacing: {
        '128': '32rem',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
      },
      backgroundImage: {
        'mesh': "radial-gradient(at 0% 0%, rgba(0, 51, 153, 0.03) 0, transparent 50%), radial-gradient(at 100% 100%, rgba(0, 32, 104, 0.05) 0, transparent 50%)",
        'gradient-primary': "linear-gradient(135deg, #002068 0%, #003399 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
