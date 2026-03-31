import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

export class ImportPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/import");
    await expect(this.page.getByRole("heading", { name: /import from goodreads/i })).toBeVisible({
      timeout: 10_000,
    });
  }

  /**
   * Upload a CSV string as a file via the hidden file input.
   * Writes content to a temp file, sets it on the input, then cleans up.
   */
  async uploadCSV(content: string, filename = "goodreads_export.csv"): Promise<void> {
    const tmpPath = path.join(os.tmpdir(), filename);
    fs.writeFileSync(tmpPath, content, "utf8");

    const fileInput = this.page.locator('input[type="file"][accept=".csv"]');
    await fileInput.setInputFiles(tmpPath);

    fs.unlinkSync(tmpPath);
  }

  async uploadNonCSV(): Promise<void> {
    const tmpPath = path.join(os.tmpdir(), "not_a_csv.txt");
    fs.writeFileSync(tmpPath, "This is not a CSV file", "utf8");

    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(tmpPath);

    fs.unlinkSync(tmpPath);
  }

  async waitForPreview(): Promise<void> {
    await expect(this.page.getByRole("table")).toBeVisible({ timeout: 10_000 });
  }

  async clickImport(): Promise<void> {
    await this.page.getByRole("button", { name: /import \d+ book/i }).click();
  }

  async waitForDone(): Promise<void> {
    await expect(this.page.getByText(/import complete/i)).toBeVisible({ timeout: 30_000 });
  }

  get errorMessage(): ReturnType<Page["locator"]> {
    return this.page.getByText(/something went wrong|please upload a .csv/i);
  }

  get previewTable(): ReturnType<Page["locator"]> {
    return this.page.getByRole("table");
  }

  get importResultSummary(): ReturnType<Page["locator"]> {
    return this.page.getByText(/imported.*book/i);
  }
}
