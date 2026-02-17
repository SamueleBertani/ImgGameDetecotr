import { dom } from "./dom";
import { formatLabel } from "../utils";
import { getPreprocessedImage } from "../recognizer";
import type { Prediction } from "../types";
import type { SemanticDistance } from "../semantics";
import type { Stroke } from "../canvas";

/** Render the top-N prediction bars (and optional distance bars) into the list. */
export function renderPredictions(
  predictions: Prediction[],
  currentTarget: string,
  showDistanceBars: boolean,
  semantics: SemanticDistance | null,
): void {
  const { list } = dom.predictions;
  list.innerHTML = "";
  list.classList.remove("hidden");

  for (const p of predictions) {
    const pct = (p.probability * 100).toFixed(1);
    const dist = semantics ? semantics.getDistance(p.label, currentTarget) : 0;
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
        <div class="distance-row flex items-center gap-2" style="${showDistanceBars ? "" : "display:none"}">
          <div class="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-700">
            <div class="absolute inset-y-0 left-0 rounded-full bg-amber-500" style="width:${distPct}%"></div>
          </div>
          <span class="w-12 text-right tabular-nums text-amber-400">${distPct}%</span>
        </div>
      </div>
    `;
    list.appendChild(li);
  }
}

/** Render the 28x28 preprocessed image into the debug canvas. */
export function updateDebugPreview(strokes: ReadonlyArray<Readonly<Stroke>>): void {
  const imgData = getPreprocessedImage(strokes);
  const ctx = dom.debug.canvas.getContext("2d")!;
  ctx.putImageData(imgData, 0, 0);
  dom.debug.preview.classList.remove("hidden");
  dom.debug.preview.classList.add("flex");
}

/** Update both semantic score bars (GloVe + Numberbatch). */
export function updateScore(
  predictions: Prediction[],
  currentTarget: string,
  showTarget: boolean,
  semanticsGlove: SemanticDistance | null,
  semanticsNB: SemanticDistance | null,
): void {
  if (semanticsGlove) {
    const score = semanticsGlove.getWeightedScore(predictions, currentTarget);
    const pct = (score * 100).toFixed(1);
    dom.score.bar.style.width = `${pct}%`;
    dom.score.value.textContent = score.toFixed(2);
    dom.score.display.classList.remove("hidden");
  }

  if (semanticsNB) {
    const score = semanticsNB.getWeightedScore(predictions, currentTarget);
    const pct = (score * 100).toFixed(1);
    dom.scoreNB.bar.style.width = `${pct}%`;
    dom.scoreNB.value.textContent = score.toFixed(2);
    dom.scoreNB.display.classList.remove("hidden");
  }

  dom.score.target.textContent = `Target: ${currentTarget}`;
  dom.score.target.style.display = showTarget ? "" : "none";
}

/** Hide predictions, debug preview, and score display. */
export function clearPredictions(): void {
  dom.predictions.list.innerHTML = "";
  dom.predictions.list.classList.add("hidden");
  dom.debug.preview.classList.add("hidden");
  dom.debug.preview.classList.remove("flex");
  dom.score.display.classList.add("hidden");
  dom.scoreNB.display.classList.add("hidden");
  dom.score.target.classList.add("hidden");
}

/** Show or hide all semantic distance bar rows. */
export function toggleDistanceRows(show: boolean): void {
  document.querySelectorAll<HTMLDivElement>(".distance-row").forEach((el) => {
    el.style.display = show ? "" : "none";
  });
}

/** Update the status element to indicate the model loaded successfully. */
export function showModelReady(): void {
  dom.status.textContent = "Model ready";
  dom.status.classList.replace("text-gray-400", "text-green-400");
  setTimeout(() => dom.status.classList.add("hidden"), 2000);
}

/** Update the status element to indicate a model loading failure. */
export function showModelError(): void {
  dom.status.textContent = "Model failed to load";
  dom.status.classList.replace("text-gray-400", "text-red-400");
}
