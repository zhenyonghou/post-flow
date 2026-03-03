import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { addAntiDetectToContext } from "../browser-human/antiDetect.js";
import { buildHumanLikeConfig } from "../browser-human/config.js";
import { HumanLike } from "../browser-human/HumanLike.js";
import type { PostFlowConfig } from "../config.js";
import { ensureUserDataDir } from "../config.js";
import { logger } from "../logger.js";

/**
 * 管理持久化浏览器上下文（有头模式 + userDataDir）或 attach 到已用 --remote-debugging-port 启动的 Chrome。
 * 登录态与 Cookie 在多次运行间保留。
 * 启动与反检测逻辑委托给 browser-human，拟人行为由 HumanLike 提供。
 */
export class BrowserService {
  private context: BrowserContext | null = null;
  /** Set when connected via CDP; close() will only disconnect, not close user's browser. */
  private attachedBrowser: Browser | null = null;
  private human: HumanLike;

  constructor(private config: PostFlowConfig) {
    this.human = new HumanLike(buildHumanLikeConfig(config.browserHuman ?? {}));
  }

  getHuman(): HumanLike {
    return this.human;
  }

  getPublishUrl(): string {
    return this.config.publishUrl;
  }

  getConfig(): PostFlowConfig {
    return this.config;
  }

  async launch(): Promise<BrowserContext> {
    if (this.context) return this.context;
    const endpoint = this.config.cdpEndpoint?.trim();
    if (endpoint) {
      logger.info("Attaching to existing browser via CDP:", endpoint);
      const browser = await chromium.connectOverCDP(endpoint);
      const contexts = browser.contexts();
      if (contexts.length === 0) {
        await browser.close();
        throw new Error("Attached browser has no context. Ensure Chrome was started with a profile.");
      }
      this.attachedBrowser = browser;
      this.context = contexts[0];
      addAntiDetectToContext(this.context);
      return this.context;
    }
    ensureUserDataDir(this.config.userDataDir);
    logger.info("Launching persistent browser (headful), userDataDir:", this.config.userDataDir);
    const channel = this.config.browserChannel ?? "chrome";
    this.context = await chromium.launchPersistentContext(this.config.userDataDir, {
      headless: false,
      viewport: this.config.viewport,
      locale: "zh-CN",
      channel,
      args: ["--disable-blink-features=AutomationControlled"],
    });
    addAntiDetectToContext(this.context);
    return this.context;
  }

  async close(): Promise<void> {
    if (this.attachedBrowser) {
      await this.attachedBrowser.close();
      this.attachedBrowser = null;
      this.context = null;
      logger.info("Disconnected from browser (browser left open).");
      return;
    }
    if (this.context) {
      await this.context.close();
      this.context = null;
      logger.info("Browser context closed.");
    }
  }

  /** Returns true if pageUrl is the same publish page as publishUrl (same origin and path). */
  private isSamePublishPage(pageUrl: string, publishUrl: string): boolean {
    try {
      const a = new URL(pageUrl);
      const b = new URL(publishUrl);
      if (a.origin !== b.origin) return false;
      return a.pathname === b.pathname || a.pathname.startsWith(b.pathname + "/");
    } catch {
      return false;
    }
  }

  /**
   * Get a page that is on the publish URL. Reuses an existing tab if one is already on the publish page (attach mode);
   * otherwise creates a new page and navigates to publishUrl.
   */
  async getPageForPublishUrl(): Promise<Page> {
    const ctx = await this.launch();
    const publishUrl = this.config.publishUrl;
    for (const p of ctx.pages()) {
      if (p.isClosed()) continue;
      try {
        if (this.isSamePublishPage(p.url(), publishUrl)) {
          logger.info("Reusing existing tab on publish page:", p.url());
          return p;
        }
      } catch {
        // ignore invalid URL
      }
    }
    const page = await ctx.newPage();
    await page.goto(publishUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    return page;
  }

  async newPage(): Promise<Page> {
    const ctx = await this.launch();
    return ctx.newPage();
  }
}
