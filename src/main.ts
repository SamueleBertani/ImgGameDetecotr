import "./style.css";
import { DrawingCanvas } from "./canvas";
import { exportAsImage } from "./utils";
import { loadModel, predict, isModelLoaded, getPreprocessedImage, type Prediction } from "./recognizer";
import { loadDistances, isDistancesLoaded, getWeightedScore, getDistance } from "./semantics";

function qs<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el;
}

const canvasEl = qs<HTMLCanvasElement>("#drawing-canvas");
const btnClear = qs<HTMLButtonElement>("#btn-clear");
const btnExport = qs<HTMLButtonElement>("#btn-export");
const modelStatus = qs<HTMLParagraphElement>("#model-status");
const predictionList = qs<HTMLUListElement>("#prediction-list");
const debugPreview = qs<HTMLDivElement>("#debug-preview");
const debugCanvas = qs<HTMLCanvasElement>("#debug-canvas");
const scoreDisplay = qs<HTMLDivElement>("#score-display");
const scoreBar = qs<HTMLDivElement>("#score-bar");
const scoreValue = qs<HTMLSpanElement>("#score-value");
const scoreTarget = qs<HTMLParagraphElement>("#score-target");

/** Temporary test target word — will come from game logic in M4. */
const DEBUG_TARGET = "duck";

const drawingCanvas = new DrawingCanvas(canvasEl);

btnClear.addEventListener("click", () => {
  drawingCanvas.clear();
  clearPredictions();
});
btnExport.addEventListener("click", () => exportAsImage(canvasEl));

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "z") {
    e.preventDefault();
    if (drawingCanvas.undo()) {
      clearTimeout(debounceTimer);
      if (drawingCanvas.getStrokes().length > 0) {
        debounceTimer = window.setTimeout(runInference, 300);
      } else {
        clearPredictions();
      }
    }
  }
});

// --- Inference ---

let inferPending = false;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

drawingCanvas.onStrokeEnd = () => {
  clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(runInference, 300);
};

async function runInference(): Promise<void> {
  if (!isModelLoaded() || inferPending) return;
  inferPending = true;

  try {
    const strokes = drawingCanvas.getStrokes();
    updateDebugPreview(strokes);
    const results = await predict(strokes);
    renderPredictions(results);
    if (isDistancesLoaded()) {
      updateScore(results);
    }
  } finally {
    inferPending = false;
  }
}

function renderPredictions(predictions: Prediction[]): void {
  predictionList.innerHTML = "";
  predictionList.classList.remove("hidden");

  for (const p of predictions) {
    const pct = (p.probability * 100).toFixed(1);
    const dist = getDistance(p.label, DEBUG_TARGET);
    const distPct = (dist * 100).toFixed(1);
    const li = document.createElement("li");
    li.className = "flex items-center gap-2 text-sm";
    li.innerHTML = `
      <span class="w-24 truncate text-gray-200">${formatLabel(p.label)}</span>
      <div class="flex flex-1 flex-col gap-1">
        <div class="flex items-center gap-2">
          <div class="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-700">
            <div class="absolute inset-y-0 left-0 rounded-full bg-indigo-500" style="width:${pct}%"></div>
          </div>
          <span class="w-12 text-right tabular-nums text-gray-400">${pct}%</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-700">
            <div class="absolute inset-y-0 left-0 rounded-full bg-amber-500" style="width:${distPct}%"></div>
          </div>
          <span class="w-12 text-right tabular-nums text-amber-400">${distPct}%</span>
        </div>
      </div>
    `;
    predictionList.appendChild(li);
  }
}

function updateDebugPreview(strokes: ReadonlyArray<Readonly<import("./canvas").Stroke>>): void {
  const imgData = getPreprocessedImage(strokes);
  const ctx = debugCanvas.getContext("2d")!;
  ctx.putImageData(imgData, 0, 0);
  debugPreview.classList.remove("hidden");
  debugPreview.classList.add("flex");
}

function updateScore(predictions: Prediction[]): void {
  const score = getWeightedScore(predictions, DEBUG_TARGET);
  const pct = (score * 100).toFixed(1);
  scoreBar.style.width = `${pct}%`;
  scoreValue.textContent = score.toFixed(2);
  scoreTarget.textContent = `Target: ${DEBUG_TARGET}`;
  scoreDisplay.classList.remove("hidden");
}

function clearPredictions(): void {
  predictionList.innerHTML = "";
  predictionList.classList.add("hidden");
  debugPreview.classList.add("hidden");
  debugPreview.classList.remove("flex");
  scoreDisplay.classList.add("hidden");
}

function formatLabel(label: string): string {
  return label.replace(/_/g, " ").replace(/-/g, " ");
}

// --- Model loading ---

Promise.all([loadModel(), loadDistances()])
  .then(() => {
    modelStatus.textContent = "Model ready";
    modelStatus.classList.replace("text-gray-400", "text-green-400");
    setTimeout(() => modelStatus.classList.add("hidden"), 2000);
  })
  .catch(() => {
    modelStatus.textContent = "Model failed to load";
    modelStatus.classList.replace("text-gray-400", "text-red-400");
  });
