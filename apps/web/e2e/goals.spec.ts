import { test, expect } from "@playwright/test";
import { GoalsPage } from "./pages/goals.page";

/**
 * Reading goal flows — authenticated.
 * Covers: page load, goal setting, goal updating, progress display.
 */

test.describe("Goals page", () => {
  test("loads and shows Reading Goal heading", async ({ page }) => {
    const goals = new GoalsPage(page);
    await goals.goto();
    await expect(page.getByRole("heading", { name: /reading goal/i })).toBeVisible();
  });

  test("shows 'no goal set' message when no goal exists", async ({ page }) => {
    const goals = new GoalsPage(page);
    await goals.goto();

    // Either shows the no-goal message or already has a goal set from prior tests
    const noGoalMsg = page.getByText(/haven.*t set a reading goal/i);
    const goalDisplay = page.getByText(/books to go|on track|ahead|behind|goal complete/i);

    const hasMessage = await noGoalMsg.isVisible().catch(() => false);
    const hasGoal = await goalDisplay.isVisible().catch(() => false);

    expect(hasMessage || hasGoal).toBe(true);
  });

  test("shows goal setter form", async ({ page }) => {
    const goals = new GoalsPage(page);
    await goals.goto();

    await expect(
      page.getByRole("heading", { name: /set a goal|update goal/i })
    ).toBeVisible();
  });

  test("can set a reading goal", async ({ page }) => {
    const goals = new GoalsPage(page);
    await goals.goto();

    // Find and fill the goal input
    const input = page.getByRole("spinbutton").or(page.getByLabel(/books/i)).first();
    await input.fill("24");

    // Submit
    const saveBtn = page.getByRole("button", { name: /save|set goal|update/i }).first();
    await saveBtn.click();

    // The page should reflect the new goal — look for 24 in the progress display
    await expect(page.getByText(/24/).first()).toBeVisible({ timeout: 10_000 });
  });

  test("can update an existing goal", async ({ page }) => {
    const goals = new GoalsPage(page);
    await goals.goto();

    // Set initial goal
    const input = page.getByRole("spinbutton").or(page.getByLabel(/books/i)).first();
    await input.fill("12");
    await page.getByRole("button", { name: /save|set goal|update/i }).first().click();

    await page.waitForTimeout(500);

    // Update to a different goal
    const inputAgain = page.getByRole("spinbutton").or(page.getByLabel(/books/i)).first();
    await inputAgain.fill("20");
    await page.getByRole("button", { name: /save|set goal|update/i }).first().click();

    await expect(page.getByText(/20/).first()).toBeVisible({ timeout: 10_000 });
  });

  test("shows progress statistics after goal is set", async ({ page }) => {
    const goals = new GoalsPage(page);
    await goals.goto();

    // Set a goal first
    const input = page.getByRole("spinbutton").or(page.getByLabel(/books/i)).first();
    await input.fill("10");
    await page.getByRole("button", { name: /save|set goal|update/i }).first().click();

    // Stats section should appear
    await expect(
      page.getByText(/books to go|on track|ahead|behind|needed|completed|pace/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows progress ring / visual indicator", async ({ page }) => {
    const goals = new GoalsPage(page);
    await goals.goto();

    // Set a goal so the ring appears
    const input = page.getByRole("spinbutton").or(page.getByLabel(/books/i)).first();
    await input.fill("15");
    await page.getByRole("button", { name: /save|set goal|update/i }).first().click();

    // SVG circle (progress ring) should be visible
    await expect(page.locator("svg circle").first()).toBeVisible({ timeout: 10_000 });
  });
});
