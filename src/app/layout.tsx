import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.learn-english-daily.com"),
  title: "LEAD | Learn English Daily",
  description: "Live online English classes for confident speaking, IELTS, grammar, and career communication.",
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
