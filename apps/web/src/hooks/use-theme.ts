"use client";

import { useEffect, useState } from "react";
import {
  type Theme,
  THEME_KEY,
  getStoredTheme,
  getSystemTheme,
  setStoredTheme,
} from "@/lib/theme-persistence";

export function useTheme() {
  // Start with 'dark' so the SSR default matches the most common dark-mode
  // preference; the inline script in layout.tsx corrects it before hydration.
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read the data-theme the inline script already set (no flash)
    const attr = document.documentElement.getAttribute("data-theme");
    const initial: Theme =
      attr === "light" || attr === "dark"
        ? attr
        : (getStoredTheme(localStorage) ??
          getSystemTheme(window.matchMedia("(prefers-color-scheme: dark)")));

    setTheme(initial);
    setMounted(true);

    // Follow system changes only when the user hasn't pinned a preference
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    function onSystemChange(e: MediaQueryListEvent) {
      if (!getStoredTheme(localStorage)) {
        apply(e.matches ? "dark" : "light", false);
      }
    }
    mql.addEventListener("change", onSystemChange);
    return () => mql.removeEventListener("change", onSystemChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function apply(next: Theme, persist: boolean) {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    if (persist) {
      setStoredTheme(localStorage, next);
    } else {
      // Clear stored value so system changes can take over again
      localStorage.removeItem(THEME_KEY);
    }
  }

  function toggleTheme() {
    apply(theme === "dark" ? "light" : "dark", true);
  }

  return { theme, toggleTheme, mounted };
}
