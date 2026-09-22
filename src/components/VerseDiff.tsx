import type { WordResult } from "../services/scriptureCompare";

interface VerseDiffProps {
  wordResults: WordResult[];
  extraWords: string[];
}

const STATUS_CLASSES: Record<WordResult["status"], string> = {
  correct: "text-slate-700 dark:text-slate-300",
  missing:
    "rounded-md bg-red-100 px-1 font-semibold text-red-800 line-through decoration-red-400 dark:bg-red-900/40 dark:text-red-300",
  incorrect:
    "rounded-md bg-amber-100 px-1 font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
};

/** The verse replayed in place, with each slip marked where it happened rather than listed below. */
export function VerseDiff({ wordResults, extraWords }: VerseDiffProps) {
  return (
    <div>
      <p className="whitespace-pre-wrap text-base leading-relaxed">
        {wordResults.map((result, index) => (
          <span key={index} className="inline-block">
            <span className={`sm-stagger-pop ${STATUS_CLASSES[result.status]}`} style={{ "--i": index } as React.CSSProperties}>
              {result.expected}
              {result.status === "incorrect" && result.actual && (
                <span className="ml-1 text-xs font-normal opacity-80">(you: {result.actual})</span>
              )}
            </span>{" "}
          </span>
        ))}
      </p>
      {extraWords.length > 0 && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Extra words: {extraWords.join(", ")}
        </p>
      )}
    </div>
  );
}
