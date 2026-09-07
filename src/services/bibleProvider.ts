/**
 * Automatic Scripture lookup, kept behind the same BibleProvider shape the
 * app's design calls for so a licensed/paid provider can be swapped in later
 * without touching callers. Only public-domain translations are looked up
 * automatically — copyrighted translations (ESV, NIV, NASB, CSB, NKJV) still
 * require manual entry, since this app never assumes redistribution rights
 * it doesn't have.
 */

export interface ScriptureText {
  /** Canonical reference as returned by the provider, e.g. "John 3:16". */
  reference: string;
  text: string;
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
