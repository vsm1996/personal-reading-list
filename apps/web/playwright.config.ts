import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for the Bookshelf web app.
 *
 * Auth strategy — two Playwright projects:
 *   1. "setup"  — runs auth.setup.ts once, saves session cookies to
 *                 e2e/.auth/user.json for all subsequent tests.
 *   2. "e2e"    — all authenticated specs; depends on "setup".
 *   3. "public" — unauthenticated specs (landing, guest mode).
 *
 * Required env vars (see e2e/.env.test.example):
 *   E2E_EMAIL            — test user email
 *   E2E_PASSWORD         — test user password
 *   SUPABASE_SERVICE_ROLE_KEY — admin key for creating/deleting test user
 *   NEXT_PUBLIC_SUPABASE_URL  — already in .env.local
 */

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,   // avoid races on shared test-user data
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { outputFolder: "e2e-report", open: "never" }], ["list"]],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    // Shared locale so date formatting is deterministic in tests
    locale: "en-US",
    timezoneId: "UTC",
  },

  projects: [
    // ── 1. Auth setup ──────────────────────────────────────────────────────────
    // Runs once, logs in, saves cookies to e2e/.auth/user.json
    {
      name: "setup",
      testMatch: "**/auth.setup.ts",
    },

    // ── 2. Authenticated tests ─────────────────────────────────────────────────
    {
      name: "e2e",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      testIgnore: ["**/auth.setup.ts", "**/guest.spec.ts", "**/landing.spec.ts"],
    },

    // ── 3. Public / unauthenticated tests ──────────────────────────────────────
    {
      name: "public",
      use: { ...devices["Desktop Chrome"] },
      testMatch: ["**/guest.spec.ts", "**/landing.spec.ts", "**/theme.spec.ts"],
    },
  ],

  // Start dev server automatically unless it's already running
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
});
