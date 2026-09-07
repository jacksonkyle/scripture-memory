/**
 * Automatic Scripture lookup, kept behind the same BibleProvider shape the
 * app's design calls for so a licensed/paid provider can be swapped in later
 * without touching callers. Two providers are available:
 *
 *  - FreeBibleProvider: bible-api.com, no key required, KJV/WEB only
 *    (public domain).
 *  - ApiBibleProvider: api.bible (api.scripture.api.bible), requires a
 *    user-supplied API key. Whatever translations that key is authorized
 *    for are fetched dynamically via listApiBibles() — never assumed.
 *
 * Neither provider's key or output is ever bundled into the app itself: a
 * FreeBibleProvider call needs no key, and an ApiBibleProvider key comes
 * from the user's own locally-stored settings, entered by them at runtime.
 */
import { parseReference } from "../utils/reference";
import { bookNameToCode } from "../utils/bibleBookCodes";

export interface ScriptureText {
  /** Canonical reference as returned by the provider, e.g. "John 3:16". */
  reference: string;
  text: string;
  /** Attribution text the provider requires be shown alongside the passage, if any. */
  copyright?: string;
}

export interface BibleProvider {
  getPassage(translation: string, reference: string): Promise<ScriptureText>;
}

export const LOOKUP_TRANSLATIONS = ["KJV", "WEB"] as const;
export type LookupTranslation = (typeof LOOKUP_TRANSLATIONS)[number];

export function isLookupTranslation(translation: string): translation is LookupTranslation {
  return (LOOKUP_TRANSLATIONS as readonly string[]).includes(translation);
}

const API_TRANSLATION_CODE: Record<LookupTranslation, string> = {
  KJV: "kjv",
  WEB: "web",
};

interface BibleApiVerse {
  text: string;
}

interface BibleApiResponse {
  reference?: string;
  text?: string;
  verses?: BibleApiVerse[];
  error?: string;
}

function cleanPassageText(raw: string): string {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Public-domain Scripture lookup via bible-api.com (no key required, KJV/WEB only). */
export class FreeBibleProvider implements BibleProvider {
  async getPassage(translation: string, reference: string): Promise<ScriptureText> {
    if (!isLookupTranslation(translation)) {
      throw new Error(
        `Automatic lookup only supports public-domain translations (${LOOKUP_TRANSLATIONS.join(", ")}).`,
      );
    }
    const trimmedReference = reference.trim();
    if (!trimmedReference) {
      throw new Error("Enter a reference first, e.g. \"John 3:16\" or \"Romans 8:1-4\".");
    }

    const url = `https://bible-api.com/${encodeURIComponent(trimmedReference)}?translation=${API_TRANSLATION_CODE[translation]}`;

    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    } catch {
      throw new Error(
        "Couldn't reach the Scripture lookup service. Check your connection, or type the text in manually.",
      );
    }

    let data: BibleApiResponse;
    try {
      data = await response.json();
    } catch {
      throw new Error("The lookup service returned an unexpected response. Please try again.");
    }

    if (!response.ok || data.error) {
      throw new Error(
        data.error ||
          `Couldn't find "${trimmedReference}". Check the format (e.g. "John 3:16" or "Romans 8:1-4").`,
      );
    }

    const text = data.text ?? data.verses?.map((v) => v.text).join("\n") ?? "";
    if (!text.trim()) {
      throw new Error(`Couldn't find "${trimmedReference}". Check the reference and try again.`);
    }

    return {
      reference: data.reference?.trim() || trimmedReference,
      text: cleanPassageText(text),
    };
  }
}

export const bibleProvider: BibleProvider = new FreeBibleProvider();

// ---------------------------------------------------------------------------
// api.bible (rest.api.bible / api.scripture.api.bible) — user-supplied key
// ---------------------------------------------------------------------------

const API_BIBLE_BASE_URL = "https://api.scripture.api.bible/v1";

export interface ApiBibleSummary {
  id: string;
  name: string;
  abbreviation: string;
}

function buildPassageId(reference: string): string {
  const parsed = parseReference(reference);
  if (!parsed.chapter || !parsed.startVerse) {
    throw new Error('Enter a full reference with chapter and verse, e.g. "John 3:16" or "Romans 8:1-4".');
  }
  const code = bookNameToCode(parsed.book);
  if (!code) {
    throw new Error(`Didn't recognize the book "${parsed.book}". Try a standard name like "John" or "1 Corinthians".`);
  }
  const start = `${code}.${parsed.chapter}.${parsed.startVerse}`;
  return parsed.endVerse ? `${start}-${code}.${parsed.chapter}.${parsed.endVerse}` : start;
}

async function apiBibleFetch<T>(path: string, apiKey: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BIBLE_BASE_URL}${path}`, {
      headers: { "api-key": apiKey },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error("Couldn't reach api.bible. Check your connection, or type the text in manually.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("That api.bible key was rejected. Double-check it under Settings.");
  }
  if (response.status === 404) {
    throw new Error("Couldn't find that passage in the selected translation.");
  }
  if (!response.ok) {
    throw new Error(`api.bible returned an error (status ${response.status}). Please try again.`);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("api.bible returned an unexpected response. Please try again.");
  }
}

/** Fetches the English Bibles available to this api.bible key. */
export async function listApiBibles(apiKey: string): Promise<ApiBibleSummary[]> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) throw new Error("Enter your api.bible key first.");

  const data = await apiBibleFetch<{
    data: { id: string; name: string; abbreviationLocal?: string; abbreviation?: string }[];
  }>("/bibles?language=eng", trimmedKey);

  return data.data
    .map((b) => ({
      id: b.id,
      name: b.name,
      abbreviation: b.abbreviationLocal || b.abbreviation || b.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Scripture lookup via api.bible using a user-supplied key. `translation` is the chosen bibleId. */
export class ApiBibleProvider implements BibleProvider {
  constructor(private apiKey: string) {}

  async getPassage(bibleId: string, reference: string): Promise<ScriptureText> {
    const trimmedKey = this.apiKey.trim();
    if (!trimmedKey) throw new Error("Enter your api.bible key under Settings first.");
    if (!bibleId) throw new Error("Choose a translation to look up.");

    const passageId = buildPassageId(reference);
    const data = await apiBibleFetch<{
      data: { reference: string; content: string; copyright?: string };
    }>(
      `/bibles/${encodeURIComponent(bibleId)}/passages/${encodeURIComponent(passageId)}` +
        "?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=false&include-verse-spans=false",
      trimmedKey,
    );

    const text = cleanPassageText(data.data.content ?? "");
    if (!text) {
      throw new Error("Couldn't find that passage in the selected translation.");
    }

    return {
      reference: data.data.reference?.trim() || reference.trim(),
      text,
      copyright: data.data.copyright?.trim() || undefined,
    };
  }
}
