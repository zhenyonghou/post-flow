# post-flow

**[简体中文](docs/README.zh-CN.md)**

📹 **Demo:** Xiaohongshu & Douyin posting demos — search Douyin for **mumuhou001**.

Multi-platform auto-posting: **Xiaohongshu** (小红书), **Douyin** (抖音), and more creator centers, powered by Playwright with a persistent browser and human-like actions.

## How it works

**Record a script** first (perform the publish flow once in the browser; the tool records clicks, typing, file uploads, etc.). When posting, **run the script** to automate the flow. To support a new platform or post type, record a new script (AI-assisted recording is recommended for stable selectors and step descriptions). After that, **runtime does not consume any tokens.**

## Features

### Platform & content type support

<table>
<thead><tr><th>Platform</th><th>Content type</th></tr></thead>
<tbody>
<tr><td rowspan="3">Xiaohongshu</td><td>Long-form text ✅</td></tr>
<tr><td>Image + text ✅</td></tr>
<tr><td>Video ❌</td></tr>
<tr><td rowspan="3">Douyin</td><td>Video ✅</td></tr>
<tr><td>Image + text ❌</td></tr>
<tr><td>Article ❌</td></tr>
</tbody>
</table>

### General capabilities

- **Persistent browser**: Uses `userDataDir` for login state; sign in once in the browser, then reuse cookies automatically.
- **Login check**: After opening the publish page, detects login status and waits for manual login if needed.
- **Publish flow**: Runs recorded steps (title, body, upload images/video, click publish, etc.).
- **Anti-detection**: Non-headless, random delays, character-by-character typing, random mouse movement, semantic selectors.

## Install

```bash
cd post-flow
pnpm install
npx playwright install chromium
```

## Usage

Build once: `npm run build` (or `pnpm build`). Then use the **`post-flow`** CLI:

```bash
# Option 1: npx from project directory (no global install)
npx post-flow xiaohongshu login    # Xiaohongshu first-time login
npx post-flow douyin login         # Douyin first-time login
npx post-flow publish              # Publish (default ~/.post-flow/post.json; platform from post file)
npx post-flow publish /path/to/post.json

# Option 2: link globally, then use post-flow from anywhere
npm run build && npm link
post-flow xiaohongshu login
post-flow douyin login
post-flow publish
```

You can also use npm scripts (same CLI):
- `npm run login` → same as `post-flow xiaohongshu login`
- `npm run publish` → same as `post-flow publish`
- `npm run post-flow -- <args>` → e.g. `npm run post-flow -- douyin replay ./recorded-scripts/douyin-video.json`

## Config

### Two launch modes

1. **Attach to existing Chrome (recommended, default; less detectable)**  
   This is the default when `cdpEndpoint` is not overridden (default address `http://127.0.0.1:9222`). You can set it explicitly in `~/.post-flow/app.json`:
   ```json
   "cdpEndpoint": "http://127.0.0.1:9222"
   ```
   Start Chrome with remote debugging (use a userDataDir consistent with your config):
   ```bash
   # macOS
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9222 \
     --user-data-dir="$HOME/.post-flow/browser-data"

   # Windows
   chrome.exe --remote-debugging-port=9222 --user-data-dir=C:\chrome-profile
   ```
   Then run `post-flow xiaohongshu login`, `post-flow douyin login`, or `post-flow publish ...`. If a tab with the platform's publish page is already open, it will be reused.

2. **Launch browser via Playwright**  
   Set `cdpEndpoint` to an empty string `""` in `~/.post-flow/app.json` to use `launchPersistentContext` instead; data directory will be `userDataDir/<platform>-browser-data`.
