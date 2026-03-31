import { test, expect } from "@playwright/test";

/**
 * Landing page — public, unauthenticated.
 * Verifies the hero section, feature cards, and CTA links.
 */

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders hero headline", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/beautifully/i);
  });

  test("renders all four feature cards", async ({ page }) => {
    await expect(page.getByText(/search millions of books/i)).toBeVisible();
    await expect(page.getByText(/organize your shelves/i)).toBeVisible();
    await expect(page.getByText(/track your progress/i)).toBeVisible();
    await expect(page.getByText(/hit your reading goal/i)).toBeVisible();
  });

  test("Get started CTA links to /sign-up", async ({ page }) => {
    const ctaLink = page.getByRole("link", { name: /get started/i }).first();
    await expect(ctaLink).toHaveAttribute("href", "/sign-up");
  });

  test("Sign in nav link goes to /sign-in", async ({ page }) => {
    await page.getByRole("link", { name: /sign in/i }).first().click();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("Start for free CTA goes to /sign-up", async ({ page }) => {
    await page.getByRole("link", { name: /start for free/i }).click();
    await expect(page).toHaveURL(/\/sign-up/);
  });

  test("Try as guest link goes to /guest", async ({ page }) => {
    const guestLink = page.getByRole("link", { name: /try as guest/i });
    await expect(guestLink).toHaveAttribute("href", "/guest");
  });

  test("footer contains Open Library attribution", async ({ page }) => {
    await expect(page.getByRole("contentinfo")).toContainText(/open library/i);
  });
});
