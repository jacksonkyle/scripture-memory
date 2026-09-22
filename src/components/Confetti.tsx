import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];

interface ConfettiProps {
  /** Change this value to fire a fresh burst. */
  fireKey: number | string;
  pieces?: number;
}

/** Cheap DOM confetti: a burst of absolutely-positioned chips that fall once and unmount. */
export function Confetti({ fireKey, pieces = 44 }: ConfettiProps) {
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 3200);
    return () => window.clearTimeout(timer);
  }, [fireKey]);

  const chips = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        drift: Math.round((Math.random() - 0.5) * 220),
        spin: Math.round(360 + Math.random() * 900),
        delay: Math.round(Math.random() * 500),
        duration: Math.round(2000 + Math.random() * 1400),
        size: 6 + Math.round(Math.random() * 7),
        color: COLORS[i % COLORS.length],
        round: Math.random() > 0.55,
      })),
    [fireKey, pieces],
  );

  if (reducedMotion || !visible) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="sm-confetti-piece absolute top-0"
          style={
            {
              left: `${chip.left}%`,
              width: chip.size,
              height: chip.round ? chip.size : chip.size * 1.8,
              backgroundColor: chip.color,
              borderRadius: chip.round ? "9999px" : "2px",
              "--sm-drift": `${chip.drift}px`,
              "--sm-spin": `${chip.spin}deg`,
              "--sm-delay": `${chip.delay}ms`,
              "--sm-duration": `${chip.duration}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
