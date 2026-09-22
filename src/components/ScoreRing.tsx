import { useEffect, useState } from "react";
import { CountUp } from "./CountUp";
import { useReducedMotion } from "../hooks/useReducedMotion";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ScoreRingProps {
  score: number;
  label: string;
}

function ringColor(score: number): string {
  if (score >= 95) return "#10b981";
  if (score >= 85) return "#3b82f6";
  if (score >= 70) return "#f59e0b";
  return "#ef4444";
}

/** Circular score meter that sweeps up to the score as the number counts up beside it. */
export function ScoreRing({ score, label }: ScoreRingProps) {
  const reducedMotion = useReducedMotion();
  const [swept, setSwept] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setSwept(true);
      return;
    }
    const frame = requestAnimationFrame(() => setSwept(true));
    return () => cancelAnimationFrame(frame);
  }, [score, reducedMotion]);

  const filled = swept ? Math.max(0, Math.min(100, score)) : 0;
  const color = ringColor(score);

  return (
    <div className="relative mx-auto h-36 w-36">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={RADIUS}
          fill="none"
          strokeWidth="10"
          className="stroke-slate-200 dark:stroke-slate-800"
        />
        <circle
          cx="64"
          cy="64"
          r={RADIUS}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE - (filled / 100) * CIRCUMFERENCE}
          style={{ transition: reducedMotion ? undefined : "stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <CountUp
          value={score}
          suffix="%"
          className="text-4xl font-bold tabular-nums text-slate-900 dark:text-slate-100"
        />
        <span className="mt-0.5 text-xs font-semibold uppercase tracking-wide" style={{ color }}>
          {label}
        </span>
      </div>
    </div>
  );
}
