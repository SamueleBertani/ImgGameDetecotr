# Sketch Detector

A reverse-Pictionary game. You get a secret word, you draw, and the AI tries to read your mind — in real time, entirely in the browser.

Unlike the Google "Quick, Draw!" demo, here the CNN's job isn't to guess the word; it's to *describe what you drew*. A second layer then measures how **semantically close** that description is to the target. Draw a horse when the word is "duck" and the thermometer stays cold; draw a bird and it starts climbing, even before the network gets "duck" at the top of the list.

Two independent engines, both running client-side with no network calls after the initial model load.

## How it works

```
canvas ──► 28×28 preprocess ──► DoodleNet CNN ──► top-5 labels + probabilities
                                                        │
                              target word ──► semantic distance matrix ──► weighted score ──► thermometer
```

**Vision.** [DoodleNet](https://github.com/yining1023/doodleNet), a TF.js CNN trained on Google QuickDraw, classifying over 345 categories. Strokes are rasterized to a 28×28 grayscale input, cropped to bounding box with 15% padding. Inference is debounced 300 ms after each stroke.

**Semantics.** Two precomputed pairwise-distance matrices over the 345 QuickDraw labels:

- [`public/distances.json`](public/distances.json) — GloVe 6B 50d, cosine similarity.
- [`public/distances_nb.json`](public/distances_nb.json) — ConceptNet Numberbatch, cosine similarity.

Both are generated offline by [`scripts/generate_distances.py`](scripts/generate_distances.py) and [`scripts/generate_distances_numberbatch.py`](scripts/generate_distances_numberbatch.py). The runtime only ships the upper-triangle flat array plus the label index.

Raw cosine values are squashed through a sigmoid with adaptive center (median of the rescaled distribution) and steepness `k = 10`, remapped so `f(0) = 0` and `f(1) = 1`. This spreads the interesting middle of the distribution — without it almost every pair sits in a narrow band and the thermometer is useless. See [`src/semantics.ts`](src/semantics.ts) and [`SIGMOID_K`](src/config.ts).

**Score.** For each frame the weighted similarity `Σ (similarity(label, target) × probability(label))` is computed against both matrices. The game is won when either score crosses 0.9.

## Tech stack

- Vite + TypeScript, vanilla DOM (no framework)
- Tailwind CSS v4 via `@tailwindcss/vite`
- TensorFlow.js for CNN inference
- [perfect-freehand](https://github.com/steveruizok/perfect-freehand) for pressure-aware strokes
- [driver.js](https://driverjs.com/) for the first-visit onboarding tour

## Development

```bash
npm install
npm run dev        # Vite dev server
npm run build      # tsc && vite build → dist/
npm run preview    # serve the production build
npm run lint       # ESLint (flat config)
npx tsc --noEmit   # typecheck only
```

Regenerating the semantic matrices (optional, only needed when the label list changes):

```bash
python3 scripts/generate_distances.py
python3 scripts/generate_distances_numberbatch.py
```

Both scripts download their embeddings on first run (GloVe 6B ~820 MB zip, Numberbatch ~1.4 GB) into `scripts/*_data/`, which is gitignored.

## Layout

```
src/
  main.ts              entry, state, event wiring
  canvas.ts            drawing canvas
  recognizer.ts        TF.js model loader + preprocessing + inference
  semantics.ts         distance-matrix loader + sigmoid normalization
  config.ts            tunables (stroke sizes, TOP_N, SIGMOID_K, debounce)
  labels.ts            345 QuickDraw categories
  ui/
    dom.ts             typed DOM references
    renderer.ts        predictions, score bars, win modal
    tour.ts            driver.js onboarding
public/
  distances.json       GloVe pairwise matrix
  distances_nb.json    Numberbatch pairwise matrix
  models/doodlenet/    TF.js model weights
  favicon.svg
  og-image.svg
scripts/
  generate_distances.py              regenerate GloVe matrix
  generate_distances_numberbatch.py  regenerate Numberbatch matrix
```

Relevant design notes live in [`GAME_DESIGN.md`](GAME_DESIGN.md); the build-up is tracked in [`ROADMAP.md`](ROADMAP.md).

## Deployment

Static SPA, no backend. Deployed on Vercel — zero config, it builds `dist/` and serves from root. Any other static host works: run `npm run build`, upload `dist/`.

## License

MIT — see [LICENSE](LICENSE).
