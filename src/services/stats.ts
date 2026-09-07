import type { MemorizationProgress, ReviewAttempt } from "../models";

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dayKey(iso: string): string {
  return startOfDay(new Date(iso)).toISOString().slice(0, 10);
}

/** Counts consecutive days (ending today or yesterday) that have at least one review. */
export function computeStreak(reviews: ReviewAttempt[]): number {
  if (reviews.length === 0) return 0;
  const reviewedDays = new Set(reviews.map((r) => dayKey(r.reviewedAt)));
  const today = startOfDay(new Date());
  let cursor = new Date(today);

  if (!reviewedDays.has(dayKey(cursor.toISOString()))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!reviewedDays.has(dayKey(cursor.toISOString()))) {
      return 0;
    }
  }

  let streak = 0;
  while (reviewedDays.has(dayKey(cursor.toISOString()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function reviewsToday(reviews: ReviewAttempt[]): number {
  const todayKey = dayKey(new Date().toISOString());
  return reviews.filter((r) => dayKey(r.reviewedAt) === todayKey).length;
}

export function reviewsThisWeek(reviews: ReviewAttempt[]): number {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return reviews.filter((r) => new Date(r.reviewedAt) >= sevenDaysAgo).length;
}

export function averageRecallScore(reviews: ReviewAttempt[]): number {
  if (reviews.length === 0) return 0;
  const total = reviews.reduce((sum, r) => sum + r.score, 0);
  return Math.round(total / reviews.length);
}

export interface UpcomingLoad {
  today: number;
  tomorrow: number;
  next7Days: number;
  next30Days: number;
}

export function computeUpcomingLoad(progress: MemorizationProgress[]): UpcomingLoad {
  const now = startOfDay(new Date());
  const dayMs = 24 * 60 * 60 * 1000;
  const nonPaused = progress.filter((p) => p.status !== "paused");

  const daysUntil = (iso: string) =>
    Math.floor((startOfDay(new Date(iso)).getTime() - now.getTime()) / dayMs);

  return {
    today: nonPaused.filter((p) => daysUntil(p.nextReviewDate) <= 0).length,
    tomorrow: nonPaused.filter((p) => daysUntil(p.nextReviewDate) === 1).length,
    next7Days: nonPaused.filter((p) => daysUntil(p.nextReviewDate) <= 7).length,
    next30Days: nonPaused.filter((p) => daysUntil(p.nextReviewDate) <= 30).length,
  };
}

export function statusCounts(progress: MemorizationProgress[]) {
  return {
    new: progress.filter((p) => p.status === "new").length,
    learning: progress.filter((p) => p.status === "learning").length,
    reviewing: progress.filter((p) => p.status === "reviewing").length,
    mastered: progress.filter((p) => p.status === "mastered").length,
    paused: progress.filter((p) => p.status === "paused").length,
  };
}
