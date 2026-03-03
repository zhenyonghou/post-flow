import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { RecordedScript } from "./types.js";
import { logger } from "../logger.js";

export async function loadScriptFromFile(scriptPath: string): Promise<RecordedScript[]> {
  let raw: string;
  try {
    raw = await fs.readFile(scriptPath, "utf8");
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? (err as NodeJS.ErrnoException).code : "";
    if (code === "ENOENT") {
      const message = `Script file not found: ${scriptPath}. Create the file or omit scriptPath for new recording.`;
      logger.error("[record]", message);
      throw new Error(message);
    }
    throw err;
  }
  const trimmed = raw.trim();
  let data: RecordedScript | RecordedScript[] | null = null;
  if (trimmed === "") {
    data = { id: "default", steps: [] };
  } else {
    try {
      data = JSON.parse(raw) as RecordedScript | RecordedScript[];
    } catch {
      data = { id: "default", steps: [] };
    }
  }
  const scripts: RecordedScript[] = Array.isArray(data)
    ? data
    : data && typeof data.id === "string" && Array.isArray(data.steps)
      ? [data as RecordedScript]
      : [];
  if (scripts.length === 0) {
    const message = "Script file must contain a script object or array of scripts.";
    logger.error("[record]", message);
    throw new Error(message);
  }
  return scripts;
}

/**
 * Serialize and write scripts to disk.
 * - Single script → plain object; multiple → array.
 * - When `scripts` is empty (nothing recorded), falls back to `{ id: fallbackId, steps: [] }`.
 * - Creates parent directory if needed.
 */
export async function saveScripts(
  scripts: RecordedScript[],
  fallbackId: string,
  outPath: string
): Promise<void> {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const toSave =
    scripts.length > 0
      ? scripts.length === 1
        ? scripts[0]
        : scripts
      : { id: fallbackId, steps: [] };
  await fs.writeFile(outPath, JSON.stringify(toSave, null, 2), "utf8");
  logger.info("Saved scripts to", outPath);
}
