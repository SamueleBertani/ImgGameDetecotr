import getStroke from "perfect-freehand";
import type { Point } from "./canvas";

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface StrokeStyle {
  readonly size: number;
  readonly smoothing: number;
  readonly thinning: number;
  readonly streamline: number;
}

/** Convert points to an outline via perfect-freehand and fill it on the context. */
export function renderStroke(
  ctx: Ctx,
  points: ReadonlyArray<Readonly<Point>>,
  style: StrokeStyle,
): void {
  const outline = getStroke(
    points.map((p) => [p.x, p.y, p.pressure]),
    style,
  );

  if (outline.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(outline[0][0], outline[0][1]);

  for (let i = 1; i < outline.length - 1; i++) {
    const xc = (outline[i][0] + outline[i + 1][0]) / 2;
    const yc = (outline[i][1] + outline[i + 1][1]) / 2;
    ctx.quadraticCurveTo(outline[i][0], outline[i][1], xc, yc);
  }

  const last = outline[outline.length - 1];
  ctx.lineTo(last[0], last[1]);
  ctx.fill();
}
