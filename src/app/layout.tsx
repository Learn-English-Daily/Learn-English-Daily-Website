import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.learn-english-daily.com"),
  title: "LEAD | Learn English Daily",
  description: "LEAD offers fun and engaging online English classes that help learners communicate confidently in everyday situations.",
  icons: {
    icon: "/images/brand-icon-cropped.png",
    apple: "/images/brand-icon-cropped.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
