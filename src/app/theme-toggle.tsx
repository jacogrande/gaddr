"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "gaddr:theme";

function getResolvedTheme(): Theme {
  if (typeof document === "undefined") {
    return "light";
  }

  const current = document.documentElement.getAttribute("data-theme");
  if (current === "dark" || current === "light") {
    return current;
  }

  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

function setTheme(theme: Theme): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-theme", theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures.
  }
}

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(getResolvedTheme());
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setThemeState(nextTheme);
    setTheme(nextTheme);
  }, [theme]);

  return (
    <button
      type="button"
      aria-label="Toggle color theme"
      aria-pressed={mounted ? theme === "dark" : false}
      className="gaddr-theme-toggle fixed right-4 top-4 z-[70] inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[0.64rem] font-semibold tracking-[0.08em] transition-colors"
      onClick={toggleTheme}
    >
      <span>{mounted && theme === "dark" ? "DARK" : "LIGHT"}</span>
      <span className="gaddr-theme-toggle__icon" aria-hidden="true">
        {mounted && theme === "dark" ? "☾" : "☼"}
      </span>
    </button>
  );
}
