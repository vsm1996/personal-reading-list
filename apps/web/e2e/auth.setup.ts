/**
 * Auth setup — runs once before all authenticated tests.
 * Logs in with test credentials and saves session cookies to
 * e2e/.auth/user.json so every "e2e" project test starts authenticated.
 */
import { test as setup, expect } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.test") });

const AUTH_FILE = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_EMAIL!;
  const password = process.env.E2E_PASSWORD!;

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for redirect to /library — confirms successful auth
  await expect(page).toHaveURL(/\/library/, { timeout: 15_000 });

  // Persist storage state for all subsequent tests
  await page.context().storageState({ path: AUTH_FILE });
});
