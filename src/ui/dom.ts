/** Type-safe querySelector that throws if the element is missing. */
function qs<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el;
}

/** Grouped references to all DOM elements used by the app. */
export const dom = {
  canvas: qs<HTMLCanvasElement>("#drawing-canvas"),

  buttons: {
    clear: qs<HTMLButtonElement>("#btn-clear"),
    export: qs<HTMLButtonElement>("#btn-export"),
    newWord: qs<HTMLButtonElement>("#btn-new-word"),
  },

  toggles: {
    distance: qs<HTMLInputElement>("#toggle-distance"),
    target: qs<HTMLInputElement>("#toggle-target"),
  },

  status: qs<HTMLParagraphElement>("#model-status"),

  predictions: {
    list: qs<HTMLUListElement>("#prediction-list"),
  },

  debug: {
    preview: qs<HTMLDivElement>("#debug-preview"),
    canvas: qs<HTMLCanvasElement>("#debug-canvas"),
  },

  score: {
    display: qs<HTMLDivElement>("#score-display"),
    bar: qs<HTMLDivElement>("#score-bar"),
    value: qs<HTMLSpanElement>("#score-value"),
    target: qs<HTMLParagraphElement>("#score-target"),
  },

  scoreNB: {
    display: qs<HTMLDivElement>("#score-display-nb"),
    bar: qs<HTMLDivElement>("#score-bar-nb"),
    value: qs<HTMLSpanElement>("#score-value-nb"),
  },
} as const;
