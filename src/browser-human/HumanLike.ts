/**
 * 拟人行为聚合：延迟、轨迹、随机偏移等。
 * 不直接依赖 Page，只提供参数与路径；与页面交互由 HumanMouse 完成。
 */

import { getBezierPath } from "./bezier.js";
import { RandomDelay } from "./delays.js";
import { StepDelayStrategy } from "./delays.js";
import type { HumanLikeConfig, Point } from "./types.js";

export class HumanLike {
  private readonly randomDelayImpl: RandomDelay;
  private readonly typingDelayImpl: RandomDelay;
  private readonly moveDelayImpl: RandomDelay;
  private readonly hoverDelayImpl: RandomDelay;
  private readonly stepDelayImpl: StepDelayStrategy;

  constructor(private config: HumanLikeConfig) {
    this.randomDelayImpl = new RandomDelay(config.delayRange);
    this.typingDelayImpl = new RandomDelay(config.typingDelayRange);
    this.moveDelayImpl = new RandomDelay(config.mouse.moveDelayRange);
    this.hoverDelayImpl = new RandomDelay(config.mouse.hoverDelayRange);
    this.stepDelayImpl = new StepDelayStrategy(config.stepDelay);
  }

  /** 通用随机延迟（如录制时操作间隔） */
  async randomDelay(): Promise<void> {
    await this.randomDelayImpl.delay();
  }

  /** 按键之间的延迟，用于模拟打字节奏 */
  async typingDelay(): Promise<void> {
    await this.typingDelayImpl.delay();
  }

  /**
   * 步间延迟：每执行完一步（点击、输入等）后调用。
   * 内部会按配置概率触发长停顿，使节奏更接近真人。
   */
  async stepDelay(): Promise<void> {
    await this.stepDelayImpl.delay();
  }

  /** 轨迹上每移动一小步的延迟 */
  async moveDelay(): Promise<void> {
    await this.moveDelayImpl.delay();
  }

  /**
   * 移动到目标后的悬停延迟（点击前），模拟人先 hover 几百 ms 再点。
   */
  async hoverDelay(): Promise<void> {
    await this.hoverDelayImpl.delay();
  }

  /**
   * 从 from 到 to 的贝塞尔路径点序列（含首尾）。
   * 用于在页面上按路径移动鼠标。
   */
  getMovementPath(from: Point, to: Point): Point[] {
    return getBezierPath(from, to, this.config.mouse.bezierSteps);
  }

  /**
   * 在目标点上加随机偏移，避免每次都点几何中心。
   * @param maxPx - 各方向最大偏移像素，默认使用配置中的 jitterMaxPx
   */
  randomOffset(maxPx?: number): Point {
    const cap = maxPx ?? this.config.mouse.jitterMaxPx;
    return {
      x: (Math.random() - 0.5) * 2 * cap,
      y: (Math.random() - 0.5) * 2 * cap,
    };
  }

  /** 获取当前鼠标配置（供 HumanMouse 等使用） */
  getMouseConfig() {
    return this.config.mouse;
  }
}
