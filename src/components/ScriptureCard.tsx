import { Link } from "react-router-dom";
import type { MemorizationProgress, Scripture } from "../models";
import { StatusBadge } from "./StatusBadge";
import { formatRelativeDate } from "../utils/date";

interface ScriptureCardProps {
  scripture: Scripture;
  progress?: MemorizationProgress;
}

export function ScriptureCard({ scripture, progress }: ScriptureCardProps) {
  return (
    <Link
      to={`/library/${scripture.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:shadow-md dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{scripture.reference}</h3>
        {progress && <StatusBadge status={progress.status} />}
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{scripture.text}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-500">
        <span>{scripture.translation}</span>
        {progress?.nextReviewDate && (
          <span>Next review: {formatRelativeDate(progress.nextReviewDate)}</span>
        )}
      </div>
    </Link>
  );
}
