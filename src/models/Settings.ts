export interface UserSettings {
  id: "settings";
  preferredTranslation?: string;
  dailyNewScriptures: number;
  dailyReviewGoal: number;
  enableSpeechRecognition: boolean;
  enableNotifications: boolean;
  theme: "light" | "dark" | "system";
  reviewAlgorithmVersion: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  id: "settings",
  dailyNewScriptures: 2,
  dailyReviewGoal: 10,
  enableSpeechRecognition: false,
  enableNotifications: false,
  theme: "system",
  reviewAlgorithmVersion: 1,
};
