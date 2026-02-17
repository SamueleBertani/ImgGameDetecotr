/** Centralized configuration constants for the application. */

/** Stroke rendering options for display canvas (user-facing). */
export const DISPLAY_STROKE = {
  size: 20,
  smoothing: 0.5,
  thinning: 0.5,
  streamline: 0.5,
} as const;

/** Stroke rendering options for model input (28x28 preprocessing). */
export const MODEL_STROKE = {
  size: 1.5,
  smoothing: 0.5,
  thinning: 0,
  streamline: 0.5,
} as const;

/** ML model settings. */
export const MODEL_URL = "/models/doodlenet/model.json";
export const INPUT_SIZE = 28;
export const TOP_N = 5;

/** Padding around the bounding box as a fraction of the box size. */
export const BBOX_PAD = 0.15;

/** Sigmoid steepness for semantic distance normalization (center is adaptive). */
export const SIGMOID_K = 10;

/** Debounce delay (ms) before running inference after a stroke. */
export const INFERENCE_DEBOUNCE_MS = 300;
