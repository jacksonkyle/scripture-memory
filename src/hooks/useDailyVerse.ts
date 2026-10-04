import { useEffect, useState } from "react";

export interface DailyVerse {
  reference: string;
  text: string;
  encouragement: string;
}

interface DailyVerseFile {
  translation: string;
  verses: DailyVerse[];
}

/** Shown if public/daily-verses.json can't be loaded (first visit while offline, say). */
const FALLBACK: DailyVerse = {
  reference: "Psalm 119:11",
  text: "Thy word have I hid in mine heart, that I might not sin against thee.",
  encouragement: "Every verse you hide in your heart today is one you can draw on tomorrow.",
};

const CACHE_KEY = "sm-daily-verse";

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** The same verse all calendar day, advancing one verse through the list at local midnight. */
function pickForDate(verses: DailyVerse[], date: Date): DailyVerse {
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / (24 * 60 * 60 * 1000),
  );
  return verses[dayNumber % verses.length];
}

function readCache(dayKey: string): DailyVerse | undefined {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
    return cached?.day === dayKey ? cached.verse : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(dayKey: string, verse: DailyVerse): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ day: dayKey, verse }));
  } catch {
    // Storage can be unavailable (private mode); the verse is simply re-fetched next time.
  }
}

/**
 * Today's verse from public/daily-verses.json. Edit that file to change the
 * rotation; the service worker precaches it so it also works offline.
 * Undefined only for the moment before the first load of the day resolves.
 */
export function useDailyVerse(): DailyVerse | undefined {
  const dayKey = localDayKey(new Date());
  const [verse, setVerse] = useState(() => readCache(dayKey));

  useEffect(() => {
    const cached = readCache(dayKey);
    if (cached) {
      // Keeps an app left open past midnight in step with the new day.
      setVerse((current) => (current?.reference === cached.reference ? current : cached));
      return;
    }
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}daily-verses.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<DailyVerseFile>;
      })
      .then((file) => {
        if (!file.verses?.length) throw new Error("No verses in file");
        return pickForDate(file.verses, new Date());
      })
      .catch(() => FALLBACK)
      .then((picked) => {
        if (cancelled) return;
        if (picked !== FALLBACK) writeCache(dayKey, picked);
        setVerse(picked);
      });
    return () => {
      cancelled = true;
    };
  }, [dayKey]);

  return verse;
}
