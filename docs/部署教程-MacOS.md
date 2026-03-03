# post-flow 在 Mac 上的部署教程

面向 **使用 macOS、不熟悉命令行的用户**。按顺序执行即可。

---

## 一、安装 Node.js

1. 打开浏览器访问：**https://nodejs.org**
2. 下载 **LTS 版本**（建议 20 及以上），选择 macOS 安装包（.pkg）。
3. 双击安装，按提示完成安装。
4. 安装完成后**关闭并重新打开**「终端」（Terminal）。

---

## 二、安装项目依赖

1. 打开「终端」：按 **Command + 空格** 打开 Spotlight，输入 **终端** 或 **Terminal** 回车。
2. 进入 post-flow 项目目录。若项目在「下载」里，可输入（把路径改成你的实际位置）：
   ```bash
   cd ~/Downloads/post-flow
   ```
   也可以把 **post-flow 文件夹** 直接拖进终端窗口，终端会自动填入路径，再在前面加上 `cd ` 并回车。
3. 依次执行（每行输完按回车）：

```bash
npm install
npx playwright install chromium
npm run build
```

---

## 三、首次登录（必做一次）

1. 在 post-flow 目录下的终端里执行：

```bash
npx post-flow xiaohongshu login
```

（若已执行过 `npm link`，也可直接写：`post-flow xiaohongshu login`）

2. 会打开一个 Chrome 窗口，**在页面内手动登录你的小红书账号**，登录成功后关闭该窗口即可。之后发布会自动使用本次保存的登录态。

---

## 四、准备要发布的文章（post.json）

1. 打开 **`~/.post-flow`** 文件夹：
   - 在 Finder 中按 **Command + Shift + G**，输入 **`~/.post-flow`** 回车。
   - 若提示没有该文件夹，可先执行一次上面的 login 命令，或新建文件夹并命名为 `.post-flow`，放在你的用户目录下（`/Users/你的用户名/`）。
2. 在该文件夹内创建 **post.json**，示例：

```json
{
  "platform": "xiaohongshu",
  "scriptId": "long_text",
  "title": "你的笔记标题",
  "content": "你的笔记正文内容..."
}
```

- 图文笔记使用 `"scriptId": "image_text"`，并按需配置图片路径。
- 可用「文本编辑」或 VS Code 编辑，保存时编码选 **UTF-8**，文件名必须为 **post.json**。

---

## 五、发布

1. 打开终端，进入 **post-flow 目录**（用 `cd` 进入，或把文件夹拖进终端后加 `cd `）。
2. 执行：

```bash
npx post-flow publish
```

默认使用 `~/.post-flow/post.json`。若 post 文件在其他路径，可指定：

```bash
npx post-flow publish /Users/你的用户名/文档/post.json
```

3. 等待浏览器自动填写标题、正文并点击发布；如有验证或弹窗，在浏览器内按提示操作即可。

---

## 国内无法翻墙时的解决办法

若你在中国大陆且**不能翻墙**，按下面做可正常完成安装。

### 1. 安装 Node.js

- 若 **https://nodejs.org** 打不开或很慢，可改用国内镜像下载：
  - **https://npmmirror.com/mirrors/node/** — 选最新 LTS 版本，再选 macOS 的 .pkg 安装包（根据芯片选 Intel 或 ARM64）。

### 2. npm 使用国内镜像（必做）

在终端执行一次（以后所有 npm 安装都会走国内源）：

```bash
npm config set registry https://registry.npmmirror.com
```

然后再在 post-flow 目录执行 `npm install`，速度会快很多。

### 3. Playwright 安装 Chromium 使用国内镜像

默认从国外下载 Chromium 容易失败或很慢。先设置环境变量，再安装浏览器（两条命令在**同一终端窗口、紧挨着**执行）：

```bash
export PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright
npx playwright install chromium
```

安装完成后，后续使用本工具**不需要翻墙**（发布小红书走国内网络）。

---

## 常见问题

| 情况 | 处理 |
|------|------|
| 提示「未找到 post.json」 | 确认 `~/.post-flow/post.json` 存在（Finder 按 Cmd+Shift+G 输入 `~/.post-flow` 查看），且文件名、扩展名正确。 |
| 发布页未登录 | 再执行一次 `npx post-flow xiaohongshu login`，在打开的浏览器内重新登录。 |
| 提示缺少 Chromium | 在 post-flow 目录执行：`npx playwright install chromium`。国内用户请先按上文「国内无法翻墙时的解决办法」设置镜像后再执行。 |
| 国内安装依赖/Chromium 慢或失败 | 按上文「国内无法翻墙时的解决办法」配置 npm 镜像和 Playwright 镜像后重试。 |

---

## 步骤小结

1. 安装 Node.js（LTS），并重启终端。
2. 进入 post-flow 目录，执行 `npm install`、`npx playwright install chromium`、`npm run build`。
3. 执行 `npx post-flow xiaohongshu login`，在浏览器内完成小红书登录。
4. 在 `~/.post-flow/` 下准备好 **post.json**（标题、正文、platform、scriptId）。
5. 在 post-flow 目录执行 `npx post-flow publish` 进行发布。
