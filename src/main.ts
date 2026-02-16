import "./style.css";
import { DrawingCanvas } from "./canvas";
import { exportAsImage } from "./utils";
import { loadModel, predict, isModelLoaded, type Prediction } from "./recognizer";

function qs<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el;
}

const canvasEl = qs<HTMLCanvasElement>("#drawing-canvas");
const btnClear = qs<HTMLButtonElement>("#btn-clear");
const btnExport = qs<HTMLButtonElement>("#btn-export");
const strokeSize = qs<HTMLInputElement>("#stroke-size");
const modelStatus = qs<HTMLParagraphElement>("#model-status");
const predictionList = qs<HTMLUListElement>("#prediction-list");

const drawingCanvas = new DrawingCanvas(canvasEl);

btnClear.addEventListener("click", () => {
  drawingCanvas.clear();
  clearPredictions();
});
btnExport.addEventListener("click", () => exportAsImage(canvasEl));
strokeSize.addEventListener("input", () => {
  drawingCanvas.strokeSize = Number(strokeSize.value);
});

// --- Inference ---

let inferPending = false;
let debounceTimer = 0;

drawingCanvas.onStrokeEnd = () => {
  clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(runInference, 300);
};

async function runInference(): Promise<void> {
  if (!isModelLoaded() || inferPending) return;
  inferPending = true;

  try {
    const results = await predict(canvasEl);
    renderPredictions(results);
  } finally {
    inferPending = false;
  }
}

function renderPredictions(predictions: Prediction[]): void {
  predictionList.innerHTML = "";
  predictionList.classList.remove("hidden");

  for (const p of predictions) {
    const pct = (p.probability * 100).toFixed(1);
    const li = document.createElement("li");
    li.className = "flex items-center gap-2 text-sm";
    li.innerHTML = `
      <span class="w-24 truncate text-gray-200">${formatLabel(p.label)}</span>
      <div class="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-700">
        <div class="absolute inset-y-0 left-0 rounded-full bg-indigo-500" style="width:${pct}%"></div>
      </div>
      <span class="w-12 text-right tabular-nums text-gray-400">${pct}%</span>
    `;
    predictionList.appendChild(li);
  }
}

function clearPredictions(): void {
  predictionList.innerHTML = "";
  predictionList.classList.add("hidden");
}

function formatLabel(label: string): string {
  return label.replace(/_/g, " ").replace(/-/g, " ");
}

// --- Model loading ---

loadModel()
  .then(() => {
    modelStatus.textContent = "Model ready";
    modelStatus.classList.replace("text-gray-400", "text-green-400");
    setTimeout(() => modelStatus.classList.add("hidden"), 2000);
  })
  .catch(() => {
    modelStatus.textContent = "Model failed to load";
    modelStatus.classList.replace("text-gray-400", "text-red-400");
  });
