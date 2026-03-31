import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class AuthPage {
  constructor(private page: Page) {}

  async signIn(email: string, password: string) {
    await this.page.goto("/sign-in");
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password").fill(password);
    await this.page.getByRole("button", { name: /sign in/i }).click();
  }

  async signUp(email: string, password: string) {
    await this.page.goto("/sign-up");
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password").fill(password);
    await this.page.getByRole("button", { name: /create account/i }).click();
  }

  async signOut() {
    // Sign out via the nav — look for a sign-out button or link
    const signOutBtn = this.page.getByRole("button", { name: /sign out/i });
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
    } else {
      // Fallback: navigate directly to the sign-out route if it exists
      await this.page.goto("/api/auth/sign-out");
    }
    await expect(this.page).toHaveURL(/\/(sign-in|$)/, { timeout: 10_000 });
  }

  get errorMessage() {
    return this.page.locator("[class*='bg-error']");
  }

  get successConfirmation() {
    return this.page.getByText(/check your email/i);
  }
}
