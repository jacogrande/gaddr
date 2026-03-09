"use client";

import { MoonIcon, SunIcon } from "@phosphor-icons/react";
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
      title={mounted && theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="gaddr-theme-toggle fixed bottom-4 right-4 z-[70] inline-flex h-11 w-11 items-center justify-center rounded-full text-[1rem] transition-colors"
      onClick={toggleTheme}
    >
      <span className="gaddr-theme-toggle__icon" aria-hidden="true">
        {mounted && theme === "dark" ? (
          <MoonIcon size={18} weight="regular" />
        ) : (
          <SunIcon size={18} weight="regular" />
        )}
      </span>
    </button>
  );
}
