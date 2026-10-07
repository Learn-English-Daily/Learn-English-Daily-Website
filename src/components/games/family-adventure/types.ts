export type StageResult = { stars: number; score: number; correct: number; attempts: number; bestCombo: number; sentences?: string[] };
export type StageProps = { sound: boolean; onComplete: (result: StageResult) => void };
