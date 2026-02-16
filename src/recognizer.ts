import * as tf from "@tensorflow/tfjs";
import { LABELS } from "./labels";

export interface Prediction {
  label: string;
  probability: number;
}

const MODEL_URL = "/models/doodlenet/model.json";
const INPUT_SIZE = 28;
const TOP_N = 5;

let model: tf.LayersModel | null = null;

export async function loadModel(): Promise<void> {
  model = await tf.loadLayersModel(MODEL_URL);
}

export function isModelLoaded(): boolean {
  return model !== null;
}

/** Padding around the bounding box as a fraction of the box size. */
const BBOX_PAD = 0.15;

/**
 * Find the bounding box of non-black pixels in the canvas.
 * Returns null if the canvas is empty.
 */
function findDrawingBBox(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } | null {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx] > 0 || data[idx + 1] > 0 || data[idx + 2] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found) return null;

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const padX = Math.round(bw * BBOX_PAD);
  const padY = Math.round(bh * BBOX_PAD);

  const x = Math.max(0, minX - padX);
  const y = Math.max(0, minY - padY);
  const w = Math.min(width - x, bw + padX * 2);
  const h = Math.min(height - y, bh + padY * 2);

  return { x, y, w, h };
}

function preprocessCanvas(canvas: HTMLCanvasElement): tf.Tensor4D {
  return tf.tidy(() => {
    const small = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
    const sCtx = small.getContext("2d")!;

    // Black background (matches QuickDraw convention)
    sCtx.fillStyle = "#000000";
    sCtx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);

    // Crop to the bounding box of the drawing, then scale into 28x28
    // centered with preserved aspect ratio so the sketch fills the input
    // like QuickDraw training data.
    const srcCtx = canvas.getContext("2d")!;
    const srcData = srcCtx.getImageData(0, 0, canvas.width, canvas.height);
    const bbox = findDrawingBBox(srcData.data, canvas.width, canvas.height);

    if (bbox) {
      const scale = Math.min(INPUT_SIZE / bbox.w, INPUT_SIZE / bbox.h);
      const dw = bbox.w * scale;
      const dh = bbox.h * scale;
      const dx = (INPUT_SIZE - dw) / 2;
      const dy = (INPUT_SIZE - dh) / 2;
      sCtx.drawImage(canvas, bbox.x, bbox.y, bbox.w, bbox.h, dx, dy, dw, dh);
    }

    const imageData = sCtx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
    const grayscale = new Float32Array(INPUT_SIZE * INPUT_SIZE);

    for (let i = 0; i < grayscale.length; i++) {
      grayscale[i] = imageData.data[i * 4] / 255;
    }

    return tf.tensor4d(grayscale, [1, INPUT_SIZE, INPUT_SIZE, 1]);
  });
}

/**
 * Return the 28x28 preprocessed ImageData so callers can render a debug view.
 */
export function getPreprocessedImage(canvas: HTMLCanvasElement): ImageData {
  const small = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
  const sCtx = small.getContext("2d")!;

  sCtx.fillStyle = "#000000";
  sCtx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);

  const srcCtx = canvas.getContext("2d")!;
  const srcData = srcCtx.getImageData(0, 0, canvas.width, canvas.height);
  const bbox = findDrawingBBox(srcData.data, canvas.width, canvas.height);

  if (bbox) {
    const scale = Math.min(INPUT_SIZE / bbox.w, INPUT_SIZE / bbox.h);
    const dw = bbox.w * scale;
    const dh = bbox.h * scale;
    const dx = (INPUT_SIZE - dw) / 2;
    const dy = (INPUT_SIZE - dh) / 2;
    sCtx.drawImage(canvas, bbox.x, bbox.y, bbox.w, bbox.h, dx, dy, dw, dh);
  }

  return sCtx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
}

export async function predict(
  canvas: HTMLCanvasElement,
): Promise<Prediction[]> {
  if (!model) throw new Error("Model not loaded");

  const input = preprocessCanvas(canvas);
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
