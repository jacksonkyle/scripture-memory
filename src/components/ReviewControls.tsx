import { useEffect } from "react";
import type { ReviewRating } from "../models";
import { BUZZ_TAP, buzz } from "../utils/haptics";

interface ReviewControlsProps {
  onRate: (rating: ReviewRating) => void;
  disabled?: boolean;
  /** Rating derived from the score, highlighted as the default choice. */
  suggested?: ReviewRating;
}

const RATINGS: { rating: ReviewRating; label: string; icon: string; classes: string }[] = [
  {
    rating: "again",
    label: "Again",
    icon: "🔁",
    classes:
      "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60",
  },
  {
    rating: "hard",
    label: "Hard",
    icon: "😤",
    classes:
      "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60",
  },
  {
    rating: "good",
    label: "Good",
    icon: "👍",
    classes:
      "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60",
  },
  {
    rating: "easy",
    label: "Easy",
    icon: "⚡",
    classes:
      "bg-sky-100 text-sky-800 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:hover:bg-sky-900/60",
  },
];

export function ReviewControls({ onRate, disabled, suggested }: ReviewControlsProps) {
  useEffect(() => {
    if (disabled) return;
    function onKeyDown(event: KeyboardEvent) {
      const index = Number(event.key) - 1;
      if (Number.isNaN(index) || index < 0 || index >= RATINGS.length) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) return;
      event.preventDefault();
      buzz(BUZZ_TAP);
      onRate(RATINGS[index].rating);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, onRate]);

  return (
    <div>
      <p className="mb-2 text-center text-sm font-medium text-slate-600 dark:text-slate-400">
        How well did you remember?
      </p>
      <div className="grid grid-cols-4 gap-2">
        {RATINGS.map(({ rating, label, icon, classes }, index) => (
          <button
            key={rating}
            type="button"
            disabled={disabled}
            onClick={() => {
              buzz(BUZZ_TAP);
              onRate(rating);
            }}
            style={{ "--i": index } as React.CSSProperties}
            className={`sm-stagger-pop sm-tap flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-sm font-semibold disabled:opacity-50 ${classes} ${
              suggested === rating ? "ring-2 ring-slate-900/30 dark:ring-white/40" : ""
            }`}
          >
            <span className="text-lg" aria-hidden="true">
              {icon}
            </span>
            {label}
            <span className="text-[10px] font-normal opacity-60" aria-hidden="true">
              {index + 1}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
