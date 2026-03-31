import { test, expect } from "@playwright/test";

/**
 * Auth flows — sign-in, sign-up, error states, redirect guards.
 * These run unauthenticated (no storageState) so they use fresh sessions.
 */

const E2E_EMAIL = process.env.E2E_EMAIL ?? "e2e-test@example.com";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "e2e-password-123";

test.describe("Sign-in", () => {
  test("renders sign-in form", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows error for wrong credentials", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("wrong@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/incorrect email or password/i)).toBeVisible({
      timeout: 10_000,
    });
    // Should stay on sign-in page
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("redirects to /library on successful sign-in", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(E2E_EMAIL);
    await page.getByLabel("Password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/library/, { timeout: 15_000 });
  });

  test("forgot password link goes to /reset-password", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("link", { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/\/reset-password/);
  });

  test("sign up link goes to /sign-up", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("link", { name: /sign up/i }).click();
    await expect(page).toHaveURL(/\/sign-up/);
  });
});

test.describe("Sign-up", () => {
  test("renders sign-up form", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByRole("heading", { name: /create an account/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("shows confirmation screen after sign-up submission", async ({ page }) => {
    await page.goto("/sign-up");
    // Use a unique email to avoid "already registered" errors
    const uniqueEmail = `e2e-signup-${Date.now()}@example.com`;
    await page.getByLabel("Email").fill(uniqueEmail);
    await page.getByLabel("Password").fill("validpassword123");
    await page.getByRole("button", { name: /create account/i }).click();

    // Should show "Check your email" confirmation state
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10_000 });
  });

  test("sign in link goes to /sign-in", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe("Auth guards", () => {
  test("unauthenticated /library redirects to /sign-in", async ({ page }) => {
    await page.goto("/library");
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10_000 });
  });

  test("unauthenticated /goals redirects to /sign-in", async ({ page }) => {
    await page.goto("/goals");
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10_000 });
  });

  test("unauthenticated /import redirects to /sign-in", async ({ page }) => {
    await page.goto("/import");
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10_000 });
  });
});
