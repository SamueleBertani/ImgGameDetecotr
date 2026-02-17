import { SIGMOID_K, SIGMOID_CENTER } from "./config";
import type { Prediction } from "./types";

interface DistanceData {
  words: string[];
  distances: number[];
}

/**
 * Pre-computed semantic distance matrix between drawing categories.
 * Uses cosine similarity rescaled via min-max normalization and a
 * sigmoid curve for better visual spread.
 */
export class SemanticDistance {
  private wordIndex: Map<string, number>;
  private distArray: number[];
  private wordCount: number;
  private distMin: number;
  private distMax: number;
  private sigmoidS0: number;
  private sigmoidS1: number;

  private constructor(data: DistanceData) {
    this.wordCount = data.words.length;
    this.distArray = data.distances;
    this.wordIndex = new Map(data.words.map((w, i) => [w, i]));
    this.distMin = Math.min(...this.distArray);
    this.distMax = Math.max(...this.distArray);

    // Pre-compute sigmoid boundary values
    this.sigmoidS0 = 1 / (1 + Math.exp(-SIGMOID_K * (0 - SIGMOID_CENTER)));
    this.sigmoidS1 = 1 / (1 + Math.exp(-SIGMOID_K * (1 - SIGMOID_CENTER)));
  }

  /** Fetch the distance matrix from the server and build the index. */
  static async load(): Promise<SemanticDistance> {
    const resp = await fetch("/distances.json");
    const data: DistanceData = await resp.json();
    return new SemanticDistance(data);
  }

  /** Return the list of all words in the vocabulary. */
  getWords(): readonly string[] {
    return [...this.wordIndex.keys()];
  }

  /**
   * Semantic similarity between two words (0 = unrelated, 1 = identical).
   * Returns 0 if either word is not in the vocabulary.
   */
  getDistance(word1: string, word2: string): number {
    if (word1 === word2) return 1;

    const i = this.wordIndex.get(word1);
    const j = this.wordIndex.get(word2);
    if (i === undefined || j === undefined) return 0;

    const raw = this.distArray[this.triIndex(i, j)];
    const rescaled = (raw - this.distMin) / (this.distMax - this.distMin);
    return this.sigmoidNorm(rescaled);
  }

  /** Weighted semantic score: Σ (similarity × probability). */
  getWeightedScore(predictions: Prediction[], targetWord: string): number {
    let score = 0;
    for (const p of predictions) {
      score += this.getDistance(p.label, targetWord) * p.probability;
    }
    return score;
  }

  /** Upper-triangle index for pair (i, j) in the flat distance array. */
  private triIndex(i: number, j: number): number {
    const lo = Math.min(i, j);
    const hi = Math.max(i, j);
    return lo * this.wordCount - (lo * (lo + 1)) / 2 + (hi - lo - 1);
  }

  /** Sigmoid remapped so that f(0)=0 and f(1)=1. */
  private sigmoidNorm(x: number): number {
    const s = 1 / (1 + Math.exp(-SIGMOID_K * (x - SIGMOID_CENTER)));
    return (s - this.sigmoidS0) / (this.sigmoidS1 - this.sigmoidS0);
  }
}
