import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "LEAD Client Demo", description: "Interactive database-free demonstration of LEAD academy software.", robots: { index: false, follow: false } };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
