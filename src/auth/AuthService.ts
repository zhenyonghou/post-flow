import type { Page } from "playwright";
import type { BrowserService } from "../browser/BrowserService.js";
import { logger } from "../logger.js";

/** Selectors for Xiaohongshu creator center (semantic / role where possible). */
const SELECTORS = {
  loggedIn: "[data-e2e='user-avatar'], .avatar, [class*='avatar']",
  loginButton: "text=登录",
  loginForm: "form, [role='form']",
} as const;

/**
 * Handles login state check and first-time manual login.
 * Uses persistent context so after first login, subsequent runs stay logged in.
 */
export class AuthService {
  constructor(private browser: BrowserService) {}

  /**
   * Opens publish page and checks if already logged in.
   * When using attach mode, reuses an existing tab if it is already on the publish page.
   * If not logged in, waits for user to log in manually (headful window).
   */
  async ensureLoggedIn(): Promise<Page> {
    const page = await this.browser.getPageForPublishUrl();
    await this.browser.getHuman().randomDelay();

    const loggedIn = await this.checkLoggedIn(page);
    if (loggedIn) {
      logger.info("Already logged in.");
      return page;
    }

    logger.info("Not logged in. Please log in manually in the browser window.");
    await this.waitForManualLogin(page);
    return page;
  }

  private async checkLoggedIn(page: Page): Promise<boolean> {
    try {
      await page.locator(SELECTORS.loggedIn).first().waitFor({ state: "visible", timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  private async waitForManualLogin(page: Page): Promise<void> {
    await page.locator(SELECTORS.loggedIn).first().waitFor({ state: "visible", timeout: 300_000 });
    logger.info("Login detected. Continuing.");
    await this.browser.getHuman().randomDelay();
  }
}
