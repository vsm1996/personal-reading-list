import { test, expect } from "@playwright/test";

/**
 * Theme toggle E2E tests.
 *
 * These run in the "public" project — no authentication required because
 * the toggle is rendered on the landing page and all authenticated pages.
 *
 * Techniques:
 *   - page.emulateMedia({ colorScheme }) simulates the OS preference
 *   - page.addInitScript() pre-seeds localStorage before the page loads
 *   - data-theme attribute on <html> is the source of truth for active theme
 */

async function getTheme(page: Parameters<typeof test>[1] extends (page: infer P) => unknown ? P : never) {
  return page.locator("html").getAttribute("data-theme");
}

test.describe("Theme initialisation", () => {
  test("defaults to dark when OS prefers dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    expect(await getTheme(page)).toBe("dark");
  });

  test("defaults to light when OS prefers light", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    expect(await getTheme(page)).toBe("light");
  });

  test("stored light overrides a dark OS preference", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => localStorage.setItem("bookshelf-theme", "light"));
    await page.goto("/");
    expect(await getTheme(page)).toBe("light");
  });

  test("stored dark overrides a light OS preference", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript(() => localStorage.setItem("bookshelf-theme", "dark"));
    await page.goto("/");
    expect(await getTheme(page)).toBe("dark");
  });

  test("data-theme is set before DOMContentLoaded (no flash)", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript(() => localStorage.setItem("bookshelf-theme", "dark"));

    // Capture data-theme as soon as the document is parseable
    let themeAtDCL: string | null = null;
    await page.exposeFunction("captureTheme", (t: string) => { themeAtDCL = t; });
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const t = document.documentElement.getAttribute("data-theme");
        (window as unknown as { captureTheme: (t: string) => void }).captureTheme(t ?? "");
      });
    });

    await page.goto("/");
    expect(themeAtDCL).toBe("dark");
  });
});

test.describe("Theme toggle button", () => {
  test("switches from dark to light when toggled", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    expect(await getTheme(page)).toBe("dark");

    await page.getByRole("button", { name: /switch to light mode/i }).first().click();
    expect(await getTheme(page)).toBe("light");
  });

  test("switches from light to dark when toggled", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    expect(await getTheme(page)).toBe("light");

    await page.getByRole("button", { name: /switch to dark mode/i }).first().click();
    expect(await getTheme(page)).toBe("dark");
  });

  test("persists choice across page navigation", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");

    // Toggle to light
    await page.getByRole("button", { name: /switch to light mode/i }).first().click();
    expect(await getTheme(page)).toBe("light");

    // Navigate to another page — choice should survive
    await page.goto("/sign-in");
    expect(await getTheme(page)).toBe("light");
  });

  test("persists choice across full page reload", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");

    await page.getByRole("button", { name: /switch to light mode/i }).first().click();
    await page.reload();
    expect(await getTheme(page)).toBe("light");
  });
});
