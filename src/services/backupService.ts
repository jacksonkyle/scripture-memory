import { db } from "../db/database";
import {
  BACKUP_APP_ID,
  CURRENT_SCHEMA_VERSION,
  APPLICATION_VERSION,
  type Backup,
  type RestorePreview,
  type Scripture,
  type Collection,
  type MemorizationProgress,
  type ReviewAttempt,
} from "../models";
import { migrateBackup } from "../db/migrations";
import { getSettings } from "../db/repositories/settingsRepository";

async function computeChecksum(backup: Omit<Backup, "metadata">): Promise<string> {
  const payload = JSON.stringify({
    scriptures: backup.scriptures,
    collections: backup.collections,
    progress: backup.progress,
    reviewHistory: backup.reviewHistory,
    settings: backup.settings,
  });
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256:${hex}`;
}

export async function createBackup(): Promise<Backup> {
  const [scriptures, collections, progress, reviewHistory, settings] = await Promise.all([
    db.scriptures.toArray(),
    db.collections.toArray(),
    db.progress.toArray(),
    db.reviews.toArray(),
    getSettings(),
  ]);

  const base: Backup = {
    app: BACKUP_APP_ID,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    applicationVersion: APPLICATION_VERSION,
    exportedAt: new Date().toISOString(),
    scriptures,
    collections,
    progress,
    reviewHistory,
    settings,
  };

  const checksum = await computeChecksum(base);
  return { ...base, metadata: { checksum } };
}

export async function downloadBackup(): Promise<void> {
  const backup = await createBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `scripture-memory-backup-${dateStamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadScriptureOnlyExport(): Promise<void> {
  const scriptures = await db.scriptures.toArray();
  const blob = new Blob([JSON.stringify(scriptures, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `scripture-memory-scriptures-${dateStamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export class BackupValidationError extends Error {}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

/** Parses and validates a backup file's contents. Throws BackupValidationError on any problem. Never touches the database. */
export function validateBackup(raw: string): Backup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BackupValidationError("The selected file is not valid JSON.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new BackupValidationError("The backup file is malformed.");
  }
  const candidate = parsed as Record<string, unknown>;

  if (candidate.app !== BACKUP_APP_ID) {
    throw new BackupValidationError(
      "This file was not created by Scripture Memory.",
    );
  }
  if (typeof candidate.schemaVersion !== "number" || candidate.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new BackupValidationError(
      "This backup was created by a newer, unsupported version of the app.",
    );
  }
  if (!isValidTimestamp(candidate.exportedAt)) {
    throw new BackupValidationError("The backup is missing a valid export date.");
  }
  if (!Array.isArray(candidate.scriptures) || !Array.isArray(candidate.collections) ||
      !Array.isArray(candidate.progress) || !Array.isArray(candidate.reviewHistory)) {
    throw new BackupValidationError("The backup is missing required data.");
  }

  const scriptureIds = new Set<string>();
  for (const item of candidate.scriptures as unknown[]) {
    const s = item as Partial<Scripture>;
    if (!isValidUuid(s.id) || typeof s.reference !== "string" || typeof s.text !== "string") {
      throw new BackupValidationError("A scripture record is missing required fields.");
    }
    if (!isValidTimestamp(s.createdAt) || !isValidTimestamp(s.updatedAt)) {
      throw new BackupValidationError("A scripture record has an invalid timestamp.");
    }
    scriptureIds.add(s.id);
  }

  const collectionIds = new Set<string>();
  for (const item of candidate.collections as unknown[]) {
    const c = item as Partial<Collection>;
    if (!isValidUuid(c.id) || typeof c.name !== "string") {
      throw new BackupValidationError("A collection record is missing required fields.");
    }
    collectionIds.add(c.id);
  }

  for (const item of candidate.progress as unknown[]) {
    const p = item as Partial<MemorizationProgress>;
    if (!isValidUuid(p.id) || !isValidUuid(p.scriptureId) || typeof p.status !== "string") {
      throw new BackupValidationError("A progress record is missing required fields.");
    }
    if (!scriptureIds.has(p.scriptureId)) {
      throw new BackupValidationError(
        "A progress record references a scripture that does not exist in the backup.",
      );
    }
  }

  for (const item of candidate.reviewHistory as unknown[]) {
    const r = item as Partial<ReviewAttempt>;
    if (!isValidUuid(r.id) || !isValidUuid(r.scriptureId) || !isValidTimestamp(r.reviewedAt)) {
      throw new BackupValidationError("A review record is missing required fields.");
    }
    if (!scriptureIds.has(r.scriptureId)) {
      throw new BackupValidationError(
        "A review record references a scripture that does not exist in the backup.",
      );
    }
  }

  if (typeof candidate.settings !== "object" || candidate.settings === null) {
    throw new BackupValidationError("The backup is missing settings.");
  }

  return migrateBackup(candidate as unknown as Backup);
}

export function buildRestorePreview(backup: Backup): RestorePreview {
  return {
    exportedAt: backup.exportedAt,
    scriptureCount: backup.scriptures.length,
    collectionCount: backup.collections.length,
    reviewCount: backup.reviewHistory.length,
    masteredCount: backup.progress.filter((p) => p.status === "mastered").length,
    learningCount: backup.progress.filter((p) => p.status === "learning").length,
  };
}

export async function restoreReplace(backup: Backup): Promise<void> {
  await db.transaction(
    "rw",
    db.scriptures,
    db.collections,
    db.progress,
    db.reviews,
    db.settings,
    async () => {
      await Promise.all([
        db.scriptures.clear(),
        db.collections.clear(),
        db.progress.clear(),
        db.reviews.clear(),
        db.settings.clear(),
      ]);
      await db.scriptures.bulkAdd(backup.scriptures);
      await db.collections.bulkAdd(backup.collections);
      await db.progress.bulkAdd(backup.progress);
      await db.reviews.bulkAdd(backup.reviewHistory);
      await db.settings.put(backup.settings);

      const counts = await Promise.all([
        db.scriptures.count(),
        db.collections.count(),
        db.progress.count(),
        db.reviews.count(),
      ]);
      if (
        counts[0] !== backup.scriptures.length ||
        counts[1] !== backup.collections.length ||
        counts[2] !== backup.progress.length ||
        counts[3] !== backup.reviewHistory.length
      ) {
        throw new Error("Import verification failed; rolling back.");
      }
    },
  );
}

function newerWins<T extends { id: string; updatedAt: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  const byId = new Map<string, T>();
  for (const item of existing) byId.set(item.id, item);
  for (const item of incoming) {
    const current = byId.get(item.id);
    if (!current || Date.parse(item.updatedAt) >= Date.parse(current.updatedAt)) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values());
}

export async function restoreMerge(backup: Backup): Promise<void> {
  await db.transaction(
    "rw",
    db.scriptures,
    db.collections,
    db.progress,
    db.reviews,
    db.settings,
    async () => {
      const [existingScriptures, existingCollections, existingProgress, existingReviews] =
        await Promise.all([
          db.scriptures.toArray(),
          db.collections.toArray(),
          db.progress.toArray(),
          db.reviews.toArray(),
        ]);

      const mergedScriptures = newerWins(existingScriptures, backup.scriptures);
      const mergedCollections = newerWins(existingCollections, backup.collections);
      const mergedProgress = newerWins(existingProgress, backup.progress);

      const reviewIds = new Set(existingReviews.map((r) => r.id));
      const mergedReviews = [
        ...existingReviews,
        ...backup.reviewHistory.filter((r) => !reviewIds.has(r.id)),
      ];

      await db.scriptures.bulkPut(mergedScriptures);
      await db.collections.bulkPut(mergedCollections);
      await db.progress.bulkPut(mergedProgress);
      await db.reviews.bulkPut(mergedReviews);
    },
  );
}

export async function resetLocalData(): Promise<void> {
  await db.transaction(
    "rw",
    db.scriptures,
    db.collections,
    db.progress,
    db.reviews,
    db.settings,
    async () => {
      await Promise.all([
        db.scriptures.clear(),
        db.collections.clear(),
        db.progress.clear(),
        db.reviews.clear(),
        db.settings.clear(),
      ]);
    },
  );
}

export async function readFileAsText(file: File): Promise<string> {
  return file.text();
}
