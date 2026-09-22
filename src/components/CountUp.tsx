import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface CountUpProps {
  value: number;
  durationMs?: number;
  suffix?: string;
  className?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Animates a number from 0 up to `value`, for score and session-summary reveals. */
export function CountUp({ value, durationMs = 900, suffix = "", className }: CountUpProps) {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(reducedMotion ? value : 0);
  const frameRef = useRef(0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setDisplay(Math.round(easeOutCubic(progress) * value));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, durationMs, reducedMotion]);

  return (
    <span className={className}>
      {display}
      {suffix}
    </span>
  );
}
