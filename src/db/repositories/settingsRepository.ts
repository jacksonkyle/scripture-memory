import { db } from "../database";
import { DEFAULT_SETTINGS, type UserSettings } from "../../models";

export async function getSettings(): Promise<UserSettings> {
  const existing = await db.settings.get("settings");
  if (existing) return existing;
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function updateSettings(
  changes: Partial<Omit<UserSettings, "id">>,
): Promise<UserSettings> {
  const current = await getSettings();
  const updated: UserSettings = { ...current, ...changes };
  await db.settings.put(updated);
  return updated;
}
