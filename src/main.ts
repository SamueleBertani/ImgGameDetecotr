import "./style.css";
import { DrawingCanvas } from "./canvas";
import { exportAsImage } from "./utils";

const canvasEl = document.querySelector<HTMLCanvasElement>("#drawing-canvas")!;
const btnClear = document.querySelector<HTMLButtonElement>("#btn-clear")!;
const btnExport = document.querySelector<HTMLButtonElement>("#btn-export")!;
const strokeSize = document.querySelector<HTMLInputElement>("#stroke-size")!;

const drawingCanvas = new DrawingCanvas(canvasEl);

btnClear.addEventListener("click", () => drawingCanvas.clear());
btnExport.addEventListener("click", () => exportAsImage(canvasEl));
strokeSize.addEventListener("input", () => {
  drawingCanvas.strokeSize = Number(strokeSize.value);
});
