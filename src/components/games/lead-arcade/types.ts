export type ArcadeStageResult = {
  stars: number;
  score: number;
  correct: number;
  attempts: number;
  bestCombo: number;
  label?: string;
  practiced?: string[];
};

export type ArcadeStageProps = {
  sound: boolean;
  onComplete: (result: ArcadeStageResult) => void;
};
