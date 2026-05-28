/** @type {import('tailwindcss').Config} */

// Helper para tokens que aceptan alpha (Tailwind v3 + CSS vars).
// Cada color se define como triplete RGB en CSS y se consume aquí
// para que clases como `bg-accent/30` o `text-text-primary/70` funcionen.
const rgb = (varName) => `rgb(var(${varName}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: rgb("--rgb-canvas"),
        panel: rgb("--rgb-panel"),
        elevated: rgb("--rgb-elevated"),
        input: rgb("--rgb-input"),
        border: {
          subtle: rgb("--rgb-border-subtle"),
          strong: rgb("--rgb-border-strong"),
        },
        text: {
          primary: rgb("--rgb-text-primary"),
          secondary: rgb("--rgb-text-secondary"),
          tertiary: rgb("--rgb-text-tertiary"),
          quaternary: rgb("--rgb-text-quaternary"),
        },
        accent: {
          DEFAULT: rgb("--rgb-accent"),
          hover: rgb("--rgb-accent-hover"),
        },
        positive: rgb("--rgb-positive"),
        warning: rgb("--rgb-warning"),
        critical: rgb("--rgb-critical"),
        info: rgb("--rgb-info"),
      },
      fontFamily: {
        sans: ['"Geist"', "system-ui", "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", "monospace"],
        display: ['"Fraunces"', "Georgia", "serif"],
      },
      fontSize: {
        eyebrow: ["11px", { lineHeight: "16px", letterSpacing: "0.10em", fontWeight: "500" }],
        caption: ["12px", { lineHeight: "16px", letterSpacing: "-0.004em" }],
        body: ["14px", { lineHeight: "20px", letterSpacing: "-0.008em" }],
        h2: ["16px", { lineHeight: "22px", letterSpacing: "-0.012em", fontWeight: "500" }],
        h1: ["22px", { lineHeight: "28px", letterSpacing: "-0.018em", fontWeight: "600" }],
        display: ["36px", { lineHeight: "40px", letterSpacing: "-0.022em", fontWeight: "600" }],
      },
      spacing: {
        4.5: "18px",
      },
      borderRadius: {
        none: "0",
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
        xl: "14px",
        "2xl": "20px",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
        in: "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fade: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        pulse_dot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(0.92)" },
        },
        grow_bar: {
          from: { transform: "scaleY(0)" },
          to: { transform: "scaleY(1)" },
        },
        slide_in_right: {
          from: { opacity: "0", transform: "translateX(8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        rise: "rise 0.42s cubic-bezier(0.22, 1, 0.36, 1) both",
        fade: "fade 0.22s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-dot": "pulse_dot 1.6s ease-in-out infinite",
        "grow-bar": "grow_bar 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-in-right": "slide_in_right 0.32s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};
