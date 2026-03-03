/**
 * 统一步骤执行器：从 ReplayFlow 提取，供 Replay 与 Publish 共用。
 * 拟人点击、scrollIntoViewIfNeeded、file 步骤、步间延迟均由此模块执行。
 */

import type { Page } from "playwright";
import * as path from "node:path";
import type { HumanLike } from "../browser-human/HumanLike.js";
import { humanClick } from "../browser-human/HumanMouse.js";
import type { Point } from "../browser-human/types.js";
import { logger } from "../logger.js";
import type { RecordedStep } from "./types.js";

/**
 * 文件选择器状态：stepRunner 在 file 步骤中 setFilePaths、触发点击、await waitForFileChooserDone()；
 * 调用方在 page.on("filechooser") 里 getPendingFilePaths、setFiles、resolveFileChooser()。
 */
export interface FileChooserState {
  setFilePaths(paths: string[]): void;
  getPendingFilePaths(): string[] | null;
  resolveFileChooser(): void;
  waitForFileChooserDone(): Promise<void>;
}

export function createFileChooserState(): FileChooserState {
  let pending: string[] | null = null;
  let resolve: (() => void) | null = null;
  let promise = new Promise<void>((r) => {
    resolve = r;
  });
  return {
    setFilePaths(paths: string[]) {
      pending = paths;
      promise = new Promise<void>((r) => {
        resolve = r;
      });
    },
    getPendingFilePaths() {
      return pending;
    },
    resolveFileChooser() {
      pending = null;
      if (resolve) {
        resolve();
        resolve = null;
      }
    },
    waitForFileChooserDone() {
      return Promise.race([
        promise,
        new Promise<void>((_, rej) =>
          setTimeout(() => rej(new Error("filechooser did not fire within 10s")), 10000)
        ),
      ]);
    },
  };
}

/**
 * 执行上下文：由 Replay 或 Publish 注入。type/file 的 value 通过 resolveStepValue(step) 得到。
 */
export interface StepRunnerContext {
  human: HumanLike;
  resolveStepValue: (step: RecordedStep) => string;
  fileChooser: FileChooserState | null;
  getMousePos: () => Point | null;
  setMousePos: (p: Point) => void;
}

/**
 * 拟人点击：waitFor → scrollIntoViewIfNeeded → boundingBox → humanClick 或 fallback click。
 * 从 ReplayFlow 原样提取。
 */
export async function clickSelector(
  page: Page,
  selector: string,
  context: StepRunnerContext,
  options: { timeoutMs?: number; nth?: number } = {}
): Promise<void> {
  const { human, getMousePos, setMousePos } = context;
  const timeoutMs = options.timeoutMs ?? 5000;
  const nth = options.nth;

  const loc = page.locator(selector);
  const singleTimeout = Math.max(3000, Math.min(timeoutMs, 8000));
  const useNth = nth != null && nth !== 9999 && nth >= 1 ? nth - 1 : undefined;

  const tryOne = async (one: ReturnType<Page["locator"]>) => {
    await one.waitFor({ state: "visible", timeout: singleTimeout });
    await one.scrollIntoViewIfNeeded();
    const box = await one.boundingBox();
    if (box) {
      const next = await humanClick(page, human, box, getMousePos());
      setMousePos(next);
      return;
    }
    await one.click({ timeout: singleTimeout });
  };

  if (useNth !== undefined) {
    await tryOne(loc.nth(useNth));
    return;
  }
  const count = await loc.count();
  if (count > 1) {
    logger.warn("通过selector查询到的元素非唯一", selector, count);
  }
  let lastErr: Error | null = null;
  for (let i = 0; i < count; i++) {
    try {
      await tryOne(loc.nth(i));
      return;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      continue;
    }
  }
  throw lastErr ?? new Error(`No clickable match for selector: ${selector}`);
}

/**
 * 执行单步：file / click / type / wait / branch，逻辑与 ReplayFlow.runStep 一致。
 */
export async function runStep(
  page: Page,
  step: RecordedStep,
  context: StepRunnerContext
): Promise<void> {
  const { human, resolveStepValue, fileChooser } = context;

  switch (step.kind) {
    case "file": {
      if (!fileChooser) {
        logger.warn("Step runner: file step ignored (no fileChooser in context).");
        break;
      }
      const raw = resolveStepValue(step).trim();
      if (!raw || raw === "{{file_path}}") {
        logger.warn("File step: set step.value to paths or {{image_paths}}.");
        break;
      }
      const paths = raw
        .split(/\s*,\s*/)
        .map((p) => path.resolve(p.trim()))
        .filter(Boolean);
      const fileNthZeroBased =
        step.nth != null && step.nth !== 9999 && step.nth >= 1 ? step.nth - 1 : null;
      const fileLoc =
        fileNthZeroBased != null
          ? page.locator(step.selector).nth(fileNthZeroBased)
          : page.locator(step.selector).first();
      await fileLoc.waitFor({ state: "attached", timeout: 10000 });
      fileChooser.setFilePaths(paths);
      await fileLoc.evaluate((el: HTMLInputElement) => el.click());
      await fileChooser.waitForFileChooserDone();
      logger.info("Step file:", paths.length, paths);
      break;
    }
    case "click": {
      await clickSelector(page, step.selector, context, { timeoutMs: 5000, nth: step.nth });
      logger.info("Step click:", step.desc ?? step.selector);
      break;
    }
    case "type": {
      await clickSelector(page, step.selector, context, { timeoutMs: 5000, nth: step.nth });
      await human.typingDelay();
      const value = resolveStepValue(step);
      for (const char of value) {
        await page.keyboard.type(char, { delay: 0 });
        await human.typingDelay();
      }
      logger.info("Step type:", step.desc ?? step.selector);
      break;
    }
    case "wait": {
      const ms = step.value ? parseInt(step.value, 10) : 1000;
      if (Number.isFinite(ms) && ms > 0) await new Promise((r) => setTimeout(r, ms));
      logger.info("Step wait:", ms, "ms");
      break;
    }
    case "branch":
      logger.info("Step skip branch:", step.selector);
      break;
    default:
      logger.warn("Unknown step kind, skip:", (step as RecordedStep).kind);
  }
}

/**
 * 顺序执行 steps：步间 human.stepDelay()，任一步失败则抛出。
 */
export async function runSteps(
  page: Page,
  steps: RecordedStep[],
  context: StepRunnerContext
): Promise<void> {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    await context.human.stepDelay();
    await runStep(page, step, context);
  }
}
