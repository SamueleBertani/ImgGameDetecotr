# Sketch Detector - Production Roadmap

## Overview

Incremental development in 5 milestones. Each milestone produces a testable deliverable.

```
M1 (Foundation) → M2 (AI Vision) → M3 (Semantics) → M4 (Game Loop) → M5 (Polish)
```

---

## Milestone 1: Foundation

**Goal:** Development environment and working canvas.

### Deliverables

- [ ] Project setup (folder structure, base HTML file)
- [ ] Interactive canvas with mouse and touch support
- [ ] Drawing system (stroke, color, thickness)
- [ ] "Clear" button for canvas reset
- [ ] Export canvas as image (for debug)

### Acceptance Criteria

- User can draw freely on canvas
- Drawing works on desktop and mobile
- Canvas resizes correctly

### Dependencies

None.

---

## Milestone 2: AI Vision

**Goal:** Integrate QuickDraw model for sketch recognition.

### Deliverables

- [ ] Research and select QuickDraw-compatible TensorFlow.js model
- [ ] Download and integrate model files (.json + .bin)
- [ ] Preprocess canvas → model input format (28x28 or 256x256)
- [ ] Inference with top-N predictions + probabilities output
- [ ] Debug UI: show predictions in real-time

### Acceptance Criteria

- Model recognizes at least 10 different categories
- Inference time < 500ms on average laptop
- Top-3 predictions shown with percentages

### Dependencies

- M1 completed (working canvas)

### Available Models (Research Results)

