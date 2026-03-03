import * as path from "node:path";
import type { RecordedScript, RecordedStep } from "./types.js";
import type { ElementDescriptor } from "./selectorFromElement.js";
import type { BrowserService } from "../browser/BrowserService.js";
import type { AuthService } from "../auth/AuthService.js";
import type { ModelProviderConfig } from "../config.js";
import { logger } from "../logger.js";
import { INJECT_CLICK_RECORDER } from "./clickRecorderScript.js";
import { TerminalIO } from "./TerminalIO.js";
import { loadScriptFromFile, saveScripts } from "./ScriptStore.js";
import { StepRecorder } from "./StepRecorder.js";

export interface RecordRunOptions {
  /** Optional model provider (from app.json model_provider); only record command uses it. */
  modelProvider?: ModelProviderConfig;
  /** Path to existing script file for append mode. If set, load script before recording and save to this path. */
  scriptPath?: string;
}

/** One click event: descriptor from serialize() + HTML snapshot at click time (for nth + LLM). */
export interface ClickQueueItem {
  descriptor: ElementDescriptor;
  snapshot: string;
}

export class RecordFlow {
  private scripts: RecordedScript[] = [];
  private currentScript: RecordedStep[] = [];
  private currentScriptId: string = "default";
  private clickQueue: ClickQueueItem[] = [];
  private clickWaiters: Array<(item: ClickQueueItem) => void> = [];

  constructor(
    private browser: BrowserService,
    private auth: AuthService
  ) {}

  private waitForNextClick(): Promise<ClickQueueItem> {
    if (this.clickQueue.length > 0) {
      return Promise.resolve(this.clickQueue.shift()!);
    }
    return new Promise((resolve) => {
      this.clickWaiters.push(resolve);
    });
  }

  private finishCurrentScript(): void {
    if (this.currentScript.length > 0) {
      this.scripts.push({ id: this.currentScriptId, steps: [...this.currentScript] });
      this.currentScript = [];
    }
  }

  async run(options?: RecordRunOptions): Promise<void> {
    const { modelProvider, scriptPath } = options ?? {};
    let autoStart = true;

    if (modelProvider) {
      logger.info("Record: model_provider from config (baseUrl/model available for optional LLM features).");
    }

    if (scriptPath) {
      const loaded = await loadScriptFromFile(scriptPath);
      const last = loaded[loaded.length - 1];
      this.scripts = loaded.length > 1 ? loaded.slice(0, -1) : [];
      this.currentScriptId = last.id;
      this.currentScript = [...last.steps];
      autoStart = last.steps.length === 0;
      logger.info("Loaded script for append:", scriptPath, "|", last.steps.length, "steps in", last.id);
    }

    await this.browser.launch();
    const publishUrl = this.browser.getPublishUrl();
    const page = await this.auth.ensureLoggedIn();
    // No extra goto: ensureLoggedIn already loaded publishUrl; a second goto can trigger reload/redirect and wipe injected script/bindings.

    const io = new TerminalIO();
    io.open();

    page.exposeFunction("__recordClick__", (d: unknown, snapshot: string) => {
      if (d == null || typeof d !== "object") {
        logger.warn("[record] Ignored click: no descriptor");
        return;
      }
      const raw = d as Record<string, unknown>;
      const tagName = (raw.tagName ?? raw.TagName ?? "div") as string;
      const descriptor: ElementDescriptor = { ...raw, tagName: String(tagName) } as ElementDescriptor;
      const item: ClickQueueItem = { descriptor, snapshot: typeof snapshot === "string" ? snapshot : "" };
      if (this.clickWaiters.length > 0) {
        this.clickWaiters.shift()!(item);
      } else {
        this.clickQueue.push(item);
      }
    });
    page.exposeFunction("__recordPageRendered__", () => {
      page.evaluate(INJECT_CLICK_RECORDER).catch(() => {});
    });
    if (autoStart) {
      await page.evaluate(INJECT_CLICK_RECORDER);
    }

    const recorder = new StepRecorder(page, modelProvider, (step) => this.currentScript.push(step));

    let saved = false;

    if (scriptPath && !autoStart) {
      const result = await this.waitForAppendStart(io, publishUrl);
      if (result !== "start") {
        saved = result === "save";
        io.close();
        this.finishCurrentScript();
        if (saved) {
          await saveScripts(this.scripts, this.currentScriptId, scriptPath);
        }
        return;
      }
      await page.evaluate(INJECT_CLICK_RECORDER);
      this.clickQueue = [];
    }

    logger.info("Recording started. Page opened:", publishUrl);
    logger.info(
      "Terminal: click on page to record. For input: type value + Enter (or Enter for click only). File inputs record as {{file_path}}. s = save, c = cancel."
    );
    io.prompt();

    for (;;) {
      let exitLoop = false;
      try {
        const result = await Promise.race([
          this.waitForNextClick().then((item) => ({ type: "click" as const, item })),
          io.nextAction().then((v) => ({ type: "line" as const, value: v })),
        ]);

        if (result.type === "line") {
          const v = result.value.toLowerCase();
          if (v === "c" || v === "cancel") {
            logger.info("Recording cancelled (not saved).");
            break;
          }
          if (v === "s" || v === "end") {
            saved = true;
            break;
          }
          continue;
        }

        logger.info("[record] 正在处理点击（可能调用 LLM），请稍候…");
        const outcome = await recorder.handle(result.item.descriptor, result.item.snapshot, io);
        if (outcome === "save") {
          saved = true;
          exitLoop = true;
        } else if (outcome === "cancel") {
          logger.info("Recording cancelled (not saved).");
          exitLoop = true;
        }
        if (!exitLoop) {
          while (this.clickQueue.length > 0) {
            const next = this.clickQueue.shift()!;
            logger.info("[record] 正在处理点击（可能调用 LLM），请稍候…");
            const nextOutcome = await recorder.handle(next.descriptor, next.snapshot, io);
            if (nextOutcome === "save") {
              saved = true;
              exitLoop = true;
              break;
            }
            if (nextOutcome === "cancel") {
              logger.info("Recording cancelled (not saved).");
              exitLoop = true;
              break;
            }
          }
        }
      } catch (err) {
        logger.error("Record step error:", err);
      }
      if (exitLoop) break;
      logger.info("[next] Click page to record, or in terminal: s + Enter = save, c + Enter = cancel.");
      io.prompt();
    }

    io.close();
    this.finishCurrentScript();
    if (saved) {
      const outPath = scriptPath ?? path.join(process.cwd(), "recorded-scripts", `record-${Date.now()}.json`);
      await saveScripts(this.scripts, this.currentScriptId, outPath);
    }
  }

  /** Waits for the user to type start/r/s/c in append mode before recording begins. */
  private async waitForAppendStart(io: TerminalIO, publishUrl: string): Promise<"start" | "save" | "cancel"> {
    logger.info("Append mode. Page opened:", publishUrl);
    logger.info("Type 'start' or 'r' + Enter to begin recording. s = save and exit, c = cancel.");
    io.prompt();

    for (;;) {
      const line = await io.waitForRawLine();
      const v = line.toLowerCase();
      if (v === "s" || v === "end") return "save";
      if (v === "c" || v === "cancel") {
        logger.info("Recording cancelled (not saved).");
        return "cancel";
      }
      if (v === "start" || v === "r") return "start";
      logger.info("Type 'start' or 'r' to begin, s = save, c = cancel.");
      io.prompt();
    }
  }
}
