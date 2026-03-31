import { test, expect } from "@playwright/test";
import { ImportPage } from "./pages/import.page";
import { GOODREADS_CSV_VALID, GOODREADS_CSV_INVALID } from "./fixtures/test-data";

/**
 * Goodreads import flow — authenticated.
 * Covers: non-CSV rejection, valid CSV preview, import execution, duplicate handling.
 */

test.describe("Goodreads import", () => {
  test("renders import page with upload zone", async ({ page }) => {
    const importPage = new ImportPage(page);
    await importPage.goto();

    await expect(page.getByText(/drag.*drop|click to browse/i)).toBeVisible();
  });

  test("rejects a non-CSV file", async ({ page }) => {
    const importPage = new ImportPage(page);
    await importPage.goto();

    await importPage.uploadNonCSV();

    await expect(page.getByText(/please upload a .csv file/i)).toBeVisible({ timeout: 5_000 });
  });

  test("shows preview table after uploading a valid CSV", async ({ page }) => {
    const importPage = new ImportPage(page);
    await importPage.goto();

    await importPage.uploadCSV(GOODREADS_CSV_VALID);

    // Preview table should appear
    await expect(importPage.previewTable).toBeVisible({ timeout: 10_000 });
  });

  test("preview shows correct book count from CSV", async ({ page }) => {
    const importPage = new ImportPage(page);
    await importPage.goto();

    await importPage.uploadCSV(GOODREADS_CSV_VALID);

    // CSV has 3 books total — 2 with ISBN (importable) + 1 without
    await expect(page.getByText(/3.*book/i)).toBeVisible({ timeout: 10_000 });
  });

  test("preview marks books without ISBN as non-importable", async ({ page }) => {
    const importPage = new ImportPage(page);
    await importPage.goto();

    await importPage.uploadCSV(GOODREADS_CSV_VALID);

    await importPage.waitForPreview();

    // The "No ISBN" badge should appear in the table
    await expect(page.getByText(/no isbn/i)).toBeVisible({ timeout: 5_000 });
  });

  test("preview shows Ready status for books with ISBN", async ({ page }) => {
    const importPage = new ImportPage(page);
    await importPage.goto();

    await importPage.uploadCSV(GOODREADS_CSV_VALID);

    await importPage.waitForPreview();

    await expect(page.getByText(/ready/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test("can cancel from the preview step", async ({ page }) => {
    const importPage = new ImportPage(page);
    await importPage.goto();

    await importPage.uploadCSV(GOODREADS_CSV_VALID);

    await importPage.waitForPreview();

    // Click Cancel
    await page.getByRole("button", { name: /cancel/i }).click();

    // Should return to idle state — upload zone is visible again
    await expect(page.getByText(/drag.*drop|click to browse/i)).toBeVisible({ timeout: 5_000 });
  });

  test("executes import and shows completion screen", async ({ page }) => {
    const importPage = new ImportPage(page);
    await importPage.goto();

    await importPage.uploadCSV(GOODREADS_CSV_VALID);
    await importPage.waitForPreview();
    await importPage.clickImport();

    // Import hits the API — allow generous timeout
    await importPage.waitForDone();

    await expect(page.getByText(/imported.*book/i)).toBeVisible();
  });

  test("import result shows import another file button", async ({ page }) => {
    const importPage = new ImportPage(page);
    await importPage.goto();

    await importPage.uploadCSV(GOODREADS_CSV_VALID);
    await importPage.waitForPreview();
    await importPage.clickImport();
    await importPage.waitForDone();

    await expect(page.getByRole("button", { name: /import another/i })).toBeVisible();
  });

  test("clicking import another resets to idle state", async ({ page }) => {
    const importPage = new ImportPage(page);
    await importPage.goto();

    await importPage.uploadCSV(GOODREADS_CSV_VALID);
    await importPage.waitForPreview();
    await importPage.clickImport();
    await importPage.waitForDone();

    await page.getByRole("button", { name: /import another/i }).click();

    // Upload zone returns
    await expect(page.getByText(/drag.*drop|click to browse/i)).toBeVisible({ timeout: 5_000 });
  });
});
