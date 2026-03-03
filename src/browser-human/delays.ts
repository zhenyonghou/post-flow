/**
 * 延迟策略：步间延迟、长停顿、移动步长延迟等。
 * 封装随机延迟逻辑，便于统一调参与测试。
 */

import type { DelayRange, StepDelayConfig } from "./types.js";

/**
 * 在给定区间 [min, max] 内随机一个整数毫秒数并等待。
 */
function randomDelayInRange(range: DelayRange): Promise<void> {
  const ms = range.min + Math.random() * (range.max - range.min);
  return new Promise((r) => setTimeout(r, Math.round(ms)));
}

/**
 * 步间延迟策略：常规延迟 + 按概率触发长停顿。
 * 用于每执行完一步操作（点击、输入等）后的等待，使节奏更接近真人（偶尔会多停一会）。
 */
export class StepDelayStrategy {
  constructor(private config: StepDelayConfig) {}

  /**
   * 执行一次步间延迟：先按 stepDelayRange 等待，再按 longPauseChance 决定是否额外长停顿。
   */
  async delay(): Promise<void> {
    await randomDelayInRange(this.config.stepDelayRange);
    if (Math.random() < this.config.longPauseChance) {
      await randomDelayInRange(this.config.longPauseRange);
    }
  }
}

/**
 * 通用随机延迟：在给定区间内等概率取毫秒数并等待。
 * 用于按键间隔、轨迹上每步移动的间隔等。
 */
export class RandomDelay {
  constructor(private range: DelayRange) {}

  async delay(): Promise<void> {
    await randomDelayInRange(this.range);
  }

  /** 返回当前区间内随机毫秒数（不等待），便于外部与其它逻辑组合 */
  sampleMs(): number {
    return Math.round(
      this.range.min + Math.random() * (this.range.max - this.range.min)
    );
  }
}
