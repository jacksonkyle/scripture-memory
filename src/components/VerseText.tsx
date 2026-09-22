import { useEffect, useState } from "react";
import type { VerseToken } from "../services/memorization";
import { BUZZ_TAP, buzz } from "../utils/haptics";

interface VerseTextProps {
  tokens: VerseToken[];
  /** Called the first time each hidden word is peeked at. */
  onPeek?: () => void;
}

/**
 * Renders a verse word by word so each one can animate in, and so hidden words
 * are tappable: peeking at a single word beats bailing out to the full text.
 */
export function VerseText({ tokens, onPeek }: VerseTextProps) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  useEffect(() => {
    setRevealed(new Set());
  }, [tokens]);

  function peek(index: number) {
    if (revealed.has(index)) return;
    buzz(BUZZ_TAP);
    setRevealed((prev) => new Set(prev).add(index));
    onPeek?.();
  }

  return (
    <p className="mt-3 whitespace-pre-wrap text-xl leading-relaxed text-slate-800 dark:text-slate-200">
      {tokens.map((token, index) => {
        const style = { "--i": index } as React.CSSProperties;
        if (!token.concealed) {
          return (
            <span key={index} className="sm-word-in inline-block" style={style}>
              {token.word}
              {token.trailing}
            </span>
          );
        }
        if (revealed.has(index)) {
          return (
            <span key={index} className="inline-block">
              <span className="sm-pop-in inline-block rounded-md bg-blue-100 px-1 font-semibold text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                {token.word}
              </span>
              {token.trailing}
            </span>
          );
        }
        return (
          <span key={index} className="inline-block">
            <button
              type="button"
              onClick={() => peek(index)}
              aria-label={`Reveal hidden word ${index + 1}`}
              className="sm-blank sm-tap rounded-md bg-slate-100 px-1 font-mono text-slate-400 hover:bg-blue-100 hover:text-blue-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-blue-900/50 dark:hover:text-blue-300"
              style={style}
            >
              {token.masked}
            </button>
            {token.trailing}
          </span>
        );
      })}
    </p>
  );
}
