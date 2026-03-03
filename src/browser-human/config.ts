/**
 * 从应用配置（如 post-flow 的 AppConfig）构建 HumanLikeConfig。
 * 未提供的项使用默认值，便于各平台只覆盖需要的字段。
 */

import type { HumanLikeConfig } from "./types.js";

/** 应用侧可提供的配置（与 AppConfig 中与 human 相关的字段对应） */
export interface AppHumanConfig {
  delayRange?: { min: number; max: number };
  typingDelayRange?: { min: number; max: number };
  stepDelayRange?: { min: number; max: number };
  longPauseChance?: number;
  longPauseRange?: { min: number; max: number };
  moveDelayRange?: { min: number; max: number };
  bezierSteps?: number;
  jitterMaxPx?: number;
  /** 点击前悬停时长（ms），模拟人先 hover 再点 */
  hoverDelayRange?: { min: number; max: number };
}

const DEFAULT_STEP_DELAY = { min: 800, max: 3000 };
const DEFAULT_LONG_PAUSE = { min: 800, max: 1000 };
const DEFAULT_MOVE_DELAY = { min: 8, max: 20 };
/** 点击前悬停：约 200~500ms 随机，模拟人先看再点 */
const DEFAULT_HOVER_DELAY = { min: 100, max: 300 };

/**
 * 构建完整的 HumanLikeConfig，缺失项用默认值。
 */
export function buildHumanLikeConfig(app: AppHumanConfig): HumanLikeConfig {
  const delayRange = app.delayRange ?? { min: 300, max: 800 };
  const typingDelayRange = app.typingDelayRange ?? { min: 80, max: 180 };
  const stepDelayRange = app.stepDelayRange ?? DEFAULT_STEP_DELAY;
  const longPauseChance = app.longPauseChance ?? 0.08;
  const longPauseRange = app.longPauseRange ?? DEFAULT_LONG_PAUSE;
  const moveDelayRange = app.moveDelayRange ?? DEFAULT_MOVE_DELAY;
  const bezierSteps = app.bezierSteps ?? 20;
  const jitterMaxPx = app.jitterMaxPx ?? 8;
  const hoverDelayRange = app.hoverDelayRange ?? DEFAULT_HOVER_DELAY;

  return {
    delayRange,
    typingDelayRange,
    stepDelay: {
      stepDelayRange,
      longPauseChance,
      longPauseRange,
    },
    mouse: {
      moveDelayRange,
      bezierSteps,
      jitterMaxPx,
      hoverDelayRange,
    },
  };
}
