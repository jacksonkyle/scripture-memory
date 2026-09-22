/** Short vibration feedback where the device supports it. Silently does nothing elsewhere. */
export function buzz(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw when vibration is blocked by user settings.
  }
}

export const BUZZ_TAP = 12;
export const BUZZ_CORRECT = [14, 40, 22];
export const BUZZ_MISS = [40, 30, 40];
