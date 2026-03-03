/**
 * 配置与行为相关的类型定义，供 browser-human 各模块使用。
 * 各平台可复用同一套配置结构，通过 app.json 等调整参数。
 */

/** 区间配置：最小/最大毫秒数 */
export interface DelayRange {
  min: number;
  max: number;
}

/** 步间延迟：每执行完一步（如点击、输入）后的等待时间 */
export interface StepDelayConfig {
  /** 常规步间延迟范围（ms） */
  stepDelayRange: DelayRange;
  /** 触发长停顿的概率，0~1，例如 0.08 表示约 8% 的步骤后多等一会 */
  longPauseChance: number;
  /** 长停顿的时长范围（ms） */
  longPauseRange: DelayRange;
}

/** 鼠标轨迹与点击相关配置 */
export interface MouseConfig {
  /** 轨迹上每移动一小步的延迟范围（ms），越小移动越快 */
  moveDelayRange: DelayRange;
  /** 贝塞尔曲线采样点数，越大轨迹越平滑 */
  bezierSteps: number;
  /** 点击目标点的随机偏移最大像素，避免每次都点几何中心 */
  jitterMaxPx: number;
  /** 移动到目标后、点击前的悬停时间（ms），模拟人先 hover 再点 */
  hoverDelayRange: DelayRange;
}

/** 拟人行为完整配置：延迟 + 鼠标 */
export interface HumanLikeConfig {
  /** 通用随机延迟（如录制时的操作间隔） */
  delayRange: DelayRange;
  /** 按键之间的延迟 */
  typingDelayRange: DelayRange;
  /** 步间延迟与偶发长停顿 */
  stepDelay: StepDelayConfig;
  /** 鼠标移动与点击 */
  mouse: MouseConfig;
}

/** 二维点，用于鼠标坐标、轨迹点 */
export interface Point {
  x: number;
  y: number;
}

/** 元素包围盒（与 Playwright 的 BoundingBox 兼容） */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
