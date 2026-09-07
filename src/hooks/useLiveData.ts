import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/database";
import { DEFAULT_SETTINGS } from "../models";

export function useScriptures() {
  return useLiveQuery(() => db.scriptures.toArray(), [], []);
}

export function useScripture(id: string | undefined) {
  return useLiveQuery(() => (id ? db.scriptures.get(id) : undefined), [id]);
}

export function useCollections() {
  return useLiveQuery(() => db.collections.toArray(), [], []);
}

export function useAllProgress() {
  return useLiveQuery(() => db.progress.toArray(), [], []);
}

export function useProgressForScripture(scriptureId: string | undefined) {
  return useLiveQuery(
    () =>
      scriptureId
        ? db.progress.where("scriptureId").equals(scriptureId).first()
        : undefined,
    [scriptureId],
  );
}

export function useAllReviews() {
  return useLiveQuery(() => db.reviews.toArray(), [], []);
}

export function useSettings() {
  return useLiveQuery(
    () => db.settings.get("settings").then((s) => s ?? DEFAULT_SETTINGS),
    [],
    DEFAULT_SETTINGS,
  );
}
