import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class GoalsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/goals");
    await expect(this.page.getByRole("heading", { name: /reading goal/i })).toBeVisible({
      timeout: 10_000,
    });
  }

  async setGoal(target: number): Promise<void> {
    const input = this.page.getByLabel(/books/i).first();
    await input.clear();
    await input.fill(String(target));
    await this.page.getByRole("button", { name: /save|set goal|update/i }).click();
    // Wait for the page to reflect the new goal
    await expect(this.page.getByText(String(target))).toBeVisible({ timeout: 10_000 });
  }

  get progressRing(): ReturnType<Page["locator"]> {
    return this.page.locator("svg circle, [class*='progress-ring'], [data-testid='progress-ring']").first();
  }

  get booksReadCount(): ReturnType<Page["locator"]> {
    return this.page.locator("[data-testid='books-read'], [class*='books-read']").first();
  }

  get noGoalMessage(): ReturnType<Page["locator"]> {
    return this.page.getByText(/haven.*t set a reading goal/i);
  }

  get goalCompleteMessage(): ReturnType<Page["locator"]> {
    return this.page.getByText(/goal complete/i);
  }
}
