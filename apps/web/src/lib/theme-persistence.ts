export type Theme = "light" | "dark";

export const THEME_KEY = "bookshelf-theme";

export function getStoredTheme(storage: Storage): Theme | null {
  const v = storage.getItem(THEME_KEY);
  if (v === "light" || v === "dark") return v;
  return null;
}

export function setStoredTheme(storage: Storage, theme: Theme): void {
  storage.setItem(THEME_KEY, theme);
}

export function getSystemTheme(mql: { matches: boolean }): Theme {
  return mql.matches ? "dark" : "light";
}

/** Stored value takes priority; falls back to system preference. */
export function resolveInitialTheme(
  storage: Storage,
  mql: { matches: boolean },
): Theme {
  return getStoredTheme(storage) ?? getSystemTheme(mql);
}
