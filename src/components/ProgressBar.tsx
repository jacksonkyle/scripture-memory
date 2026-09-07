interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  colorClassName?: string;
}

export function ProgressBar({ value, max = 100, label, colorClassName }: ProgressBarProps) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>{label}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
      >
        <div
          className={`h-full rounded-full transition-all ${colorClassName ?? "bg-blue-600 dark:bg-blue-500"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
