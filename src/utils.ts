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
