import "./style.css";
import { DrawingCanvas } from "./canvas";
import { exportAsImage } from "./utils";

function qs<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el;
}

const canvasEl = qs<HTMLCanvasElement>("#drawing-canvas");
const btnClear = qs<HTMLButtonElement>("#btn-clear");
const btnExport = qs<HTMLButtonElement>("#btn-export");
const strokeSize = qs<HTMLInputElement>("#stroke-size");

const drawingCanvas = new DrawingCanvas(canvasEl);

btnClear.addEventListener("click", () => drawingCanvas.clear());
btnExport.addEventListener("click", () => exportAsImage(canvasEl));
strokeSize.addEventListener("input", () => {
  drawingCanvas.strokeSize = Number(strokeSize.value);
});
