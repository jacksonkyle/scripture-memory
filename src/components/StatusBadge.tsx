import type { MemorizationStatus } from "../models";

const STYLES: Record<MemorizationStatus, string> = {
  new: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  learning: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  reviewing: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  mastered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  paused: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const LABELS: Record<MemorizationStatus, string> = {
  new: "New",
  learning: "Learning",
  reviewing: "Reviewing",
  mastered: "Mastered",
  paused: "Paused",
};

export function StatusBadge({ status }: { status: MemorizationStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
