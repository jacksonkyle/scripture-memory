import type { Backup } from "../models";
import { CURRENT_SCHEMA_VERSION } from "../models";

/**
 * Upgrades an older backup to the current schema version in place.
 * Add a migrateVN-1ToVN step here whenever CURRENT_SCHEMA_VERSION increases.
 */
export function migrateBackup(backup: Backup): Backup {
  let migrated = backup;
  while (migrated.schemaVersion < CURRENT_SCHEMA_VERSION) {
    // No migrations defined yet - schema version 1 is the first version.
    migrated = { ...migrated, schemaVersion: migrated.schemaVersion + 1 };
  }
  return migrated;
}
