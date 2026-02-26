import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";

const headingFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "gaddr",
  description: "Minimal writing skeleton",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} min-h-screen bg-gray-50 text-gray-900 antialiased`}>{children}</body>
    </html>
  );
}
