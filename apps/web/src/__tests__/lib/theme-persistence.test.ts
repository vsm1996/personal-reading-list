import { describe, it, expect, beforeEach } from "vitest";
import {
  getStoredTheme,
  setStoredTheme,
  getSystemTheme,
  resolveInitialTheme,
  THEME_KEY,
} from "@/lib/theme-persistence";

// Minimal Storage implementation backed by a Map — no DOM required.
function makeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
    clear: () => map.clear(),
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
  };
}

function makeMql(prefersDark: boolean) {
  return { matches: prefersDark };
}

describe("getStoredTheme", () => {
  it("returns 'dark' when storage contains 'dark'", () => {
    const s = makeStorage();
    s.setItem(THEME_KEY, "dark");
    expect(getStoredTheme(s)).toBe("dark");
  });

  it("returns 'light' when storage contains 'light'", () => {
    const s = makeStorage();
    s.setItem(THEME_KEY, "light");
    expect(getStoredTheme(s)).toBe("light");
  });

  it("returns null when storage contains an unrecognised value", () => {
    const s = makeStorage();
    s.setItem(THEME_KEY, "blue");
    expect(getStoredTheme(s)).toBeNull();
  });

  it("returns null when storage has no entry for the key", () => {
    const s = makeStorage();
    expect(getStoredTheme(s)).toBeNull();
  });
});

describe("setStoredTheme", () => {
  it("writes 'dark' to storage", () => {
    const s = makeStorage();
    setStoredTheme(s, "dark");
    expect(s.getItem(THEME_KEY)).toBe("dark");
  });

  it("writes 'light' to storage", () => {
    const s = makeStorage();
    setStoredTheme(s, "light");
    expect(s.getItem(THEME_KEY)).toBe("light");
  });

  it("overwrites a previous value", () => {
    const s = makeStorage();
    setStoredTheme(s, "dark");
    setStoredTheme(s, "light");
    expect(s.getItem(THEME_KEY)).toBe("light");
  });
});

describe("getSystemTheme", () => {
  it("returns 'dark' when prefers-color-scheme is dark", () => {
    expect(getSystemTheme(makeMql(true))).toBe("dark");
  });

  it("returns 'light' when prefers-color-scheme is light", () => {
    expect(getSystemTheme(makeMql(false))).toBe("light");
  });
});

describe("resolveInitialTheme", () => {
  it("returns the stored value when present and valid", () => {
    const s = makeStorage();
    s.setItem(THEME_KEY, "light");
    expect(resolveInitialTheme(s, makeMql(true))).toBe("light");
  });

  it("falls back to system preference when storage is empty", () => {
    const s = makeStorage();
    expect(resolveInitialTheme(s, makeMql(true))).toBe("dark");
    expect(resolveInitialTheme(s, makeMql(false))).toBe("light");
  });

  it("falls back to system preference when stored value is invalid", () => {
    const s = makeStorage();
    s.setItem(THEME_KEY, "invalid");
    expect(resolveInitialTheme(s, makeMql(true))).toBe("dark");
  });

  it("stored light overrides a dark system preference", () => {
    const s = makeStorage();
    s.setItem(THEME_KEY, "light");
    expect(resolveInitialTheme(s, makeMql(true))).toBe("light");
  });

  it("stored dark overrides a light system preference", () => {
    const s = makeStorage();
    s.setItem(THEME_KEY, "dark");
    expect(resolveInitialTheme(s, makeMql(false))).toBe("dark");
  });
});
