#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";
import { App } from "./App.js";
import { loadConfig, getConfigDir, getPlatformBrowserDataDir } from "./config.js";
import { loadPostFromFile } from "./publish/postInput.js";
import { logger } from "./logger.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0] ?? "help";
  const platform = args[1];
  const rest = args.slice(2);

  if (cmd !== "help" && cmd !== "login" && cmd !== "record" && cmd !== "replay" && cmd !== "publish" && cmd !== "delete-browser-data") {
    logger.info("Usage: post-flow <cmd> [platform] ... | post-flow publish <post.json>");
    return;
  }

  if (cmd !== "help" && cmd !== "publish" && cmd !== "delete-browser-data" && !platform) {
    logger.error("Platform required. Example: post-flow xiaohongshu login");
    process.exit(1);
  }

  let app: InstanceType<typeof App> | null = null;

  try {
    if (cmd === "help") {
      logger.info("Usage: post-flow <cmd> [platform] ...");
      logger.info("  post-flow <platform> login | record [scriptPath] | replay <scriptPath> [scriptId]");
      logger.info("  post-flow publish <post.json>");
      logger.info("  post-flow delete-browser-data <platform>");
      logger.info("  platform: e.g. xiaohongshu (config from scripts/<platform>.json)");
      logger.info("  record: scriptPath optional; if provided and script has steps, append mode (type 'start' to begin), else auto-start");
      return;
    }

    if (cmd === "delete-browser-data") {
      if (!platform) {
        logger.error("Usage: post-flow delete-browser-data <platform>");
        process.exit(1);
      }
      const dir = getPlatformBrowserDataDir(platform);
      if (!fs.existsSync(dir)) {
        logger.info("No browser-data found for", platform, "at", dir);
        return;
      }
      fs.rmSync(dir, { recursive: true });
      logger.info("Removed browser-data for", platform, ":", dir);
      return;
    }

    if (cmd === "publish") {
      const postPathRaw = platform || rest[0];
      const postPath = postPathRaw ? path.resolve(postPathRaw) : path.join(getConfigDir(), "post.json");
      if (!fs.existsSync(postPath)) {
        if (!postPathRaw) {
          logger.error("Usage: post-flow publish <post.json>");
          logger.error("Default post.json not found at", postPath);
        } else {
          logger.error("Post file not found:", postPath);
        }
        process.exit(1);
      }
      const post = await loadPostFromFile(postPath);
      const config = loadConfig(post.platform);
      app = new App(config);
      const result = await app.publishFromPost(postPath);
      await app.close();
      if (!result.success) {
        logger.error("Publish failed:", result.message);
        process.exit(1);
      }
      logger.info("Publish succeeded.");
      return;
    }

    const config = loadConfig(platform!);
    app = new App(config);

    if (cmd === "login") {
      await app.login();
      await app.close();
      return;
    }
    if (cmd === "record") {
      const scriptPath = rest[0];
      await app.record(scriptPath);
      await app.close();
      return;
    }
    if (cmd === "replay") {
      const scriptPath = rest[0];
      const scriptId = rest[1];
      if (!scriptPath) {
        logger.error("Usage: post-flow <platform> replay <scriptPath> [scriptId]");
        process.exit(1);
      }
      await app.replay(path.resolve(scriptPath), scriptId);
      await app.close();
      return;
    }
  } finally {
    if (app) {
      await app.close();
    }
  }
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
