export interface ParsedReference {
  book: string;
  chapter: number;
  startVerse: number;
  endVerse?: number;
}

const REFERENCE_PATTERN = /^(.+?)\s+(\d+):(\d+)(?:[-–](\d+))?$/;

/** Parses "Romans 8:1" or "Romans 8:1-4" into structured parts. Falls back to storing the raw reference as the book when it doesn't match the expected shape. */
export function parseReference(reference: string): ParsedReference {
  const match = reference.trim().match(REFERENCE_PATTERN);
  if (!match) {
    return { book: reference.trim(), chapter: 0, startVerse: 0 };
  }
  const [, book, chapter, startVerse, endVerse] = match;
  return {
    book: book.trim(),
    chapter: Number(chapter),
    startVerse: Number(startVerse),
    endVerse: endVerse ? Number(endVerse) : undefined,
  };
}
