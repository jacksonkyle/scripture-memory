export interface UserSettings {
  id: "settings";
  preferredTranslation?: string;
  /** User-supplied api.bible key, stored locally only — never bundled into the app or synced anywhere. */
  apiBibleKey?: string;
  dailyNewScriptures: number;
  dailyReviewGoal: number;
  enableSpeechRecognition: boolean;
  enableNotifications: boolean;
  theme: "light" | "dark" | "system";
  /** Animation preference. Optional so existing stored settings keep working; absent means "system". */
  motion?: "system" | "full" | "off";
  reviewAlgorithmVersion: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  id: "settings",
  dailyNewScriptures: 2,
  dailyReviewGoal: 10,
  enableSpeechRecognition: false,
  enableNotifications: false,
  theme: "system",
  motion: "system",
  reviewAlgorithmVersion: 1,
};
