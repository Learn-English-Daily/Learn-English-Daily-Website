import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        lead: {
          blue: "#2563EB",
          navy: "#0F172A",
          soft: "#F8FAFC",
          yellow: "#FACC15",
          gray: "#475569"
        }
      },
      boxShadow: {
        soft: "0 18px 50px rgba(15, 23, 42, 0.08)"
      },
      fontFamily: {
        heading: ["Poppins", "Montserrat", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Inter", "Open Sans", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
