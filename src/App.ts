import path from "node:path";
import type { PostFlowConfig } from "./config.js";
import { loadPlatformConfig } from "./config.js";
import { BrowserService } from "./browser/BrowserService.js";
import { AuthService } from "./auth/AuthService.js";
import { PublishFlow } from "./publish/PublishFlow.js";
import { loadPostFromFile } from "./publish/postInput.js";
import type { ResolvedPost } from "./publish/postInput.js";
import type { RecordedStep } from "./record/types.js";
import { RecordFlow } from "./record/RecordFlow.js";
import { ReplayFlow } from "./record/ReplayFlow.js";
import { logger } from "./logger.js";

function selectScriptId(post: ResolvedPost): string {
  if (post.videoPath && post.videoPath.trim()) return "video";
  if (post.imagePaths.length > 0) return "image_text";
  return "long_text";
}

export class App {
  private config: PostFlowConfig;
  private browser: BrowserService;
  private auth: AuthService;

  constructor(config: PostFlowConfig) {
    this.config = config;
    this.browser = new BrowserService(config);
    this.auth = new AuthService(this.browser);
  }

  /** Open browser and ensure logged in (manual login on first run). */
  async login(): Promise<void> {
    const page = await this.auth.ensureLoggedIn();
    logger.info("Login flow done. You can close the browser or run publish.");
    // await new Promise((r) => setTimeout(r, 5000));
    // await this.browser.close();
  }

  /** Run publish from post.json: load post, select platform script (video/image_text/long_text), run steps with {{title}}/{{content}} from post. */
  async publishFromPost(postPath: string): Promise<{ success: boolean; message?: string }> {
    const post = await loadPostFromFile(postPath);
    const platformConfig = loadPlatformConfig(post.platform);
    const scripts = platformConfig.scripts;
    if (!scripts || scripts.length === 0) {
      return { success: false, message: "Platform has no scripts" };
    }
    const scriptId = post.scriptId ?? selectScriptId(post);
    const script = scripts.find((s) => s.id === scriptId) ?? scripts[0];
    if (!script.steps || script.steps.length === 0) {
      return { success: false, message: `Script "${script.id}" has no steps` };
    }
    const publishUrl = this.browser.getPublishUrl();
    const page = await this.auth.ensureLoggedIn();
    await page.goto(publishUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    const publishFlow = new PublishFlow(this.browser);
    return publishFlow.run(page, post, script.steps as RecordedStep[]);
  }

  /** Interactive recording: user clicks in browser, we capture element and record selector; type steps for inputs; saves to recorded-scripts/. If scriptPath is provided and has steps, append mode (wait for "start"); otherwise auto-start. */
  async record(scriptPath?: string): Promise<void> {
    const recordFlow = new RecordFlow(this.browser, this.auth);
    const resolvedPath = scriptPath ? path.resolve(scriptPath) : undefined;
    await recordFlow.run({
      modelProvider: this.config.modelProvider,
      scriptPath: resolvedPath,
    });
  }

  /** Replay a recorded script. For "file" steps set step.value to path. */
  async replay(scriptPath: string, scriptId?: string): Promise<void> {
    const replayFlow = new ReplayFlow(this.browser, this.auth);
    await replayFlow.run(scriptPath, scriptId);
  }

  async close(): Promise<void> {
    await this.browser.close();
  }
}
