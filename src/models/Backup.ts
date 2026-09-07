import type { Scripture } from "./Scripture";
import type { Collection } from "./Collection";
import type { MemorizationProgress } from "./Progress";
import type { ReviewAttempt } from "./ReviewAttempt";
import type { UserSettings } from "./Settings";

export const BACKUP_APP_ID = "scripture-memory";
export const CURRENT_SCHEMA_VERSION = 1;
export const APPLICATION_VERSION = "1.0.0";

export interface Backup {
  app: typeof BACKUP_APP_ID;
  schemaVersion: number;
  applicationVersion: string;
  exportedAt: string;
  scriptures: Scripture[];
  collections: Collection[];
  progress: MemorizationProgress[];
  reviewHistory: ReviewAttempt[];
  settings: UserSettings;
  metadata?: {
    checksum?: string;
  };
}

export interface RestorePreview {
  exportedAt: string;
  scriptureCount: number;
  collectionCount: number;
  reviewCount: number;
  masteredCount: number;
  learningCount: number;
}
