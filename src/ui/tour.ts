import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { dom } from "./dom";

const STORAGE_KEY = "tutorialSeen";

function forceScoreBarsVisible(): () => void {
  const glove = dom.score.display;
  const nb = dom.scoreNB.display;
  const gloveWasHidden = glove.classList.contains("hidden");
  const nbWasHidden = nb.classList.contains("hidden");
  if (gloveWasHidden) glove.classList.remove("hidden");
  if (nbWasHidden) nb.classList.remove("hidden");
  return () => {
    if (gloveWasHidden) glove.classList.add("hidden");
    if (nbWasHidden) nb.classList.add("hidden");
  };
}

function buildSteps(): DriveStep[] {
  const hasPrediction = dom.predictions.list.querySelector("li") !== null;
  const gloveTarget = hasPrediction ? ".glove-bar" : "#prediction-list";
  const nbTarget = hasPrediction ? ".nb-bar" : "#prediction-list";

  return [
    {
      popover: {
        title: "Guess the hidden word",
        description:
          "A secret word is chosen at the start. You don't see it. Draw things and use the AI's reactions to figure out what it is.",
      },
    },
    {
      element: "#drawing-canvas",
      popover: {
        title: "Draw here",
        description:
          "Sketch anything. The AI will try to recognize your drawing and return its top guesses.",
      },
    },
    {
      element: "#prediction-list",
      popover: {
        title: "AI guesses",
        description:
          "These are what the AI thinks you drew. They are <b>not</b> the secret word — they're clues. Each guess shows two bars.",
      },
    },
    {
      element: gloveTarget,
      popover: {
        title: "GloVe bar (amber)",
        description:
          "How semantically close this guess is to the secret word, according to GloVe — a model that learned word meaning from how words appear together in text.",
      },
    },
    {
      element: nbTarget,
      popover: {
        title: "Numberbatch bar (cyan)",
        description:
          "Same idea, but using ConceptNet Numberbatch — built from a knowledge graph of concepts. Longer bars = closer in meaning. Use both to triangulate the secret word.",
      },
    },
    {
      element: "#score-display",
      popover: {
        title: "Your best score",
        description:
          "These bars track your best score so far. They rise when one of your drawings produces a guess semantically close to the secret word.",
      },
    },
    {
      element: "#score-display-nb",
      popover: {
        title: "How to win",
        description:
          "Fill <b>either</b> bar to <b>90%</b>. Get one guess close enough to the secret word and you win.",
      },
    },
    {
      element: "#btn-help",
      popover: {
        title: "Need a refresher?",
        description: "Click here anytime to replay this tutorial.",
      },
    },
  ];
}

export function startTour(): void {
  const restoreScoreBars = forceScoreBarsVisible();

  const d = driver({
    showProgress: true,
    allowClose: true,
    steps: buildSteps(),
    onDestroyed: () => {
      restoreScoreBars();
      localStorage.setItem(STORAGE_KEY, "1");
    },
  });

  d.drive();
}

export function maybeStartTourOnFirstVisit(): void {
  if (localStorage.getItem(STORAGE_KEY)) return;
  startTour();
}
