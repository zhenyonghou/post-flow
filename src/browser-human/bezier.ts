/**
 * 贝塞尔曲线路径生成，用于模拟人类鼠标移动轨迹。
 * 使用二次贝塞尔曲线，在起点与终点之间取一个控制点，使轨迹呈自然弧线而非直线。
 */

import type { Point } from "./types.js";

/**
 * 二次贝塞尔曲线：B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2，t ∈ [0, 1]
 *
 * @param t - 参数，0 为起点，1 为终点
 * @param p0 - 起点
 * @param p1 - 控制点
 * @param p2 - 终点
 */
function quadraticBezier(t: number, p0: Point, p1: Point, p2: Point): Point {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  return {
    x: uu * p0.x + 2 * u * t * p1.x + tt * p2.x,
    y: uu * p0.y + 2 * u * t * p1.y + tt * p2.y,
  };
}

/**
 * 在起点 from 与终点 to 之间生成一条弯曲的路径点序列。
 * 控制点取两点中点的垂直偏移，使轨迹有一定弧度，更接近真人移动。
 *
 * @param from - 起点坐标
 * @param to - 终点坐标
 * @param steps - 采样点数（不含起点，含终点），建议 15~25
 * @returns 从 from 到 to 的路径点数组（含首尾）
 */
export function getBezierPath(from: Point, to: Point, steps: number = 20): Point[] {
  const mid: Point = {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
  };
  // 垂直方向随机偏移，使曲线向左或向右弯曲
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;
  const offset = (Math.random() - 0.5) * 2 * Math.min(len * 0.3, 80);
  const control: Point = {
    x: mid.x + perpX * offset,
    y: mid.y + perpY * offset,
  };

  const points: Point[] = [from];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    points.push(quadraticBezier(t, from, control, to));
  }
  points.push(to);
  return points;
}
