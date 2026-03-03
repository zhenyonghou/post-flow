# browser-human

拟人化浏览器行为与反检测能力，供各平台（如小红书、抖音等）复用。

## 目录结构

- **types.ts** — 配置与坐标等类型（DelayRange、HumanLikeConfig、Point、Box 等）
- **antiDetect.ts** — 反检测脚本：注入 `navigator.webdriver`、`window.chrome` 等，通过 `addAntiDetectToContext(context)` 注册到 Playwright 的 BrowserContext
- **bezier.ts** — 二次贝塞尔轨迹生成，用于鼠标从 A 到 B 的拟人移动路径
- **delays.ts** — 延迟策略：步间延迟（StepDelayStrategy）、通用随机延迟（RandomDelay）
- **config.ts** — 从应用配置（AppHumanConfig）构建 HumanLikeConfig，补全默认值
- **HumanLike.ts** — 拟人行为聚合：randomDelay、typingDelay、stepDelay、moveDelay、getMovementPath、randomOffset
- **HumanMouse.ts** — `humanClick(page, human, box, currentPos)`：沿贝塞尔路径移动后点击，返回新逻辑位置
- **index.ts** — 统一导出

## 使用方式

- **启动浏览器**：创建 context 后调用 `addAntiDetectToContext(context)`；启动参数中 `channel` 建议用 `"chrome"` 以接近真实用户指纹。
- **回放**：用 `buildHumanLikeConfig(appConfig)` 得到配置，创建 `HumanLike`；步与步之间调用 `human.stepDelay()`；需要点击时先取元素 `boundingBox()`，再调用 `humanClick(page, human, box, currentMousePosition)` 并更新逻辑鼠标位置。

## 配置项（app.json 等）

可通过 `step_delay_range`、`long_pause_chance`、`long_pause_range`、`move_delay_range`、`bezier_steps`、`jitter_max_px`、`browser_channel` 等调整；未配置时使用 config 中的默认值。
