# post-flow

**[English](../README.md)**

多平台自动发帖工具：支持**小红书**、**抖音**等创作者中心，基于 Playwright 持久化浏览器 + 拟人操作。

## 自动化原理

先**录制脚本**（在浏览器里操作一遍，工具记录点击、输入、上传等步骤），发帖时**执行脚本**即可自动完成发布。要增加支持的平台或发帖类型时，只需先录制对应脚本（建议用 AI 辅助录制以生成稳定 selector 与描述）；录制完成后，日常发布**运行时无需再消耗 token**。

## 功能

### 平台与内容类型支持

<table>
<thead><tr><th>平台</th><th>内容类型</th></tr></thead>
<tbody>
<tr><td rowspan="3">小红书</td><td>长文字 ✅</td></tr>
<tr><td>图文 ✅</td></tr>
<tr><td>视频 ❌</td></tr>
<tr><td rowspan="3">抖音</td><td>视频 ✅</td></tr>
<tr><td>图文 ❌</td></tr>
<tr><td>文章 ❌</td></tr>
</tbody>
</table>

### 通用能力

- **持久化浏览器**：使用 `userDataDir` 保存登录态，首次需人工登录，之后自动带 cookie
- **登录检查**：打开发布页后检测是否已登录，未登录则等待用户在浏览器内手动登录
- **发布流程**：按录制脚本执行（填标题、正文、上传图片/视频、点击发布等）
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
npx post-flow xiaohongshu login    # 小红书首次登录
npx post-flow douyin login        # 抖音首次登录
npx post-flow publish             # 发布（默认 ~/.post-flow/post.json，按 post 内 platform 选平台）
npx post-flow publish /path/to/post.json

# 方式二：链接到全局后，任意目录都可直接用 post-flow
npm run build && npm link
post-flow xiaohongshu login
post-flow douyin login
post-flow publish
```

仍可使用 npm 脚本（会调用同一 CLI）：
- `npm run login` → 等同于 `post-flow xiaohongshu login`
- `npm run publish` → 等同于 `post-flow publish`
- `npm run post-flow -- <参数...>` → 任意子命令，如 `npm run post-flow -- douyin replay ./recorded-scripts/douyin-video.json`

## 配置

### 两种启动方式

1. **Attach：连接已打开的 Chrome（推荐，默认且更不易被检测）**  
   不配置 `cdpEndpoint` 时默认即使用此方式（默认地址 `http://127.0.0.1:9222`）。也可在 `~/.post-flow/app.json` 中显式设置，例如：
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
   再运行 `post-flow xiaohongshu login`、`post-flow douyin login` 或 `post-flow publish ...`。若已有标签页打开对应平台发布页，会自动复用该标签，不会新建。

2. **由 Playwright 启动浏览器**  
   在 `~/.post-flow/app.json` 中将 `cdpEndpoint` 设为空字符串 `""` 时，改为使用 `launchPersistentContext` 启动 Chrome，数据目录为 `userDataDir/<platform>-browser-data`。
