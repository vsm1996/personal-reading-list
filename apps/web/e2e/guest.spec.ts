import { test, expect } from "@playwright/test";

/**
 * Guest mode — public, unauthenticated.
 * The guest page performs anonymous Supabase sign-in, seeds a demo library,
 * then redirects to /library.
 *
 * NOTE: These tests require anonymous sign-in to be enabled in Supabase.
 * If it's disabled, the tests will verify the error state instead.
 */

test.describe("Guest page", () => {
  test("guest page is publicly accessible", async ({ page }) => {
    const response = await page.goto("/guest");
    // Should not 404 or hard crash
    expect(response?.status()).not.toBe(404);
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
  });

  test("shows loading state while session starts", async ({ page }) => {
    await page.goto("/guest");
    // Immediately after load, should show a loading indicator or the error state
    // (not a blank page)
    const isLoading = await page.getByText(/starting guest session|setting up/i).isVisible();
    const isError = await page.getByText(/couldn.*t start guest session/i).isVisible();
    expect(isLoading || isError).toBe(true);
  });

  test("either redirects to /library or shows a helpful error", async ({ page }) => {
    await page.goto("/guest");

    // Give the session time to start or fail
    await page.waitForTimeout(3_000);

    const url = page.url();
    const onLibrary = url.includes("/library");
    const errorVisible = await page.getByText(/couldn.*t start guest session/i).isVisible();

    // One of these must be true
    expect(onLibrary || errorVisible).toBe(true);
  });

  test("error state shows a Back to home link", async ({ page }) => {
    await page.goto("/guest");

    // Wait to see if we get an error (anonymous sign-in may be disabled)
    await page.waitForTimeout(5_000);

    const errorVisible = await page.getByText(/couldn.*t start guest session/i).isVisible();
    if (errorVisible) {
      await expect(page.getByRole("link", { name: /back to home/i })).toBeVisible();
    }
  });
});
