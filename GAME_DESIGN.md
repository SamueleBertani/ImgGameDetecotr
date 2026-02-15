# Sketch Detector - Game Design Document

## Concept

A "reverse Pictionary" game with Hot/Cold mechanics where the user draws to get closer to a secret word. AI recognizes drawings in real-time and provides feedback on "semantic distance" from the solution.

**Privacy-first**: everything runs in the browser, no data sent to external servers.

---

## Core Loop

```
DRAW → AI RECOGNIZES → CALCULATE DISTANCE → THERMAL FEEDBACK → REPEAT
```

1. Game picks a **secret word** (e.g., "Duck")
2. User draws something
3. AI recognizes the drawing (e.g., "Horse")
4. System calculates how close "Horse" is to "Duck"
5. Thermometer updates (hot/cold)
6. User draws something else to get closer
7. Victory when user draws exactly the secret word

---

## Architecture

### Two Independent Engines

| Component | Function | Input | Output |
|-----------|----------|-------|--------|
| **Vision Engine** | Recognizes drawing | Canvas pixels | Top-N predictions with probabilities |
| **Semantic Engine** | Calculates weighted distance | Predictions vs Secret Word | Score 0.0 - 1.0 |

### Data Flow

```
Canvas → Preprocessing → CNN QuickDraw → Top-N Predictions with Probabilities
                                              ↓
Secret Word ←―――――――――――――――――――――→ Weighted Distance → Thermometer
```

---

## Design Constraints

### Closed Vocabulary

The game operates on a fixed set of **345 words** (QuickDraw dataset categories).

- Secret word must be one of these 345
- User can only draw things recognizable by the model
- Semantic distances are pre-computed offline

### Similarity Matrix

Static JSON file containing distances between all word pairs:

```
duck ↔ swan       = 0.92 (very similar)
duck ↔ horse      = 0.65 (moderately similar)
duck ↔ television = 0.12 (very different)
```

---

## Feedback System

### Thermometer Calculation (Weighted)

The thermometer doesn't use only the main prediction, but a **weighted average** of all AI predictions, weighted by their probability.

**Formula:**

```
Thermometer = Σ (semantic_distance[i] × probability[i])
```

**Practical Example:**

| Secret Word: DUCK |
|-------------------|

| AI Prediction | Probability | Distance from "Duck" | Contribution |
|---------------|-------------|----------------------|--------------|
| Horse         | 70%         | 0.65                 | 0.455        |
| Television    | 20%         | 0.12                 | 0.024        |
| Swan          | 10%         | 0.92                 | 0.092        |
| **Total**     | **100%**    |                      | **0.571**    |

Result: Thermometer = **0.57** (Warm)

**Advantages of this approach:**
- If AI "misses" but second prediction is correct, thermometer accounts for it
- Reduces frustration: ambiguous drawing that "resembles" correct answer is rewarded
- Feedback is more stable and less prone to sudden swings

### Thermometer Levels

| Level | Range | Meaning | Feedback |
|-------|-------|---------|----------|
| Cold | 0.0 - 0.3 | Semantically distant | "Brrr... very cold!" |
| Warm | 0.3 - 0.6 | Some connection | "Getting closer..." |
| Hot | 0.6 - 0.9 | Right category | "Fire! You're close!" |
| Victory | > 0.95 | Exact word recognized | "YOU WIN!" |

### Victory Condition

Victory triggers when the **main prediction** (highest probability) matches exactly the secret word, regardless of thermometer value.

### Visual Feedback

User always sees top-3 AI predictions:

```
"I see...
  1. Horse (70%)
  2. Television (20%)
  3. Swan (10%)

Thermometer: WARM [████████░░] 0.57"
```

---

## Game Mechanics

### Base Mode
- Category announced (e.g., "ANIMALS")
- Secret word hidden
- Unlimited attempts
- Optional timer

### "Clues" Mode (Variant)
Instead of drawing the object, draw associated concepts:

**Target: Hospital**
1. Draw ambulance → Thermometer rises
2. Draw stethoscope → Thermometer rises more
3. Draw red cross → Almost victory

### Anti-frustration (Built into Weighted System)

Weighted calculation natively solves the "bad drawing" problem:

- User draws a crooked duck
- AI recognizes: Potato (40%) + Bird (35%) + Duck (25%)
- Even if "Potato" wins, 25% "Duck" and 35% "Bird" raise thermometer
- User receives positive feedback despite AI not "understanding"

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | HTML5 Canvas + Vanilla JS | Or React/Vue |
| ML Runtime | TensorFlow.js | WebGL acceleration |
| Vision Model | DoodleNet CNN | Static files .bin + .json |
| Semantic Data | Pre-computed JSON | ~60KB for 345x345 words |
| Hosting | GitHub Pages / Vercel | Static files only |

---

## Project Files

```
/
├── index.html
├── /assets
│   ├── model/              # TensorFlow.js model
│   │   ├── model.json
│   │   └── weights.bin
│   └── distances.json      # Similarity matrix
├── /src
│   ├── canvas.js           # Drawing management
│   ├── recognizer.js       # Model inference
│   ├── semantics.js        # Distance calculation
│   └── game.js             # Game logic
└── /styles
    └── main.css
```

---

## Critical Issues and Mitigations

| Problem | Impact | Solution |
|---------|--------|----------|
| User draws poorly | AI doesn't recognize → frustration | Weighted system: secondary predictions contribute to thermometer |
| Limited vocabulary | Only 345 possible words | Careful curation of secret words |
| Imprecise semantic distances | "Banana" close to "Moon" (yellow) | Use quality embeddings (Word2Vec/GloVe) |
| Heavy model | Slow loading on mobile | Lazy loading + skeleton UI |

---

## Success Metrics (MVP)

- [ ] Drawing recognition with accuracy > 70% on tests
- [ ] Inference time < 500ms on average device
- [ ] Semantic distances "sensible" for 80% of cases
- [ ] Game session completable in < 3 minutes

---

## Future Expansions

1. **Local multiplayer**: two players, one draws one guesses
2. **Daily Challenge**: word of the day, global leaderboard
3. **Story Mode**: sequence of narratively connected words
4. **Custom Categories**: user creates themed word sets
