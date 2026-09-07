import type { MemorizationStatus } from "../models";

const STYLES: Record<MemorizationStatus, string> = {
  new: "bg-slate-100 text-slate-700",
  learning: "bg-amber-100 text-amber-800",
  reviewing: "bg-blue-100 text-blue-800",
  mastered: "bg-emerald-100 text-emerald-800",
  paused: "bg-gray-200 text-gray-600",
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
