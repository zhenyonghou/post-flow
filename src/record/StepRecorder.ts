import type { Page } from "playwright";
import type { RecordedStep } from "./types.js";
import type { ElementDescriptor } from "./selectorFromElement.js";
import { buildSelector } from "./selectorFromElement.js";
import type { ModelProviderConfig } from "../config.js";
import { recordStepFromElement } from "../llm/recordStepFromElement.js";
import { logger } from "../logger.js";
import { stripDataPfFromSelector } from "./clickRecorderScript.js";
import { type TerminalIO } from "./TerminalIO.js";

const RECORD_MARK = "data-pf";

/**
 * Handles a single click event: determines step kind (click/type/file),
 * resolves selector + desc via LLM or heuristic, resolves nth for duplicate matches,
 * and emits the final step via the onStep callback.
 */
export class StepRecorder {
  constructor(
    private page: Page,
    private modelProvider: ModelProviderConfig | undefined,
    private onStep: (step: RecordedStep) => void
  ) {}

  /** Returns "save" | "cancel" | "ok" depending on user action during step recording. */
  async handle(descriptor: ElementDescriptor, snapshot: string, io: TerminalIO): Promise<"save" | "cancel" | "ok"> {
    const tag = (descriptor.tagName || "").toLowerCase();
    const inputType = (descriptor.type || "").toLowerCase();
    const isFileInput = tag === "input" && inputType === "file";
    const hasDataPlaceholder = descriptor.dataAttrs?.["data-placeholder"] !== undefined;
    const isInputLike =
      !isFileInput &&
      (tag === "input" ||
        tag === "textarea" ||
        descriptor.role === "textbox" ||
        descriptor.contentEditable === true ||
        hasDataPlaceholder);

    if (isFileInput) {
      const { selector, desc } = await this.resolveSelectorAndDesc(descriptor, snapshot, "file");
      await this.pushStep({ kind: "file", selector, value: "{{file_path}}", desc }, snapshot);
      logger.info("[record] file —", selector.slice(0, 60), "value: {{file_path}}");
    } else if (isInputLike) {
      const value = "";
      const { selector, desc } = await this.resolveSelectorAndDesc(
        descriptor,
        snapshot,
        "type",
        value || undefined
      );
      await this.pushStep({ kind: "type", selector, value, desc }, snapshot);
      logger.info("[record] type —", desc.slice(0, 50), "(value empty)");
    } else {
      const { selector, desc } = await this.resolveSelectorAndDesc(descriptor, snapshot, "click");
      await this.pushStep({ kind: "click", selector, desc }, snapshot);
      logger.info("[record] click —", desc.slice(0, 50));
    }
    return "ok";
  }

  private async resolveSelectorAndDesc(
    descriptor: ElementDescriptor,
    snapshot: string,
    kind: "click" | "type" | "file",
    value?: string
  ): Promise<{ selector: string; desc: string }> {
    if (this.modelProvider?.apiKey) {
      const res = await recordStepFromElement(snapshot, descriptor, { kind, value }, this.modelProvider);
      if (res) {
        logger.info("[record] LLM —", res.selector.slice(0, 60), "|", res.desc);
        return { selector: res.selector, desc: res.desc };
      }
    }
    const selector = buildSelector(descriptor);
    const desc =
      kind === "file"
        ? descriptor.ariaLabel || descriptor.placeholder || "file"
        : kind === "type" && value
          ? descriptor.placeholder ||
            descriptor.ariaLabel ||
            descriptor.dataAttrs?.["data-placeholder"] ||
            "input"
          : descriptor.text?.slice(0, 30) || selector.slice(0, 40);
    return { selector, desc };
  }

  /** Strips recording-only attribute; uses snapshot (DOMParser) for nth when selector matches multiple. */
  private async pushStep(step: RecordedStep, snapshot: string): Promise<void> {
    const selector = stripDataPfFromSelector(step.selector);
    if (!selector) {
      logger.warn("[record] Empty selector after stripping data-pf, step skipped. Raw selector:", step.selector);
      return;
    }
    const stepToPush = { ...step, selector };

    const { count, index } = await this.page.evaluate(
      ({ html, sel, mark }) => {
        try {
          const doc = new DOMParser().parseFromString(html, "text/html");
          const all = doc.querySelectorAll(sel);
          const n = all.length;
          let idx = -1;
          for (let i = 0; i < n; i++) {
            if (all[i].hasAttribute(mark)) {
              idx = i;
              break;
            }
          }
          return { count: n, index: idx };
        } catch {
          return { count: 0, index: -1 };
        }
      },
      { html: snapshot, sel: selector, mark: RECORD_MARK }
    );

    if (count > 1) {
      if (index >= 0) {
        const nthOneBased = index + 1;
        this.onStep({ ...stepToPush, nth: nthOneBased });
        logger.info("[record] selector 匹配", count, "个元素，已自动确定为第", nthOneBased, "个（nth 1-based）");
      } else {
        logger.info(
          "[record] selector 匹配",
          count,
          "个元素，未找到点击标记（可能为非 CSS 选择器），已写入 nth=9999，请在脚本 JSON 中手动改为正确序号（1-based）"
        );
        this.onStep({ ...stepToPush, nth: 9999 });
      }
    } else {
      this.onStep(stepToPush);
    }
  }
}
