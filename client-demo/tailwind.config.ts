import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { lead: { blue: "#2563EB", navy: "#0F172A", soft: "#F8FAFC", yellow: "#FACC15", gray: "#475569" } }, boxShadow: { soft: "0 18px 50px rgba(15,23,42,.08)" }, fontFamily: { heading: ["Poppins", "Inter", "sans-serif"], body: ["Inter", "sans-serif"] } } },
  plugins: []
};
export default config;
