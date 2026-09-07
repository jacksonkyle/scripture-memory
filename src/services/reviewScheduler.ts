import type {
  MemorizationProgress,
  MemorizationStatus,
  ReviewMethod,
  ReviewRating,
} from "../models";
import { TOTAL_MEMORIZATION_STAGES } from "./memorization";
import {
  getProgressForScripture,
  updateProgress,
} from "../db/repositories/progressRepository";
import { recordReviewAttempt } from "../db/repositories/reviewRepository";
import { nowIso } from "../utils/id";

/** Days-based spaced repetition ladder for a scripture in long-term review. */
export const REVIEW_LADDER_DAYS = [1, 3, 7, 14, 30, 60, 120, 240, 365];

function ladderIndexFor(currentIntervalDays: number): number {
  const index = REVIEW_LADDER_DAYS.findIndex((d) => d === currentIntervalDays);
  return index;
}

export function computeNextIntervalDays(
  currentIntervalDays: number,
  rating: ReviewRating,
): number {
  const idx = ladderIndexFor(currentIntervalDays);
  switch (rating) {
    case "again":
      return 0;
    case "hard": {
      const targetIdx = Math.max(0, idx - 2);
      const candidate = REVIEW_LADDER_DAYS[targetIdx];
      return Math.min(candidate, Math.max(1, Math.round(currentIntervalDays * 0.5)));
    }
    case "good": {
      const targetIdx = Math.min(REVIEW_LADDER_DAYS.length - 1, idx + 1);
      return REVIEW_LADDER_DAYS[targetIdx];
    }
    case "easy": {
      const targetIdx = Math.min(REVIEW_LADDER_DAYS.length - 1, idx + 2);
      return REVIEW_LADDER_DAYS[targetIdx];
    }
    default:
      return REVIEW_LADDER_DAYS[0];
  }
}

export function computeMasteryScore(progress: MemorizationProgress): number {
  const intervalComponent = Math.min(70, (progress.currentIntervalDays / 240) * 70);
  const successComponent = Math.min(20, progress.successCount * 2);
  const stageComponent = Math.min(10, (progress.stage / TOTAL_MEMORIZATION_STAGES) * 10);
  const failurePenalty = Math.min(25, progress.failureCount * 3);
  return Math.max(
    0,
    Math.min(100, Math.round(intervalComponent + successComponent + stageComponent - failurePenalty)),
  );
}

export function deriveStatus(progress: MemorizationProgress): MemorizationStatus {
  if (progress.status === "paused") return "paused";
  if (progress.masteryScore >= 95) return "mastered";
  if (progress.stage === 0 && progress.successCount === 0) return "new";
  if (progress.stage < TOTAL_MEMORIZATION_STAGES) return "learning";
  return "reviewing";
}

function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export interface ApplyReviewInput {
  scriptureId: string;
  method: ReviewMethod;
  score: number;
  rating: ReviewRating;
  /** Advance the memorization stage (1-5) after a successful stage completion. */
  advanceStage?: boolean;
}

export async function applyReview({
  scriptureId,
  method,
  score,
  rating,
  advanceStage,
}: ApplyReviewInput): Promise<MemorizationProgress> {
  const progress = await getProgressForScripture(scriptureId);
  if (!progress) throw new Error(`No progress record for scripture ${scriptureId}`);

  const previousIntervalDays = progress.currentIntervalDays;
  const nextIntervalDays = computeNextIntervalDays(previousIntervalDays, rating);
  const succeeded = rating !== "again";

  const stage = advanceStage
    ? Math.min(TOTAL_MEMORIZATION_STAGES, progress.stage + 1)
    : progress.stage;

  const updatedFields: Partial<MemorizationProgress> = {
    stage,
    currentIntervalDays: nextIntervalDays,
    nextReviewDate: addDays(nowIso(), nextIntervalDays),
    successCount: succeeded ? progress.successCount + 1 : progress.successCount,
    failureCount: succeeded ? progress.failureCount : progress.failureCount + 1,
    lastReviewedAt: nowIso(),
  };

  const merged: MemorizationProgress = { ...progress, ...updatedFields };
  merged.masteryScore = computeMasteryScore(merged);
  merged.status = deriveStatus(merged);

  await updateProgress(progress.id, {
    stage: merged.stage,
    currentIntervalDays: merged.currentIntervalDays,
    nextReviewDate: merged.nextReviewDate,
    successCount: merged.successCount,
    failureCount: merged.failureCount,
    lastReviewedAt: merged.lastReviewedAt,
    masteryScore: merged.masteryScore,
    status: merged.status,
  });

  await recordReviewAttempt({
    scriptureId,
    method,
    score,
    rating,
    previousIntervalDays,
    nextIntervalDays,
  });

  return merged;
}

export function ratingFromScore(score: number): ReviewRating {
  if (score >= 95) return "easy";
  if (score >= 85) return "good";
  if (score >= 70) return "hard";
  return "again";
}
