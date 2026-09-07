import { db } from "../database";
import type { Scripture } from "../../models";
import { createId, nowIso } from "../../utils/id";
import { createInitialProgress } from "./progressRepository";

export type NewScriptureInput = Omit<
  Scripture,
  "id" | "createdAt" | "updatedAt"
>;

export async function addScripture(input: NewScriptureInput): Promise<Scripture> {
  const timestamp = nowIso();
  const scripture: Scripture = {
    ...input,
    id: createId(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.transaction("rw", db.scriptures, db.progress, async () => {
    await db.scriptures.add(scripture);
    await createInitialProgress(scripture.id);
  });
  return scripture;
}

export async function updateScripture(
  id: string,
  changes: Partial<NewScriptureInput>,
): Promise<void> {
  await db.scriptures.update(id, { ...changes, updatedAt: nowIso() });
}

export async function deleteScripture(id: string): Promise<void> {
  await db.transaction(
    "rw",
    db.scriptures,
    db.progress,
    db.reviews,
    async () => {
      await db.scriptures.delete(id);
      await db.progress.where("scriptureId").equals(id).delete();
      await db.reviews.where("scriptureId").equals(id).delete();
    },
  );
}

export async function getScripture(id: string): Promise<Scripture | undefined> {
  return db.scriptures.get(id);
}

export async function getAllScriptures(): Promise<Scripture[]> {
  return db.scriptures.toArray();
}
