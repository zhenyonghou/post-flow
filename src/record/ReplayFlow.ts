import type { Page } from "playwright";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { BrowserService } from "../browser/BrowserService.js";
import { AuthService } from "../auth/AuthService.js";
import { loadPostFromFile } from "../publish/postInput.js";
import type { ResolvedPost } from "../publish/postInput.js";
import { resolveStepValue } from "../publish/postInput.js";
import { logger } from "../logger.js";
import type { Point } from "../browser-human/types.js";
import { getConfigDir } from "../config.js";
import {
  createFileChooserState,
  runSteps,
  type StepRunnerContext,
} from "./stepRunner.js";
import type { RecordedScript } from "./types.js";

/** 回放时使用的帖子配置路径（{{title}}/{{content}}/{{image_paths}} 由此替换） */
const POST_REPLAY_PATH = path.join(getConfigDir(), "post-replay.json");

/**
 * Replay a recorded script: load script file, open publish page, 统一步骤执行器执行 steps。
 * 步骤执行逻辑在 stepRunner 中，此处只负责加载脚本、启动页面、组装 context。
 */
export class ReplayFlow {
  /** 逻辑上的当前鼠标位置，用于拟人轨迹的起点 */
  private currentMousePosition: Point | null = null;

  constructor(
    private browser: BrowserService,
    private auth: AuthService
  ) {}

  /** Load scripts from JSON file. Supports single object { id, steps } or array [{ id, steps }, ...]. */
  async loadScript(scriptPath: string): Promise<RecordedScript[]> {
    const raw = await fs.readFile(scriptPath, "utf8");
    const data = JSON.parse(raw);
    const scripts: RecordedScript[] = Array.isArray(data)
      ? data
      : data && typeof data.id === "string" && Array.isArray(data.steps)
        ? [data as RecordedScript]
        : [];
    if (scripts.length === 0) {
      throw new Error("Script file must contain a script object or array of scripts.");
    }
    return scripts;
  }

  /**
   * Replay one script. If scriptId is given, use that script; otherwise use the first.
   * Step 中的 {{title}}/{{content}}/{{image_paths}} 从 ~/.post-flow/post-replay.json 替换。
   */
  async run(scriptPath: string, scriptId?: string): Promise<void> {
    const scripts = await this.loadScript(scriptPath);
    const script = scriptId
      ? scripts.find((s) => s.id === scriptId) ?? scripts[0]
      : scripts[0];
    if (scriptId && !scripts.find((s) => s.id === scriptId)) {
      logger.info("Script id not found, using first script:", script.id);
    }

    let post: ResolvedPost | null = null;
    try {
      post = await loadPostFromFile(POST_REPLAY_PATH);
      logger.info("Replay post loaded from", POST_REPLAY_PATH);
    } catch {
      logger.warn("post-replay.json not found or invalid, step value will use script literal.");
    }

    await this.browser.launch();
    const page = await this.auth.ensureLoggedIn();
    await page.goto(this.browser.getPublishUrl(), { waitUntil: "domcontentloaded", timeout: 30000 });

    const fileChooser = createFileChooserState();
    page.on("filechooser", async (fileChooserEvent) => {
      const paths = fileChooser.getPendingFilePaths();
      if (paths != null) {
        await fileChooserEvent.setFiles(paths);
        fileChooser.resolveFileChooser();
      }
    });

    const human = this.browser.getHuman();
    logger.info("Replaying script:", script.id, "steps:", script.steps.length);

    const context: StepRunnerContext = {
      human,
      resolveStepValue: (step) =>
        post ? resolveStepValue(step.value, post) : (step.value ?? ""),
      fileChooser,
      getMousePos: () => this.currentMousePosition,
      setMousePos: (p) => {
        this.currentMousePosition = p;
      },
    };

    try {
      await runSteps(page, script.steps, context);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("Replay step failed:", msg);
      throw err;
    }

    logger.info("Replay finished.");
  }
}
