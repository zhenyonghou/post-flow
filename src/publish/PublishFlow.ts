import type { Page } from "playwright";
import type { BrowserService } from "../browser/BrowserService.js";
import type { RecordedStep } from "../record/types.js";
import { createFileChooserState, runSteps, type StepRunnerContext } from "../record/stepRunner.js";
import type { ResolvedPost } from "./postInput.js";
import { resolveStepValue } from "./postInput.js";
import type { Point } from "../browser-human/types.js";
import { logger } from "../logger.js";

/**
 * 正式发帖流程：与 Replay 共用 stepRunner，仅上下文不同。
 * 从 post.json 读取帖子，平台脚本 steps 中的 {{title}}/{{content}}/{{image_paths}} 由 post 替换后执行。
 */
export class PublishFlow {
  private currentMousePosition: Point | null = null;

  constructor(private browser: BrowserService) {}

  async run(page: Page, post: ResolvedPost, steps: RecordedStep[]): Promise<{ success: boolean; message?: string }> {
    const fileChooser = createFileChooserState();
    page.on("filechooser", async (fileChooserEvent) => {
      const paths = fileChooser.getPendingFilePaths();
      if (paths != null) {
        await fileChooserEvent.setFiles(paths);
        fileChooser.resolveFileChooser();
      }
    });

    const human = this.browser.getHuman();
    const context: StepRunnerContext = {
      human,
      resolveStepValue: (step) => resolveStepValue(step.value, post),
      fileChooser,
      getMousePos: () => this.currentMousePosition,
      setMousePos: (p) => {
        this.currentMousePosition = p;
      },
    };

    try {
      await runSteps(page, steps, context);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("Publish step failed:", msg);
      return { success: false, message: msg };
    }
  }
}