| Model | Categories | Size | TF.js Ready | Notes |
|-------|------------|------|-------------|-------|
| **[DoodleNet](https://github.com/yining1023/doodleNet)** | 345 | ~15MB | Yes | Best option. Full QuickDraw coverage, CNN-based, includes KNN for custom classes |
| [QuickDraw CNN](https://github.com/AlbertZheng/quickdraw-cnn) | 10 | ~2MB | Yes | Demo/MVP only, limited categories |
| [Magenta Sketch-RNN](https://magenta.github.io/magenta-js/sketch/) | ~100 | ~5MB | Yes | Generative model, less suited for classification |

**Recommended: DoodleNet**
- Trained on all 345 QuickDraw categories
- 50k images per class
- Already ported to TensorFlow.js
- Live demo available for testing
- Includes training notebook for customization

### Preprocessing Required

- Resize to fixed dimension (28x28 or model-specific)
- Pixel normalization (0-1 or -1 to 1)
- Possible color inversion (white background → black)

---

## Milestone 3: Semantic Engine

**Goal:** System for calculating semantic distances between words.

### Deliverables

- [ ] One-time Python script to generate similarity matrix
- [ ] Extract list of 345 QuickDraw categories
- [ ] Calculate embeddings with Word2Vec/GloVe
- [ ] Generate cosine distance matrix (345x345)
- [ ] Export to optimized JSON format
- [ ] Load JSON in browser
- [ ] `getDistance(word1, word2)` → score 0.0-1.0
- [ ] `getWeightedScore(predictions, targetWord)` → weighted score

### Acceptance Criteria

- JSON file < 500KB
- Distances "sensible" for manual tests (e.g., dog-cat > dog-television)
- Weighted score calculation correct per formula

### Dependencies

- Category list from model (M2)

### Available Options (Research Results)

| Approach | Pros | Cons | Recommended |
|----------|------|------|-------------|
| **Pre-compute with GloVe (offline)** | Small JSON (~60KB), instant lookup, no runtime cost | One-time setup required | **Yes - Best for this project** |
| [EmbeddingGemma in-browser](https://glaforge.dev/posts/2025/09/08/in-browser-semantic-search-with-embeddinggemma/) | Modern, accurate, multilingual | ~200MB model, overkill for 345 words | No |
| Cloud APIs (Gemini, OpenAI) | High quality | Breaks privacy-first, requires backend | No |

**Recommended: Pre-compute with GloVe**

1. Download [GloVe 6B](https://nlp.stanford.edu/projects/glove/) (50d version, smallest)
2. Extract vectors for 345 QuickDraw words only
3. Compute cosine similarity matrix
4. Export as JSON

### JSON Structure Options

**Option A: Full Matrix (larger, O(1) lookup)**
```json
{
  "words": ["airplane", "alarm_clock", "ambulance", ...],
  "matrix": [
    [1.0, 0.23, 0.45, ...],
    [0.23, 1.0, 0.31, ...],
    ...
  ]
}
```

**Option B: Sparse Dict (smaller, readable)**
```json
{
  "airplane": {"alarm_clock": 0.23, "ambulance": 0.45, ...},
  "alarm_clock": {"airplane": 0.23, "ambulance": 0.31, ...}
}
```

---

## Milestone 4: Game Loop

**Goal:** Complete and playable game mechanics.

### Deliverables

- [ ] Secret word selection (random from curated pool)
- [ ] Category system (optional: filter words by theme)
- [ ] Real-time thermometer calculation (every 1-2 seconds)
- [ ] Visual thermometer UI (colored bar + numeric value)
- [ ] Text feedback ("I see a... Horse!")
- [ ] Victory condition (main prediction = target)
- [ ] Victory screen with recap
- [ ] "New Game" button

### Acceptance Criteria

- Complete loop: start → draw → feedback → win → restart
- Thermometer updates in real-time while drawing
- Victory recognized correctly

### Dependencies

- M2 completed (working recognition)
- M3 completed (semantic distances available)

### Detailed Flow

```
[Start]
    ↓
[Select secret word]
    ↓
[Show category (optional)]
    ↓
[Loop]
  ├→ User draws
  ├→ Every N seconds: AI inference
  ├→ Calculate weighted score
  ├→ Update thermometer
  ├→ If top-1 == target → VICTORY
  └→ Otherwise continue loop
    ↓
[Victory Screen]
    ↓
[New Game?]
```

---

## Milestone 5: Polish & UX

**Goal:** Refined user experience, ready for release.

### Deliverables

- [ ] Loading screen during model load
- [ ] Thermometer animations (smooth transitions)
- [ ] Sound effects (optional, toggle on/off)
- [ ] Responsive design (mobile-first)
- [ ] First-game tutorial
- [ ] High score persistence (localStorage)
- [ ] "Clues" mode (gameplay variant)
- [ ] PWA setup (installable, offline)

### Acceptance Criteria

- Smooth experience on mobile
- Initial load < 10 seconds on 3G
- No blocking bugs

### Dependencies

- M4 completed (working game)

---

## External Dependencies

| Resource | Source | Action Required |
|----------|--------|-----------------|
| DoodleNet Model | [GitHub](https://github.com/yining1023/doodleNet) | Clone and extract model files |
| GloVe Vectors | [Stanford NLP](https://nlp.stanford.edu/projects/glove/) | Download glove.6B.zip (822MB) |
| QuickDraw Categories | [GitHub](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/categories.txt) | Download category list |

---

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| DoodleNet model too large | Low | Medium | Use model quantization or smaller variant |
| GloVe missing some QuickDraw words | Medium | Medium | Use fallback (average of similar words) |
| Poor mobile performance | Medium | High | Optimize inference frequency, use WebWorker |
| Bundle size too large | Low | Medium | Lazy load model, compress assets |

---

## Recommended Development Order

```
1. M1 - Foundation
   └── Testable: "Can I draw on the canvas?"

2. M2 - AI Vision
   └── Testable: "Does AI recognize what I draw?"

3. M3 - Semantics (parallelizable with M2)
   └── Testable: "Do semantic distances make sense?"

4. M4 - Game Loop
   └── Testable: "Can I play a complete game?"

5. M5 - Polish
   └── Testable: "Is the experience enjoyable?"
```

**Note:** M2 and M3 can be developed in parallel. M3 only needs the category list, not the working model.

---

## Definition of Done (per Milestone)

- [ ] All deliverables completed
- [ ] Acceptance criteria verified
- [ ] Tested on Chrome, Firefox, Safari
- [ ] Tested on mobile (iOS Safari, Android Chrome)
- [ ] No console errors
- [ ] Code committed and pushed
