interface PhaseStepperProps {
  steps: number;
  currentIndex: number;
  ariaLabel?: string;
}

/** Level-style stepper across the memorization phases, so progress inside one verse is visible. */
export function PhaseStepper({ steps, currentIndex, ariaLabel }: PhaseStepperProps) {
  return (
    <div
      className="flex items-center gap-1.5"
      aria-label={ariaLabel ?? `Step ${currentIndex + 1} of ${steps}`}
    >
      {Array.from({ length: steps }, (_, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <div key={index} className="relative h-1.5 flex-1">
            <div
              className={`h-full w-full rounded-full transition-colors duration-500 ${
                done
                  ? "bg-emerald-500"
                  : active
                    ? "bg-blue-600 dark:bg-blue-500"
                    : "bg-slate-200 dark:bg-slate-800"
              }`}
            />
            {active && (
              <span
                className="sm-ping-ring absolute inset-0 rounded-full bg-blue-500/50"
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface PhaseBadgeProps {
  icon: string;
  label: string;
}

/** The current phase, named, so the learner knows which recall muscle is being worked. */
export function PhaseBadge({ icon, label }: PhaseBadgeProps) {
  return (
    <span className="sm-pop-in inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
