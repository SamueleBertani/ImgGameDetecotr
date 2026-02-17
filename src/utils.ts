/** Convert perfect-freehand stroke points to a Canvas2D path. */
export function drawStroke(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  points: number[][],
): void {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);

  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i][0] + points[i + 1][0]) / 2;
    const yc = (points[i][1] + points[i + 1][1]) / 2;
    ctx.quadraticCurveTo(points[i][0], points[i][1], xc, yc);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last[0], last[1]);
  ctx.fill();
}

/** Format a model label for display (replace underscores and dashes with spaces). */
export function formatLabel(label: string): string {
  return label.replace(/_/g, " ").replace(/-/g, " ");
}

/** Export the canvas content as a PNG download. */
export function exportAsImage(canvas: HTMLCanvasElement): void {
  const link = document.createElement("a");
  link.download = "sketch.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}
