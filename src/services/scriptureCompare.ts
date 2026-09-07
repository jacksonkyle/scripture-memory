export interface CompareResult {
  score: number;
  missingWords: string[];
  incorrectWords: string[];
  extraWords: string[];
  hasOrderIssue: boolean;
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9']/g, "");
}

function splitWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

/** Longest common subsequence of normalized words, used to detect matched/aligned words. */
function longestCommonSubsequence(a: string[], b: string[]): number[][] {
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
  }
  return table;
}

export function compareRecall(expected: string, actual: string): CompareResult {
  const expectedWords = splitWords(expected);
  const actualWords = splitWords(actual);
  const expectedNorm = expectedWords.map(normalizeWord);
  const actualNorm = actualWords.map(normalizeWord);

  const table = longestCommonSubsequence(expectedNorm, actualNorm);

  let i = expectedNorm.length;
  let j = actualNorm.length;
  const matchedExpectedIndices = new Set<number>();
  const matchedActualIndices = new Set<number>();
  while (i > 0 && j > 0) {
    if (expectedNorm[i - 1] === actualNorm[j - 1]) {
      matchedExpectedIndices.add(i - 1);
      matchedActualIndices.add(j - 1);
      i--;
      j--;
    } else if (table[i - 1][j] >= table[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  const missingWords = expectedWords.filter((_, idx) => !matchedExpectedIndices.has(idx));
  const extraWords = actualWords.filter((_, idx) => !matchedActualIndices.has(idx));

  // Words present on both sides but never aligned by the LCS are treated as
  // substitutions ("incorrect") rather than double-counted as missing+extra,
  // when their counts roughly line up positionally.
  const incorrectWords: string[] = [];
  const remainingMissing: string[] = [];
  const remainingExtra = [...extraWords];
  for (const word of missingWords) {
    const swapIndex = remainingExtra.findIndex(
      (candidate) => normalizeWord(candidate) !== normalizeWord(word),
    );
    if (swapIndex !== -1 && remainingExtra.length >= remainingMissing.length + 1) {
      incorrectWords.push(`${word} → ${remainingExtra[swapIndex]}`);
      remainingExtra.splice(swapIndex, 1);
    } else {
      remainingMissing.push(word);
    }
  }

  const matchedCount = matchedExpectedIndices.size;
  const totalExpected = expectedWords.length || 1;
  const rawScore = (matchedCount / totalExpected) * 100;
  const penalty = (incorrectWords.length * 0.5) / totalExpected * 100;
  const score = Math.max(0, Math.round(rawScore - penalty));

  const hasOrderIssue = detectOrderIssue(expectedNorm, actualNorm, matchedExpectedIndices);

  return {
    score,
    missingWords: remainingMissing,
    incorrectWords,
    extraWords: remainingExtra,
    hasOrderIssue,
  };
}

function detectOrderIssue(
  expectedNorm: string[],
  actualNorm: string[],
  matchedExpectedIndices: Set<number>,
): boolean {
  const expectedMatchedWords = expectedNorm.filter((_, idx) => matchedExpectedIndices.has(idx));
  const actualSet = new Set(actualNorm);
  const commonButUnordered = expectedMatchedWords.filter((w) => actualSet.has(w));
  // If every matched word appears in actual too but the matched sequence via
  // LCS is shorter than the raw multiset overlap, some words were reordered.
  const multisetOverlap = countMultisetOverlap(expectedNorm, actualNorm);
  return commonButUnordered.length < multisetOverlap;
}

function countMultisetOverlap(a: string[], b: string[]): number {
  const counts = new Map<string, number>();
  for (const word of a) counts.set(word, (counts.get(word) ?? 0) + 1);
  let overlap = 0;
  for (const word of b) {
    const remaining = counts.get(word) ?? 0;
    if (remaining > 0) {
      overlap++;
      counts.set(word, remaining - 1);
    }
  }
  return overlap;
}

export function scoreCategory(score: number): string {
  if (score >= 100) return "Perfect";
  if (score >= 95) return "Excellent";
  if (score >= 85) return "Good";
  if (score >= 70) return "Needs Review";
  return "Relearn";
}
