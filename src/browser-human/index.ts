/**
 * browser-human：拟人化浏览器行为与反检测能力。
 * 供各平台（如小红书、抖音等）复用，不包含具体业务逻辑。
 *
 * 使用方式示例：
 * - 启动时：launch 配置 channel、args，创建 context 后调用 addAntiDetectToContext(context)
 * - 回放时：创建 HumanLike(config)，用 stepDelay() 做步间延迟，用 humanClick(page, human, box, currentPos) 做拟人点击
 */

export { addAntiDetectToContext } from "./antiDetect.js";
export { getBezierPath } from "./bezier.js";
export { RandomDelay, StepDelayStrategy } from "./delays.js";
export { HumanLike } from "./HumanLike.js";
export { humanClick } from "./HumanMouse.js";
export { buildHumanLikeConfig } from "./config.js";
export type { AppHumanConfig } from "./config.js";
export type {
  Box,
  DelayRange,
  HumanLikeConfig,
  MouseConfig,
  Point,
  StepDelayConfig,
} from "./types.js";
