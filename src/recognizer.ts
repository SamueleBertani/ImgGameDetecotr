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

function preprocessCanvas(canvas: HTMLCanvasElement): tf.Tensor4D {
  return tf.tidy(() => {
    const small = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
    const sCtx = small.getContext("2d")!;

    // Black background (matches QuickDraw convention)
    sCtx.fillStyle = "#000000";
    sCtx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);

    // Scale source canvas into 28x28, preserving aspect ratio centered.
    // Assumes a roughly square canvas; non-square will be letterboxed.
    const srcW = canvas.width;
    const srcH = canvas.height;
    const scale = Math.min(INPUT_SIZE / srcW, INPUT_SIZE / srcH);
    const dw = srcW * scale;
    const dh = srcH * scale;
    const dx = (INPUT_SIZE - dw) / 2;
    const dy = (INPUT_SIZE - dh) / 2;
    sCtx.drawImage(canvas, 0, 0, srcW, srcH, dx, dy, dw, dh);

    const imageData = sCtx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
    const grayscale = new Float32Array(INPUT_SIZE * INPUT_SIZE);

    for (let i = 0; i < grayscale.length; i++) {
      // Use red channel (strokes are white = 255,255,255 on black = 0,0,0)
      grayscale[i] = imageData.data[i * 4] / 255;
    }

    return tf.tensor4d(grayscale, [1, INPUT_SIZE, INPUT_SIZE, 1]);
  });
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
