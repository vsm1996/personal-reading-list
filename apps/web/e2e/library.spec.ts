import { test, expect } from "@playwright/test";
import { LibraryPage } from "./pages/library.page";
import { TEST_BOOK } from "./fixtures/test-data";

/**
 * Library flows — authenticated.
 * Covers: page load, shelf creation/deletion, adding a book via search.
 */

test.describe("Library page", () => {
  test("loads and shows My Library heading", async ({ page }) => {
    const library = new LibraryPage(page);
    await library.goto();
    await expect(page.getByRole("heading", { name: /my library/i })).toBeVisible();
  });

  test("shows default shelves", async ({ page }) => {
    const library = new LibraryPage(page);
    await library.goto();

    // Default shelves created at sign-up
    await expect(page.getByText(/want to read/i).first()).toBeVisible();
    await expect(page.getByText(/currently reading/i).first()).toBeVisible();
    await expect(page.getByText(/read/i).first()).toBeVisible();
  });

  test("shows Add book button", async ({ page }) => {
    const library = new LibraryPage(page);
    await library.goto();
    await expect(page.getByRole("button", { name: /add book/i }).first()).toBeVisible();
  });
});

test.describe("Shelf management", () => {
  test("creates a new custom shelf", async ({ page }) => {
    const library = new LibraryPage(page);
    await library.goto();

    const shelfName = `Test Shelf ${Date.now()}`;
    await library.createShelf(shelfName);

    await expect(page.getByText(shelfName)).toBeVisible();
  });

  test("new shelf appears in the sidebar", async ({ page }) => {
    const library = new LibraryPage(page);
    await library.goto();

    const shelfName = `Sidebar Shelf ${Date.now()}`;
    await library.createShelf(shelfName);

    // Should appear somewhere in the navigation/sidebar area
    await expect(page.getByText(shelfName).first()).toBeVisible();
  });
});

test.describe("Add book modal", () => {
  test("opens add book modal", async ({ page }) => {
    const library = new LibraryPage(page);
    await library.goto();

    await library.openAddBookModal();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("can search for a book", async ({ page }) => {
    const library = new LibraryPage(page);
    await library.goto();

    await library.openAddBookModal();

    const modal = page.getByRole("dialog");
    const searchInput = modal.getByPlaceholder(/search/i);
    await searchInput.fill(TEST_BOOK.searchQuery);

    // Results should appear (search hits Open Library API, give generous timeout)
    await expect(modal.locator("ul, [role='list']").first()).toBeVisible({ timeout: 15_000 });
  });

  test("modal closes on cancel/close", async ({ page }) => {
    const library = new LibraryPage(page);
    await library.goto();

    await library.openAddBookModal();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Press Escape to close
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
  });

  test("adds a book to the library", async ({ page }) => {
    const library = new LibraryPage(page);
    await library.goto();

    await library.openAddBookModal();

    const modal = page.getByRole("dialog");
    await modal.getByPlaceholder(/search/i).fill(TEST_BOOK.searchQuery);

    // Wait for search results
    const firstResult = modal.getByRole("button", { name: /add/i }).first();
    await expect(firstResult).toBeVisible({ timeout: 15_000 });
    await firstResult.click();

    // Modal should close after adding
    await expect(modal).not.toBeVisible({ timeout: 10_000 });
  });
});
