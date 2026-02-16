import getStroke from "perfect-freehand";
import { drawStroke } from "./utils";

interface Point {
  x: number;
  y: number;
  pressure: number;
}

interface Stroke {
  points: Point[];
  size: number;
}

export class DrawingCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private committed: OffscreenCanvas;
  private committedCtx: OffscreenCanvasRenderingContext2D;
  private strokes: Stroke[] = [];
  private currentPoints: Point[] = [];
  private drawing = false;
  private _strokeSize = 10;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.committed = new OffscreenCanvas(canvas.width || 1, canvas.height || 1);
    this.committedCtx = this.committed.getContext("2d")!;

    this.setupResize();
    this.setupEvents();
  }

  set strokeSize(size: number) {
    this._strokeSize = size;
  }

  clear(): void {
    this.strokes = [];
    this.currentPoints = [];
    this.rebakeCommitted();
    this.redraw();
  }

  private setupResize(): void {
    const resize = () => {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.ctx.scale(dpr, dpr);
      this.rebakeCommitted();
      this.redraw();
    };

    new ResizeObserver(resize).observe(this.canvas);
    resize();
  }

  private setupEvents(): void {
    this.canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    this.canvas.addEventListener("pointermove", (e) => this.onPointerMove(e));
    this.canvas.addEventListener("pointerup", () => this.onPointerUp());
    this.canvas.addEventListener("pointerleave", () => this.onPointerUp());
    this.canvas.addEventListener("pointercancel", () => this.onPointerUp());
  }

  private getPoint(e: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure,
    };
  }

  private onPointerDown(e: PointerEvent): void {
    this.drawing = true;
    this.currentPoints = [this.getPoint(e)];
    this.canvas.setPointerCapture(e.pointerId);
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.drawing) return;
    this.currentPoints.push(this.getPoint(e));
    this.redraw();
  }

  private onPointerUp(): void {
    if (!this.drawing) return;
    this.drawing = false;

    if (this.currentPoints.length > 0) {
      const stroke: Stroke = {
        points: [...this.currentPoints],
        size: this._strokeSize,
      };
      this.strokes.push(stroke);
      this.bakeStroke(stroke);
      this.currentPoints = [];
    }

    this.redraw();
  }

  private bakeStroke(stroke: Stroke): void {
    this.committedCtx.fillStyle = "#ffffff";
    const outlinePoints = getStroke(
      stroke.points.map((p) => [p.x, p.y, p.pressure]),
      { size: stroke.size, smoothing: 0.5, thinning: 0.5, streamline: 0.5 },
    );
    drawStroke(this.committedCtx, outlinePoints);
  }

  private rebakeCommitted(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.committed.width = rect.width * dpr;
    this.committed.height = rect.height * dpr;
    this.committedCtx.scale(dpr, dpr);
    this.committedCtx.fillStyle = "#ffffff";

    for (const stroke of this.strokes) {
      const outlinePoints = getStroke(
        stroke.points.map((p) => [p.x, p.y, p.pressure]),
        { size: stroke.size, smoothing: 0.5, thinning: 0.5, streamline: 0.5 },
      );
      drawStroke(this.committedCtx, outlinePoints);
    }
  }

  private redraw(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.drawImage(this.committed, 0, 0);
    this.ctx.restore();

    if (this.currentPoints.length > 0) {
      this.ctx.fillStyle = "#ffffff";
      const outlinePoints = getStroke(
        this.currentPoints.map((p) => [p.x, p.y, p.pressure]),
        {
          size: this._strokeSize,
          smoothing: 0.5,
          thinning: 0.5,
          streamline: 0.5,
        },
      );
      drawStroke(this.ctx, outlinePoints);
    }
  }
}
