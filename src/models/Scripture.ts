export interface Scripture {
  id: string;
  reference: string;
  book: string;
  chapter: number;
  startVerse: number;
  endVerse?: number;
  text: string;
  translation: string;
  collectionIds: string[];
  meaning?: string;
  reasonForMemorizing?: string;
  createdAt: string;
  updatedAt: string;
}

export const TRANSLATIONS = [
  "KJV",
  "NKJV",
  "ESV",
  "NIV",
  "NASB",
  "CSB",
  "Custom",
] as const;

export type Translation = (typeof TRANSLATIONS)[number];
