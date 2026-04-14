# Sketch Detector

Draw it. Let the AI guess. A reverse-Pictionary game where you try to get as close as possible to a secret word — scored in real time by a neural network plus semantic similarity.

Everything runs in the browser. No data leaves your machine.

## How it works

1. The game picks a secret target word.
2. You draw on the canvas.
3. A CNN (DoodleNet / QuickDraw) predicts what your sketch looks like.
4. Two semantic models — **GloVe** and **ConceptNet Numberbatch** — score how close the predictions are to the target.
5. When either score reaches 90%, you win.

Two independent engines:

| Engine | Role | Output |
|---|---|---|
| Vision (TF.js CNN) | Recognizes the sketch | Top-N labels + probabilities |
| Semantic (GloVe + Numberbatch) | Weighted similarity to target | Score 0.0 – 1.0 |

## Stack

- Vite + TypeScript (vanilla)
- Tailwind CSS v4
- TensorFlow.js for inference
- perfect-freehand for canvas drawing
- driver.js for the onboarding tour

## Development

```bash
npm install
npm run dev      # start dev server
npm run build    # production build → dist/
npm run preview  # preview prod build
npm run lint     # eslint
npx tsc --noEmit # typecheck
```

## Project layout

```
src/
  main.ts           app entry, state, event wiring
  canvas.ts         drawing canvas (perfect-freehand)
  recognizer.ts     TF.js CNN loader + inference
  semantics.ts      GloVe / Numberbatch distance matrix
  ui/
    dom.ts          typed DOM references
    renderer.ts     prediction, score, modal rendering
    tour.ts         driver.js onboarding
public/
  distances.json      GloVe pairwise distances
  distances_nb.json   Numberbatch pairwise distances
  models/doodlenet/   TF.js model files
  favicon.svg
  og-image.svg
```

## Deployment

The app is a static SPA. Deployed on Vercel — no config needed, it builds `dist/` from `npm run build` and serves root. For any other static host, just upload `dist/`.

## License

See repository for license details.
