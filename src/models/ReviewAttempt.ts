export type ReviewMethod =
  | "read"
  | "hidden-words"
  | "first-letter"
  | "typing"
  | "recitation";

export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface ReviewAttempt {
  id: string;
  scriptureId: string;
  reviewedAt: string;
  method: ReviewMethod;
  score: number;
  rating: ReviewRating;
  previousIntervalDays: number;
  nextIntervalDays: number;
}
