/**
 * 拟人化鼠标：先沿贝塞尔轨迹移动再点击，并维护逻辑上的“当前鼠标位置”。
 * 依赖 Playwright Page 与 HumanLike 的路径与延迟策略。
 */

import type { Page } from "playwright";
import type { HumanLike } from "./HumanLike.js";
import type { Box, Point } from "./types.js";

/**
 * 在页面上执行“从当前逻辑位置移动到目标区域中心（加抖动）并点击”，
 * 然后更新逻辑位置为点击目标。
 *
 * @param page - Playwright 页面
 * @param human - 拟人行为实例（路径、延迟、随机偏移）
 * @param box - 目标元素包围盒（如 locator.boundingBox()）
 * @param currentPos - 当前逻辑鼠标位置；若为 null 则用视口中心作为起点
 * @returns 新的逻辑鼠标位置（即本次点击的目标点）
 */
export async function humanClick(
  page: Page,
  human: HumanLike,
  box: Box,
  currentPos: Point | null
): Promise<Point> {
  const center: Point = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
  const jitter = human.randomOffset();
  const target: Point = {
    x: center.x + jitter.x,
    y: center.y + jitter.y,
  };

  let from: Point;
  if (currentPos !== null) {
    from = currentPos;
  } else {
    const vp = page.viewportSize();
    if (vp) {
      from = { x: vp.width / 2, y: vp.height / 2 };
    } else {
      from = target;
    }
  }

  const path = human.getMovementPath(from, target);
  for (const p of path) {
    await page.mouse.move(p.x, p.y);
    await human.moveDelay();
  }
  // 到达目标后先悬停一段时间（随机几百 ms），再点击，模拟真人行为
  await human.hoverDelay();
  await page.mouse.click(target.x, target.y);
  return target;
}
