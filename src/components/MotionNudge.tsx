import { useSettings } from "../hooks/useLiveData";
import { useSystemReducedMotion } from "../hooks/useReducedMotion";
import { updateSettings } from "../db/repositories/settingsRepository";

/**
 * Offers the motion override where the missing animation is actually noticed.
 * Shown only when the device asked for reduced motion and the user has not
 * yet made a choice either way.
 */
export function MotionNudge() {
  const settings = useSettings();
  const systemReducedMotion = useSystemReducedMotion();
  const preference = settings.motion ?? "system";

  if (!systemReducedMotion || preference !== "system") return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
      <span>Animations are off because this device asks for reduced motion.</span>
      <button
        type="button"
        onClick={() => updateSettings({ motion: "full" })}
        className="rounded-lg bg-amber-200 px-3 py-1 font-semibold text-amber-900 hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700"
      >
        Turn them on
      </button>
    </div>
  );
}
