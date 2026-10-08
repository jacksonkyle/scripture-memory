import { useEffect, useState } from "react";

export interface DailyVerse {
  reference: string;
  text: string;
  encouragement: string;
  /** Translation code from the data file, e.g. "WEB". */
  translation: string;
}

interface DailyVerseFile {
  translation: string;
  verses: Omit<DailyVerse, "translation">[];
}

/** Shown if public/daily-verses.json can't be loaded (first visit while offline, say). */
const FALLBACK: DailyVerse = {
  reference: "Psalm 119:11",
  text: "I have hidden your word in my heart, that I might not sin against you.",
  encouragement: "Every verse you hide in your heart today is one you can draw on tomorrow.",
  translation: "WEB",
};

const CACHE_KEY = "sm-daily-verse-v2";

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** Small seeded PRNG so every device shuffles a given cycle the same way. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fixed random ordering of 0..count-1 for the given cycle (Fisher–Yates). */
function shuffledOrder(count: number, cycle: number): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  const random = mulberry32(cycle * 2654435761 + count);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * The same verse all calendar day. Verses come in a random order, and every
 * verse is shown once before any repeats; each new pass through the list is
 * reshuffled. The order depends only on the date and list length, so it
 * needs no stored state.
 */
function pickForDate<T>(verses: T[], date: Date): T {
  const count = verses.length;
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / (24 * 60 * 60 * 1000),
  );
  const cycle = Math.floor(dayNumber / count);
  const order = shuffledOrder(count, cycle);
  if (cycle > 0 && count > 1) {
    // Don't open a new pass with the verse that closed the last one.
    const previousLast = shuffledOrder(count, cycle - 1)[count - 1];
    if (order[0] === previousLast) [order[0], order[1]] = [order[1], order[0]];
  }
  return verses[order[dayNumber % count]];
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
 * verses; the service worker precaches it so it also works offline.
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
        return { ...pickForDate(file.verses, new Date()), translation: file.translation };
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
