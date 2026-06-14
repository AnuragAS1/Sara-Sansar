import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./contexts/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // base surfaces (light = warm sage-tinted off-white, dark = deep forest)
        cream: "#F6F8F3",
        ink: "#1A1F18",
        clay: "#E8EFE2",
        char: "#0F1410",

        // brand — sage/moss green family.
        // (Class names kept as `ember-*` for code stability — colors are green.)
        ember: {
          50:  "#F1F5EF",
          100: "#DCEBD4",
          200: "#B9D7AB",
          300: "#8FBE7B",
          400: "#6BA456",
          500: "#4F8B3F",
          600: "#3E6F32",
          700: "#325727",
          800: "#284620",
          900: "#1B311A",
        },

        mute: {
          DEFAULT: "#7A8377",
          fg: "#4F5A4D",
          line: "#DCE3D5",
          "line-dark": "#2A3429",
        },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Geist", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
      letterSpacing: { tightest: "-0.035em" },
      boxShadow: {
        card: "0 1px 0 rgba(26,31,24,0.04), 0 6px 20px -10px rgba(26,31,24,0.10)",
        "card-dark": "0 1px 0 rgba(255,255,255,0.04), 0 6px 20px -10px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
