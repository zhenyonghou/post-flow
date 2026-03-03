import path from "node:path";
import fs from "node:fs";
import type { AppHumanConfig } from "./browser-human/config.js";

const DEFAULT_BASE_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || ".",
  ".post-flow"
);

/** Config dir for app.json, post.json, post-replay.json (~/.post-flow). */
const CONFIG_DIR = DEFAULT_BASE_DIR;
/** Platform scripts (e.g. xiaohongshu.json) live under project root scripts/. */
const SCRIPTS_DIR = path.join(process.cwd(), "scripts");

/** Returns the config directory ($HOME/.post-flow) where app.json, post.json, post-replay.json live. */
export function getConfigDir(): string {
  return CONFIG_DIR;
}

function expandTilde(dir: string): string {
  if (dir.startsWith("~" + path.sep) || dir === "~") {
    return path.join(process.env.HOME || process.env.USERPROFILE || "~", dir.slice(1));
  }
  return dir;
}

function isMinMaxObj(v: unknown): v is { min: number; max: number } {
  return typeof v === "object" && v !== null && "min" in v && "max" in v && typeof (v as { min: unknown }).min === "number" && typeof (v as { max: unknown }).max === "number";
}

/** Parse browserHuman from JSON (camelCase only). */
function parseBrowserHuman(raw: unknown): AppHumanConfig {
  const o = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const out: AppHumanConfig = {};
  if (isMinMaxObj(o.delayRange)) out.delayRange = o.delayRange;
  if (isMinMaxObj(o.typingDelayRange)) out.typingDelayRange = o.typingDelayRange;
  if (isMinMaxObj(o.stepDelayRange)) out.stepDelayRange = o.stepDelayRange;
  if (typeof o.longPauseChance === "number") out.longPauseChance = o.longPauseChance;
  if (isMinMaxObj(o.longPauseRange)) out.longPauseRange = o.longPauseRange;
  if (isMinMaxObj(o.moveDelayRange)) out.moveDelayRange = o.moveDelayRange;
  if (typeof o.bezierSteps === "number") out.bezierSteps = o.bezierSteps;
  if (typeof o.jitterMaxPx === "number") out.jitterMaxPx = o.jitterMaxPx;
  if (isMinMaxObj(o.hoverDelayRange)) out.hoverDelayRange = o.hoverDelayRange;
  return out;
}

/** Optional model provider config (for record command only). */
export interface ModelProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** Global app config (from ~/.post-flow/app.json). No publishUrl. */
export interface AppConfig {
  userDataDir: string;
  viewport: { width: number; height: number };
  /** 拟人行为与反检测参数，见 browser-human。 */
  browserHuman?: AppHumanConfig;
  /** Browser channel: "chrome" | "chromium" | "msedge". Prefer "chrome" for real-user fingerprint. */
  browserChannel?: "chrome" | "chromium" | "msedge";
  /** If set, attach to existing Chrome via CDP instead of launching. E.g. "http://127.0.0.1:9222". Chrome must be started with --remote-debugging-port=9222. */
  cdpEndpoint?: string;
  /** Optional; only used by record command. */
  modelProvider?: ModelProviderConfig;
}

/** Platform-specific config (from scripts/<platform>.json). */
export interface PlatformConfig {
  publishUrl: string;
  /** Optional. Selector to detect logged-in state (e.g. user avatar). Fallback used if omitted. */
  loggedInSelector?: string;
  scripts?: Array<{ id: string; title?: string; steps: unknown[] }>;
}

/** Merged config used by BrowserService (app + platform). */
export interface PostFlowConfig extends AppConfig {
  publishUrl: string;
  loggedInSelector?: string;
}

export function ensureUserDataDir(userDataDir: string): void {
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
}

/** Default CDP endpoint when using attach mode (Chrome started with --remote-debugging-port=9222). */
export const DEFAULT_CDP_ENDPOINT = "http://127.0.0.1:9222";

/** Load global config from ~/.post-flow/app.json (camelCase only). */
export function loadAppConfig(): AppConfig {
  const p = path.join(CONFIG_DIR, "app.json");
  const base: AppConfig = {
    userDataDir: process.env.POST_FLOW_USER_DATA_DIR || DEFAULT_BASE_DIR,
    viewport: { width: 1280, height: 800 },
    cdpEndpoint: DEFAULT_CDP_ENDPOINT,
  };
  if (!fs.existsSync(p)) return base;
  try {
    const raw = fs.readFileSync(p, "utf8");
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (data.viewport && typeof data.viewport === "object" && "width" in data.viewport && "height" in data.viewport) {
      base.viewport = data.viewport as AppConfig["viewport"];
    }
    if (data.browserHuman != null && typeof data.browserHuman === "object") {
      base.browserHuman = parseBrowserHuman(data.browserHuman);
    }
    const channel = data.browserChannel;
    if (channel === "chrome" || channel === "chromium" || channel === "msedge") base.browserChannel = channel;
    if (data.cdpEndpoint !== undefined) {
      base.cdpEndpoint = typeof data.cdpEndpoint === "string" && data.cdpEndpoint.trim() ? data.cdpEndpoint.trim() : undefined;
    }
    if (typeof data.userDataDir === "string") base.userDataDir = expandTilde(data.userDataDir);
    if (data.modelProvider && typeof data.modelProvider === "object") {
      const mp = data.modelProvider as Record<string, unknown>;
      if (typeof mp.baseUrl === "string" && typeof mp.apiKey === "string" && typeof mp.model === "string") {
        base.modelProvider = { baseUrl: mp.baseUrl, apiKey: mp.apiKey, model: mp.model };
      }
    }
  } catch {
    // use base defaults
  }
  return base;
}

/** Load platform config from scripts/<platform>.json. */
export function loadPlatformConfig(platform: string): PlatformConfig {
  const p = path.join(SCRIPTS_DIR, `${platform}.json`);
  if (!fs.existsSync(p)) {
    throw new Error(`Platform config not found: ${p}`);
  }
  const raw = fs.readFileSync(p, "utf8");
  const data = JSON.parse(raw) as Record<string, unknown>;
  const publishUrl = data.publishUrl;
  if (typeof publishUrl !== "string") {
    throw new Error(`Platform config must have publishUrl: ${p}`);
  }
  const loggedInSelector =
    typeof data.loggedInSelector === "string" && data.loggedInSelector.trim()
      ? data.loggedInSelector.trim()
      : undefined;
  return {
    publishUrl,
    loggedInSelector,
    scripts: Array.isArray(data.scripts) ? (data.scripts as PlatformConfig["scripts"]) : undefined,
  };
}

/** Load merged config for a platform (app.json + platform json). Uses base userDataDir + /<platform>-browser-data. */
export function loadConfig(platform: string): PostFlowConfig {
  const app = loadAppConfig();
  const platformConfig = loadPlatformConfig(platform);
  const baseDir = expandTilde(app.userDataDir);
  return {
    ...app,
    userDataDir: path.join(baseDir, platform + "-browser-data"),
    publishUrl: platformConfig.publishUrl,
    loggedInSelector: platformConfig.loggedInSelector,
  };
}

/** Resolve platform browser-data dir (same path as used by loadConfig). */
export function getPlatformBrowserDataDir(platform: string): string {
  const app = loadAppConfig();
  const base = expandTilde(app.userDataDir);
  return path.join(base, platform + "-browser-data");
}
