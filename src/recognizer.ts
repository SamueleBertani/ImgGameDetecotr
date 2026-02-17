import * as tf from "@tensorflow/tfjs";
import { LABELS } from "./labels";
import { renderStroke } from "./strokeRenderer";
import { MODEL_URL, INPUT_SIZE, TOP_N, BBOX_PAD, MODEL_STROKE } from "./config";
import type { Stroke } from "./canvas";
import type { Prediction } from "./semantics";

export type { Prediction };

let model: tf.LayersModel | null = null;

export async function loadModel(): Promise<void> {
  model = await tf.loadLayersModel(MODEL_URL);
}

export function isModelLoaded(): boolean {
  return model !== null;
}

function findStrokeBBox(
  strokes: ReadonlyArray<Readonly<Stroke>>,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;

  for (const stroke of strokes) {
    for (const p of stroke.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      found = true;
    }
  }

  return found ? { minX, minY, maxX, maxY } : null;
}

function renderStrokesAt28(
  strokes: ReadonlyArray<Readonly<Stroke>>,
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);

  const bbox = findStrokeBBox(strokes);
  if (!bbox) return canvas;

  const bw = bbox.maxX - bbox.minX || 1;
  const bh = bbox.maxY - bbox.minY || 1;

  const available = INPUT_SIZE * (1 - BBOX_PAD * 2);
  const scale = Math.min(available / bw, available / bh);
  const offsetX = (INPUT_SIZE - bw * scale) / 2;
  const offsetY = (INPUT_SIZE - bh * scale) / 2;

  ctx.fillStyle = "#ffffff";

  for (const stroke of strokes) {
    const mapped = stroke.points.map((p) => ({
      x: (p.x - bbox.minX) * scale + offsetX,
      y: (p.y - bbox.minY) * scale + offsetY,
      pressure: p.pressure,
    }));
    renderStroke(ctx, mapped, MODEL_STROKE);
  }

  return canvas;
}

function preprocessStrokes(
  strokes: ReadonlyArray<Readonly<Stroke>>,
): tf.Tensor4D {
  return tf.tidy(() => {
    const small = renderStrokesAt28(strokes);
    const sCtx = small.getContext("2d")!;
    const imageData = sCtx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
    const grayscale = new Float32Array(INPUT_SIZE * INPUT_SIZE);

    for (let i = 0; i < grayscale.length; i++) {
      grayscale[i] = imageData.data[i * 4] / 255;
    }

    return tf.tensor4d(grayscale, [1, INPUT_SIZE, INPUT_SIZE, 1]);
  });
}

export function getPreprocessedImage(
  strokes: ReadonlyArray<Readonly<Stroke>>,
): ImageData {
  const small = renderStrokesAt28(strokes);
  const sCtx = small.getContext("2d")!;
  return sCtx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
}

export async function predict(
  strokes: ReadonlyArray<Readonly<Stroke>>,
): Promise<Prediction[]> {
  if (!model) throw new Error("Model not loaded");

  const input = preprocessStrokes(strokes);
  try {
    const output = model.predict(input) as tf.Tensor;
    try {
      const probabilities = await output.data();

      const indexed = Array.from(probabilities).map((p, i) => ({
        label: LABELS[i],
        probability: p,
      }));

      indexed.sort((a, b) => b.probability - a.probability);
      return indexed.slice(0, TOP_N);
    } finally {
      output.dispose();
    }
  } finally {
    input.dispose();
  }
}
