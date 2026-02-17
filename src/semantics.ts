import type { Prediction } from "./recognizer";

interface DistanceData {
  words: string[];
  distances: number[];
}

let wordIndex: Map<string, number> | null = null;
let distArray: number[] = [];
let wordCount = 0;
let distMin = 0;
let distMax = 1;

/**
 * Load the pre-computed semantic distance matrix from JSON.
 * Must be called before getDistance / getWeightedScore.
 */
export async function loadDistances(): Promise<void> {
  const resp = await fetch("/distances.json");
  const data: DistanceData = await resp.json();

  wordCount = data.words.length;
  distArray = data.distances;
  wordIndex = new Map(data.words.map((w, i) => [w, i]));

  distMin = Math.min(...distArray);
  distMax = Math.max(...distArray);
}

export function isDistancesLoaded(): boolean {
  return wordIndex !== null;
}

/** Return the list of available words from the distance matrix. */
export function getWords(): readonly string[] {
  return wordIndex ? [...wordIndex.keys()] : [];
}

/**
 * Upper-triangle index for pair (i, j) where i < j.
 * The flat array stores row-by-row: row 0 has (n-1) entries, row 1 has (n-2), etc.
 */
function triIndex(i: number, j: number): number {
  const lo = Math.min(i, j);
  const hi = Math.max(i, j);
  // Sum of (wordCount - 1) + (wordCount - 2) + ... + (wordCount - lo)
  // = lo * wordCount - lo * (lo + 1) / 2
  return lo * wordCount - (lo * (lo + 1)) / 2 + (hi - lo - 1);
}

const SIGMOID_K = 10;
const SIGMOID_CENTER = 0.65;

/** Sigmoid remapped so that f(0)=0 and f(1)=1. */
function sigmoidNorm(x: number): number {
  const s = 1 / (1 + Math.exp(-SIGMOID_K * (x - SIGMOID_CENTER)));
  const s0 = 1 / (1 + Math.exp(-SIGMOID_K * (0 - SIGMOID_CENTER)));
  const s1 = 1 / (1 + Math.exp(-SIGMOID_K * (1 - SIGMOID_CENTER)));
  return (s - s0) / (s1 - s0);
}

/**
 * Get the semantic similarity between two words (0.0 = unrelated, 1.0 = identical).
 * Raw cosine similarity is rescaled via min-max + sigmoid for better spread.
 * Returns 0 if either word is not in the vocabulary.
 */
export function getDistance(word1: string, word2: string): number {
  if (!wordIndex) return 0;
  if (word1 === word2) return 1;

  const i = wordIndex.get(word1);
  const j = wordIndex.get(word2);
  if (i === undefined || j === undefined) return 0;

  const raw = distArray[triIndex(i, j)];
  const rescaled = (raw - distMin) / (distMax - distMin);
  return sigmoidNorm(rescaled);
}

/**
 * Calculate a weighted semantic score from model predictions against a target word.
 * Formula: Σ (similarity[prediction_i, target] × probability_i)
 *
 * Returns a value 0.0–1.0 representing how "close" the drawing is to the target.
 */
export function getWeightedScore(
  predictions: Prediction[],
  targetWord: string,
): number {
  let score = 0;
  for (const p of predictions) {
    score += getDistance(p.label, targetWord) * p.probability;
  }
  return score;
}
