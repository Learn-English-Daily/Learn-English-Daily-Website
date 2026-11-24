import type { ArcadeStageResult } from "../lead-arcade/types";

export type CalendarStageProps = {
  level: number;
  sound: boolean;
  activeDate: Date;
  onComplete: (result: ArcadeStageResult) => void;
};

