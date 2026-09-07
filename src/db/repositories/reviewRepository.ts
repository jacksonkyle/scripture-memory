import { db } from "../database";
import type { ReviewAttempt } from "../../models";
import { createId, nowIso } from "../../utils/id";

export async function recordReviewAttempt(
  input: Omit<ReviewAttempt, "id" | "reviewedAt">,
): Promise<ReviewAttempt> {
  const attempt: ReviewAttempt = {
    ...input,
    id: createId(),
    reviewedAt: nowIso(),
  };
  await db.reviews.add(attempt);
  return attempt;
}

export async function getReviewsForScripture(
  scriptureId: string,
): Promise<ReviewAttempt[]> {
  return db.reviews.where("scriptureId").equals(scriptureId).toArray();
}

export async function getAllReviews(): Promise<ReviewAttempt[]> {
  return db.reviews.toArray();
}

export async function getReviewsSince(sinceIso: string): Promise<ReviewAttempt[]> {
  return db.reviews.where("reviewedAt").aboveOrEqual(sinceIso).toArray();
}
