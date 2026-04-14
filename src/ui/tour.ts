import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { dom } from "./dom";

const STORAGE_KEY = "tutorialSeen";

const PLACEHOLDER_LI_HTML = `
  <span class="w-24 truncate text-gray-200">cat</span>
  <div class="flex flex-1 flex-col gap-0.5">
    <div class="flex items-center gap-2">
      <div class="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-700">
        <div class="absolute inset-y-0 left-0 rounded-full bg-indigo-500" style="width:62%"></div>
      </div>
      <span class="w-12 text-right tabular-nums text-gray-400">62.0%</span>
    </div>
    <div class="distance-row flex items-center gap-1">
      <div class="glove-bar flex flex-1 items-center gap-1">
        <div class="relative h-1.5 flex-1 overflow-hidden rounded-full bg-gray-700">
          <div class="absolute inset-y-0 left-0 rounded-full bg-amber-500" style="width:71%"></div>
        </div>
        <span class="w-7 text-right tabular-nums text-[10px] text-amber-400">0.71</span>
      </div>
      <div class="nb-bar flex flex-1 items-center gap-1">
        <div class="relative h-1.5 flex-1 overflow-hidden rounded-full bg-gray-700">
          <div class="absolute inset-y-0 left-0 rounded-full bg-cyan-500" style="width:58%"></div>
        </div>
        <span class="w-7 text-right tabular-nums text-[10px] text-cyan-400">0.58</span>
      </div>
    </div>
  </div>
`;

/** Force the prediction list, a placeholder row, and both score bars visible for the tour. Returns a cleanup callback. */
function preparePreviewForTour(): () => void {
  const glove = dom.score.display;
  const nb = dom.scoreNB.display;
  const list = dom.predictions.list;

  const gloveWasHidden = glove.classList.contains("hidden");
  const nbWasHidden = nb.classList.contains("hidden");
  const listWasHidden = list.classList.contains("hidden");
  const hadRealPrediction = list.querySelector("li") !== null;

  if (gloveWasHidden) glove.classList.remove("hidden");
  if (nbWasHidden) nb.classList.remove("hidden");
  if (listWasHidden) list.classList.remove("hidden");

  let placeholder: HTMLLIElement | null = null;
  if (!hadRealPrediction) {
    placeholder = document.createElement("li");
    placeholder.className = "flex items-center gap-2 text-sm";
    placeholder.dataset.tourPlaceholder = "1";
    placeholder.innerHTML = PLACEHOLDER_LI_HTML;
    list.appendChild(placeholder);
  }

  return () => {
    placeholder?.remove();
    if (gloveWasHidden) glove.classList.add("hidden");
    if (nbWasHidden) nb.classList.add("hidden");
    if (listWasHidden) list.classList.add("hidden");
  };
}

function buildSteps(): DriveStep[] {
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
      element: ".glove-bar",
      popover: {
        title: "GloVe bar (amber)",
        description:
          "How semantically close this guess is to the secret word, according to GloVe — a model that learned word meaning from how words appear together in text.",
      },
    },
    {
      element: ".nb-bar",
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
  const restorePreview = preparePreviewForTour();

  const d = driver({
    showProgress: true,
    allowClose: true,
    steps: buildSteps(),
    onDestroyed: () => {
      restorePreview();
      localStorage.setItem(STORAGE_KEY, "1");
    },
  });

  d.drive();
}

export function maybeStartTourOnFirstVisit(): void {
  if (localStorage.getItem(STORAGE_KEY)) return;
  startTour();
}
