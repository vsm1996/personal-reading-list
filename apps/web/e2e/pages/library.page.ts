import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

export class LibraryPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/library");
    await expect(this.page.getByRole("heading", { name: /my library/i })).toBeVisible({
      timeout: 15_000,
    });
  }

  // ── Shelf management ────────────────────────────────────────────────────────

  async createShelf(name: string): Promise<void> {
    await this.page.getByRole("button", { name: /new shelf/i }).click();
    const modal = this.page.getByRole("dialog");
    await modal.getByLabel(/shelf name/i).fill(name);
    await modal.getByRole("button", { name: /create/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 5_000 });
    await expect(this.page.getByText(name)).toBeVisible();
  }

  async renameShelf(oldName: string, newName: string): Promise<void> {
    const shelfItem = this.page.locator(`[data-shelf-name="${oldName}"]`).first();
    await shelfItem.getByRole("button", { name: /rename/i }).click();
    const modal = this.page.getByRole("dialog");
    const input = modal.getByLabel(/shelf name/i);
    await input.clear();
    await input.fill(newName);
    await modal.getByRole("button", { name: /save|rename/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 5_000 });
  }

  async deleteShelf(name: string): Promise<void> {
    const shelfItem = this.page.locator(`[data-shelf-name="${name}"]`).first();
    await shelfItem.getByRole("button", { name: /delete/i }).click();
    const modal = this.page.getByRole("dialog");
    await modal.getByRole("button", { name: /delete/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 5_000 });
  }

  // ── Add book modal ──────────────────────────────────────────────────────────

  async openAddBookModal(): Promise<void> {
    await this.page.getByRole("button", { name: /add book/i }).first().click();
    await expect(this.page.getByRole("dialog")).toBeVisible();
  }

  async searchBook(query: string): Promise<void> {
    const modal = this.page.getByRole("dialog");
    await modal.getByPlaceholder(/search/i).fill(query);
    // Wait for results to load
    await expect(modal.locator("[data-testid='search-result'], [class*='search-result']").first())
      .toBeVisible({ timeout: 10_000 })
      .catch(() => {
        // fallback: wait for any list item in the modal
        return expect(modal.getByRole("listitem").first()).toBeVisible({ timeout: 10_000 });
      });
  }

  async addFirstSearchResult(): Promise<void> {
    const modal = this.page.getByRole("dialog");
    await modal.getByRole("button", { name: /add/i }).first().click();
    // Wait for success or modal close
    await expect(modal).not.toBeVisible({ timeout: 10_000 });
  }

  async closeModal(): Promise<void> {
    const modal = this.page.getByRole("dialog");
    const closeBtn = modal.getByRole("button", { name: /close|cancel/i }).first();
    await closeBtn.click();
    await expect(modal).not.toBeVisible({ timeout: 5_000 });
  }

  // ── Book cards ──────────────────────────────────────────────────────────────

  getBookCard(title: string): Locator {
    return this.page.locator(`[data-testid="book-card"]`).filter({ hasText: title }).first();
  }

  async clickBook(title: string): Promise<void> {
    await this.getBookCard(title).click();
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  get shelfList(): Locator {
    return this.page.locator("nav, aside").first();
  }

  shelfLink(name: string): Locator {
    return this.page.getByRole("link", { name }).filter({ hasText: name }).first();
  }
}
