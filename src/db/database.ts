import Dexie, { type Table } from "dexie";
import type {
  Scripture,
  MemorizationProgress,
  ReviewAttempt,
  Collection,
  UserSettings,
} from "../models";

export class ScriptureMemoryDatabase extends Dexie {
  scriptures!: Table<Scripture, string>;
  progress!: Table<MemorizationProgress, string>;
  reviews!: Table<ReviewAttempt, string>;
  collections!: Table<Collection, string>;
  settings!: Table<UserSettings, string>;

  constructor() {
    super("ScriptureMemory");
    this.version(1).stores({
      scriptures: "id, reference, book, translation",
      progress: "id, scriptureId, status, nextReviewDate",
      reviews: "id, scriptureId, reviewedAt",
      collections: "id, name",
      settings: "id",
    });
  }
}

export const db = new ScriptureMemoryDatabase();
