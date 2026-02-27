import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { ThemeToggle } from "./theme-toggle";
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

const THEME_INIT_SCRIPT = `(() => {
  const fallbackTheme = "light";
  try {
    const storedTheme = window.localStorage.getItem("gaddr:theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme = storedTheme === "dark" || storedTheme === "light" ? storedTheme : prefersDark ? "dark" : fallbackTheme;
    document.documentElement.setAttribute("data-theme", nextTheme);
  } catch {
    document.documentElement.setAttribute("data-theme", fallbackTheme);
  }
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${headingFont.variable} min-h-screen antialiased`}>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
