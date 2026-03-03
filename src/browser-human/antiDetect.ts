/**
 * 反检测脚本：在浏览器上下文中注入，降低自动化特征被识别的概率。
 * 通过 context.addInitScript 注入，保证每个新页面都会执行。
 */

import type { BrowserContext } from "playwright";

/**
 * 将反检测逻辑注册到 Playwright 的 BrowserContext。
 * 之后该 context 下创建的所有新页面都会在加载前执行该脚本。
 *
 * 当前注入内容：
 * 1. 隐藏 navigator.webdriver（常见自动化检测点）
 * 2. 补全 window.chrome.runtime（部分站点会检测 Chrome 环境）
 *
 * @param context - Playwright 的浏览器上下文（如 launchPersistentContext 的返回值）
 */
export function addAntiDetectToContext(context: BrowserContext): void {
  context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
      configurable: true,
    });
    const w = window as unknown as { chrome?: unknown };
    if (typeof w.chrome === "undefined") {
      w.chrome = { runtime: {} };
    }
  });
}
