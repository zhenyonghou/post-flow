import * as readline from "node:readline";
import { logger } from "../logger.js";

export const SAVE_SENTINEL = "__POST_FLOW_SAVE__";
export const CANCEL_SENTINEL = "__POST_FLOW_CANCEL__";

function createActionResolver(): {
  nextAction: () => Promise<string>;
  resolveWith: (value: string) => void;
} {
  let resolveAction: (v: string) => void;
  let actionPromise = new Promise<string>((r) => {
    resolveAction = r;
  });
  return {
    nextAction: () => actionPromise,
    resolveWith: (value: string) => {
      if (resolveAction) {
        resolveAction(value);
        actionPromise = new Promise<string>((r) => {
          resolveAction = r;
        });
      }
    },
  };
}

/**
 * Wraps readline and exposes a clean async API for the recording loop.
 * Single listener: every line is dispatched in one place to avoid duplicate handling and races.
 * - `askLine`: prompts for a value; s/c intercept to sentinel strings.
 * - `nextAction`: resolves when s/c is typed (save/cancel action channel).
 * - `waitForRawLine`: one-shot raw line read (used by append-mode start loop).
 */
export class TerminalIO {
  private rl!: readline.Interface;
  private pendingLineResolve: ((s: string) => void) | null = null;
  private rawLineWaiters: Array<(s: string) => void> = [];
  private resolver = createActionResolver();

  open(): void {
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    this.rl.on("line", (line) => {
      const t = (line ?? "").trim();
      const v = t.toLowerCase();

      if (this.rawLineWaiters.length > 0) {
        this.rawLineWaiters.shift()!(t);
        return;
      }
      if (v === "s" || v === "end") {
        this.resolver.resolveWith("s");
        if (this.pendingLineResolve) {
          this.pendingLineResolve(SAVE_SENTINEL);
          this.pendingLineResolve = null;
        }
        return;
      }
      if (v === "c" || v === "cancel") {
        this.resolver.resolveWith("c");
        if (this.pendingLineResolve) {
          this.pendingLineResolve(CANCEL_SENTINEL);
          this.pendingLineResolve = null;
        }
        return;
      }
      if (this.pendingLineResolve) {
        this.pendingLineResolve(t);
        this.pendingLineResolve = null;
      }
    });
  }

  close(): void {
    this.rl.close();
  }

  prompt(): void {
    process.stdout.write("> ");
  }

  askLine(prompt: string): Promise<string> {
    return new Promise((r) => {
      this.pendingLineResolve = r;
      logger.info(prompt.trim());
      process.stdout.write("> ");
    });
  }

  /** One-shot raw line read; dispatched by the single line listener. Used by append-mode start loop. */
  waitForRawLine(): Promise<string> {
    return new Promise<string>((r) => {
      this.rawLineWaiters.push(r);
    });
  }

  nextAction(): Promise<string> {
    return this.resolver.nextAction();
  }
}
