/** A single model prediction with its class label and confidence. */
export interface Prediction {
  label: string;
  probability: number;
}
