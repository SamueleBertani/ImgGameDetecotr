import { dom } from "./dom";
import { formatLabel } from "../utils";
import { getPreprocessedImage } from "../recognizer";
import type { Prediction } from "../semantics";
import type { SemanticDistance } from "../semantics";
import type { Stroke } from "../canvas";

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

export function updateDebugPreview(strokes: ReadonlyArray<Readonly<Stroke>>): void {
  const imgData = getPreprocessedImage(strokes);
  const ctx = dom.debug.canvas.getContext("2d")!;
  ctx.putImageData(imgData, 0, 0);
  dom.debug.preview.classList.remove("hidden");
  dom.debug.preview.classList.add("flex");
}

export function updateScore(
  predictions: Prediction[],
  currentTarget: string,
  showTarget: boolean,
  semantics: SemanticDistance,
): void {
  const score = semantics.getWeightedScore(predictions, currentTarget);
  const pct = (score * 100).toFixed(1);
  dom.score.bar.style.width = `${pct}%`;
  dom.score.value.textContent = score.toFixed(2);
  dom.score.target.textContent = `Target: ${currentTarget}`;
  dom.score.target.style.display = showTarget ? "" : "none";
  dom.score.display.classList.remove("hidden");
}

export function clearPredictions(): void {
  dom.predictions.list.innerHTML = "";
  dom.predictions.list.classList.add("hidden");
  dom.debug.preview.classList.add("hidden");
  dom.debug.preview.classList.remove("flex");
  dom.score.display.classList.add("hidden");
}

export function toggleDistanceRows(show: boolean): void {
  document.querySelectorAll<HTMLDivElement>(".distance-row").forEach((el) => {
    el.style.display = show ? "" : "none";
  });
}

export function showModelReady(): void {
  dom.status.textContent = "Model ready";
  dom.status.classList.replace("text-gray-400", "text-green-400");
  setTimeout(() => dom.status.classList.add("hidden"), 2000);
}

export function showModelError(): void {
  dom.status.textContent = "Model failed to load";
  dom.status.classList.replace("text-gray-400", "text-red-400");
}
