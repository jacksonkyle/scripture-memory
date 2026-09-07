import { db } from "../database";
import type { MemorizationProgress } from "../../models";
import { createId, nowIso } from "../../utils/id";

export async function createInitialProgress(
  scriptureId: string,
): Promise<MemorizationProgress> {
  const timestamp = nowIso();
  const progress: MemorizationProgress = {
    id: createId(),
    scriptureId,
    status: "new",
    stage: 0,
    masteryScore: 0,
    currentIntervalDays: 0,
    nextReviewDate: timestamp,
    successCount: 0,
    failureCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.progress.add(progress);
  return progress;
}

export async function getProgressForScripture(
  scriptureId: string,
): Promise<MemorizationProgress | undefined> {
  return db.progress.where("scriptureId").equals(scriptureId).first();
}

export async function getAllProgress(): Promise<MemorizationProgress[]> {
  return db.progress.toArray();
}

export async function updateProgress(
  id: string,
  changes: Partial<MemorizationProgress>,
): Promise<void> {
  await db.progress.update(id, { ...changes, updatedAt: nowIso() });
}

export async function getDueProgress(
  onOrBefore: string = nowIso(),
): Promise<MemorizationProgress[]> {
  return db.progress
    .where("nextReviewDate")
    .belowOrEqual(onOrBefore)
    .and((p) => p.status !== "paused")
    .toArray();
}
