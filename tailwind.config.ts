import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#12151B",
          soft: "#1B1F27",
          softer: "#242933",
        },
        paper: {
          DEFAULT: "#F6F3ED",
          soft: "#EFEBE2",
        },
        signal: {
          50: "#FFF1EC",
          100: "#FFDFD3",
          300: "#FF9D7E",
          500: "#FF6A45",
          600: "#F0522C",
          700: "#C93F1F",
        },
        current: {
          50: "#E6F5F4",
          100: "#C0E6E4",
          300: "#5FADA9",
          500: "#0B6E6B",
          600: "#095B58",
          700: "#074645",
        },
        gold: {
          100: "#FBEACB",
          300: "#F0CA7C",
          500: "#E7A93D",
          600: "#C68C28",
        },
        muted: {
          DEFAULT: "#8B96A3",
          dark: "#5B6572",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      keyframes: {
        "waveform-bar": {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
        "avatar-bob": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        blink: {
          "0%, 90%, 100%": { transform: "scaleY(1)" },
          "95%": { transform: "scaleY(0.1)" },
        },
      },
      animation: {
        "waveform-bar": "waveform-bar 1s ease-in-out infinite",
        "avatar-bob": "avatar-bob 3.5s ease-in-out infinite",
        blink: "blink 4.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
