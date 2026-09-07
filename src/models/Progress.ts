export type MemorizationStatus =
  | "new"
  | "learning"
  | "reviewing"
  | "mastered"
  | "paused";

export interface MemorizationProgress {
  id: string;
  scriptureId: string;
  status: MemorizationStatus;
  stage: number;
  masteryScore: number;
  currentIntervalDays: number;
  nextReviewDate: string;
  successCount: number;
  failureCount: number;
  lastReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}
