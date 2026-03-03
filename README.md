# post-flow

自动将文章发布到小红书（创作者中心），基于 Playwright 的持久化浏览器 + 拟人操作。

## 功能

- **持久化浏览器**：使用 `userDataDir` 保存登录态，首次需人工登录，之后自动带 cookie
- **登录检查**：打开发布页后检测是否已登录，未登录则等待用户在浏览器内手动登录
- **发布流程**：填写标题、正文、上传图片、点击发布，并检测成功/失败提示
- **防风控**：非 headless、随机延迟、逐字打字、随机鼠标移动，语义化 selector

## 安装

```bash
cd post-flow
pnpm install
npx playwright install chromium
```

## 使用

先构建一次：`npm run build`（或 `pnpm build`）。之后可直接用 **`post-flow`** 命令（无需再写 `npm run xxx`）：

```bash
# 方式一：在项目目录下用 npx（无需全局安装）
npx post-flow xiaohongshu login    # 首次登录
npx post-flow publish             # 发布（默认 ~/.post-flow/post.json）
npx post-flow publish /path/to/post.json

# 方式二：链接到全局后，任意目录都可直接用 post-flow
npm run build && npm link
post-flow xiaohongshu login
post-flow publish
```

仍可使用 npm 脚本（会调用同一 CLI）：
- `npm run login` → 等同于 `post-flow xiaohongshu login`
- `npm run publish` → 等同于 `post-flow publish`
- `npm run post-flow -- <参数...>` → 任意子命令，如 `npm run post-flow -- xiaohongshu replay ./script.json`

## 配置

### 两种启动方式

1. **由 Playwright 启动浏览器**  
   不配置 `cdpEndpoint` 时，会使用 `launchPersistentContext` 启动 Chrome，数据目录为 `userDataDir/<platform>-browser-data`。

2. **Attach：连接已打开的 Chrome（更不易被检测,推荐）**  
   在 `~/.post-flow/app.json` 中设置 `cdpEndpoint`，例如：
   ```json
   "cdpEndpoint": "http://127.0.0.1:9222"
   ```
   先手动用调试端口启动 Chrome（使用与配置一致的 userDataDir）：
   ```bash
   # macOS
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9222 \
     --user-data-dir="$HOME/.post-flow/browser-data"

   # windows
   chrome.exe --remote-debugging-port=9222 --user-data-dir=C:\chrome-profile
   ```
   再运行 `post-flow xiaohongshu login` 或 `post-flow publish ...`。若已有标签页打开小红书发布页，会自动复用该标签，不会新建。
