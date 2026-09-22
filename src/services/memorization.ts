/**
 * Stage 1 = Read, Stage 2 = Hide Words, Stage 3 = First-Letter Hints,
 * Stage 4 = Reference Only, Stage 5 = Typed Recall.
 */
export const TOTAL_MEMORIZATION_STAGES = 5;

export const HIDE_WORD_PROGRESSION = [20, 40, 60, 80] as const;

interface Token {
  word: string;
  trailing: string;
}

/** A verse word ready for rendering: the real word, what to show while it is concealed, and the gap after it. */
export interface VerseToken {
  word: string;
  masked: string;
  trailing: string;
  concealed: boolean;
}

function tokenize(text: string): Token[] {
  const matches = text.match(/\S+\s*/g) ?? [];
  return matches.map((chunk) => {
    const trailing = chunk.match(/\s*$/)?.[0] ?? "";
    return { word: chunk.slice(0, chunk.length - trailing.length), trailing };
  });
}

/** Deterministically picks which word indices to hide, stable across renders for the same text+percentage. */
function pickHiddenIndices(count: number, percentage: number): Set<number> {
  const hideCount = Math.round((percentage / 100) * count);
  const indices = Array.from({ length: count }, (_, i) => i);
  // Deterministic pseudo-shuffle using a simple LCG seeded by count, so the
  // same verse+percentage always hides the same words within a session.
  let seed = count * 2654435761 + percentage;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return new Set(indices.slice(0, hideCount));
}

export function hideWordTokens(text: string, percentage: number): VerseToken[] {
  const tokens = tokenize(text);
  const hidden = pickHiddenIndices(tokens.length, percentage);
  return tokens.map((token, i) => ({
    word: token.word,
    masked: maskWord(token.word),
    trailing: token.trailing,
    concealed: hidden.has(i),
  }));
}

export function firstLetterTokens(text: string): VerseToken[] {
  return tokenize(text).map((token) => ({
    word: token.word,
    masked: hintWord(token.word),
    trailing: token.trailing,
    concealed: true,
  }));
}

export function readingTokens(text: string): VerseToken[] {
  return tokenize(text).map((token) => ({
    word: token.word,
    masked: token.word,
    trailing: token.trailing,
    concealed: false,
  }));
}

export function hideWords(text: string, percentage: number): string {
  return renderTokens(hideWordTokens(text, percentage));
}

export function firstLetterHints(text: string): string {
  return renderTokens(firstLetterTokens(text));
}

function renderTokens(tokens: VerseToken[]): string {
  return tokens
    .map((token) => (token.concealed ? token.masked : token.word) + token.trailing)
    .join("");
}

function maskWord(word: string): string {
  const lettersOnly = word.replace(/[^A-Za-z]/g, "");
  if (lettersOnly.length === 0) return word;
  return word.replace(/[A-Za-z]/g, "_");
}

function hintWord(word: string): string {
  return word.replace(/^([A-Za-z])([A-Za-z]*)/, (_m, first, rest) => {
    return first + rest.replace(/[A-Za-z]/g, "_");
  });
}
