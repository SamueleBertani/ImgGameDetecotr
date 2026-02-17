import "./style.css";
import { DrawingCanvas } from "./canvas";
import { exportAsImage } from "./utils";
import { loadModel, predict, isModelLoaded } from "./recognizer";
import { SemanticDistance } from "./semantics";
import type { Prediction } from "./types";
import { INFERENCE_DEBOUNCE_MS } from "./config";
import { dom } from "./ui/dom";
import {
  renderPredictions,
  updateDebugPreview,
  updateScore,
  clearPredictions,
  toggleDistanceRows,
  showModelReady,
  showModelError,
} from "./ui/renderer";

// --- State ---

let currentTarget = "duck";
let showDistanceBars = false;
let showTarget = false;
let semantics: SemanticDistance | null = null;
let inferPending = false;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

// --- Canvas ---

const drawingCanvas = new DrawingCanvas(dom.canvas);

// --- Inference ---

function scheduleInference(delay = INFERENCE_DEBOUNCE_MS): void {
  clearTimeout(debounceTimer);
  if (drawingCanvas.getStrokes().length > 0) {
    debounceTimer = window.setTimeout(runInference, delay);
  }
}

async function runInference(): Promise<void> {
  if (!isModelLoaded() || inferPending) return;
  inferPending = true;

  try {
    const strokes = drawingCanvas.getStrokes();
    updateDebugPreview(strokes);
    const results: Prediction[] = await predict(strokes);
    renderPredictions(results, currentTarget, showDistanceBars, semantics);
    if (semantics) {
      updateScore(results, currentTarget, showTarget, semantics);
    }
  } finally {
    inferPending = false;
  }
}

// --- Event wiring ---

drawingCanvas.onStrokeEnd = () => scheduleInference();

dom.buttons.clear.addEventListener("click", () => {
  drawingCanvas.clear();
  clearPredictions();
});

dom.buttons.export.addEventListener("click", () => exportAsImage(dom.canvas));

dom.toggles.distance.addEventListener("change", () => {
  showDistanceBars = dom.toggles.distance.checked;
  toggleDistanceRows(showDistanceBars);
});

dom.toggles.target.addEventListener("change", () => {
  showTarget = dom.toggles.target.checked;
  dom.score.target.style.display = showTarget ? "" : "none";
});

dom.buttons.newWord.addEventListener("click", () => {
  if (!semantics) return;
  const words = semantics.getWords();
  if (words.length === 0) return;
  let next: string;
  do {
    next = words[Math.floor(Math.random() * words.length)];
  } while (next === currentTarget && words.length > 1);
  currentTarget = next;
  dom.score.target.textContent = `Target: ${currentTarget}`;
  scheduleInference(0);
});

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "z") {
    e.preventDefault();
    if (drawingCanvas.undo()) {
      clearTimeout(debounceTimer);
      if (drawingCanvas.getStrokes().length > 0) {
        scheduleInference();
      } else {
        clearPredictions();
      }
    }
  }
});

// --- Boot ---

Promise.all([loadModel(), SemanticDistance.load()])
  .then(([, sd]) => {
    semantics = sd;
    showModelReady();
  })
  .catch(() => showModelError());
