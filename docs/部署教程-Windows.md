# post-flow 在 Windows 上的部署教程

面向 **使用 Windows、不熟悉命令行的用户**。按顺序执行即可。

---

## 一、安装 Node.js

1. 打开浏览器访问：**https://nodejs.org**
2. 下载 **LTS 版本**（建议 20 及以上），选择 Windows 安装包（.msi）。
3. 双击安装，一路「下一步」，如有 **“Add to PATH”** 请勾选。
4. 安装完成后**关闭并重新打开**「命令提示符」或「PowerShell」。

---

## 二、安装项目依赖

1. 在资源管理器中进入 **post-flow 项目文件夹**（例如 `D:\post-flow`）。
2. 在地址栏输入 **`cmd`** 回车，会在当前目录打开命令行。
3. 依次执行（每行输完按回车）：

```bash
npm install
npx playwright install chromium
npm run build
```

---

## 三、首次登录（必做一次）

1. 在 post-flow 目录下的命令行执行：

```bash
npx post-flow xiaohongshu login
```

（若已执行过 `npm link`，也可直接写：`post-flow xiaohongshu login`）

2. 会打开一个 Chrome 窗口，**在页面内手动登录你的小红书账号**，登录成功后关闭该窗口即可。之后发布会自动使用本次保存的登录态。

---

## 四、准备要发布的文章（post.json）

1. 打开文件夹：**`C:\Users\你的用户名\.post-flow`**（将「你的用户名」换成当前 Windows 登录名）。若无该文件夹，可先执行一次上面的 login 命令或手动新建。
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
- 可用「记事本」编辑，保存时编码选 **UTF-8**，文件名必须为 **post.json**。

---

## 五、发布

1. 在 **post-flow 文件夹** 内打开命令行（地址栏输入 `cmd` 回车）。
2. 执行：

```bash
npx post-flow publish
```

默认使用 `C:\Users\你的用户名\.post-flow\post.json`。若 post 文件在其他路径，可指定：

```bash
npx post-flow publish D:\我的文章\post.json
```

3. 等待浏览器自动填写标题、正文并点击发布；如有验证或弹窗，在浏览器内按提示操作即可。

---

## 国内无法翻墙时的解决办法

若你在中国大陆且**不能翻墙**，按下面做可正常完成安装。

### 1. 安装 Node.js

- 若 **https://nodejs.org** 打不开或很慢，可改用国内镜像下载（任选其一）：
  - **https://npmmirror.com/mirrors/node/** — 选最新 LTS 版本，再选 Windows 的 .msi 安装包。
  - 或搜索「Node.js 国内下载」，从可信站点下载 LTS 的 Windows 安装包。

### 2. npm 使用国内镜像（必做）

在命令行执行一次（以后所有 npm 安装都会走国内源）：

```bash
npm config set registry https://registry.npmmirror.com
```

然后再在 post-flow 目录执行 `npm install`，速度会快很多。

### 3. Playwright 安装 Chromium 使用国内镜像

默认从国外下载 Chromium 容易失败或很慢。先让本次命令行使用国内镜像，再安装浏览器：

**在「命令提示符」里：**

```bash
set PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright
npx playwright install chromium
```

**在 PowerShell 里：**

```powershell
$env:PLAYWRIGHT_DOWNLOAD_HOST="https://npmmirror.com/mirrors/playwright"
npx playwright install chromium
```

上面两条命令要在**同一个窗口、紧挨着**执行：先设置环境变量，再执行安装。安装完成后，后续使用本工具**不需要翻墙**（发布小红书走国内网络）。

---

## 常见问题

| 情况 | 处理 |
|------|------|
| 提示「未找到 post.json」 | 确认 `C:\Users\你的用户名\.post-flow\post.json` 存在，且文件名、扩展名正确。 |
| 发布页未登录 | 再执行一次 `npx post-flow xiaohongshu login`，在打开的浏览器内重新登录。 |
| 提示缺少 Chromium | 在 post-flow 目录执行：`npx playwright install chromium`。国内用户请先按上文「国内无法翻墙时的解决办法」设置镜像后再执行。 |
| 国内安装依赖/Chromium 慢或失败 | 按上文「国内无法翻墙时的解决办法」配置 npm 镜像和 Playwright 镜像后重试。 |

---

## 步骤小结

1. 安装 Node.js（LTS），并重启命令行。
2. 进入 post-flow 目录，执行 `npm install`、`npx playwright install chromium`、`npm run build`。
3. 执行 `npx post-flow xiaohongshu login`，在浏览器内完成小红书登录。
4. 在 `C:\Users\你的用户名\.post-flow\` 下准备好 **post.json**（标题、正文、platform、scriptId）。
5. 在 post-flow 目录执行 `npx post-flow publish` 进行发布。
