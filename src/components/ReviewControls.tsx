import type { ReviewRating } from "../models";

interface ReviewControlsProps {
  onRate: (rating: ReviewRating) => void;
  disabled?: boolean;
}

const RATINGS: { rating: ReviewRating; label: string; classes: string }[] = [
  { rating: "again", label: "Again", classes: "bg-red-100 text-red-800 hover:bg-red-200" },
  { rating: "hard", label: "Hard", classes: "bg-amber-100 text-amber-800 hover:bg-amber-200" },
  { rating: "good", label: "Good", classes: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" },
  { rating: "easy", label: "Easy", classes: "bg-sky-100 text-sky-800 hover:bg-sky-200" },
];

export function ReviewControls({ onRate, disabled }: ReviewControlsProps) {
  return (
    <div>
      <p className="mb-2 text-center text-sm font-medium text-slate-600">
        How well did you remember?
      </p>
      <div className="grid grid-cols-4 gap-2">
        {RATINGS.map(({ rating, label, classes }) => (
          <button
            key={rating}
            type="button"
            disabled={disabled}
            onClick={() => onRate(rating)}
            className={`rounded-lg px-2 py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${classes}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
