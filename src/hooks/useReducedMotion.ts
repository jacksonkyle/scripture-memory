import { useEffect, useState } from "react";
import { useSettings } from "./useLiveData";

const QUERY = "(prefers-reduced-motion: reduce)";

/** What the OS is asking for, ignoring the user's in-app override. */
export function useSystemReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const onChange = () => setReduced(media.matches);
    setReduced(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * The resolved answer, settings override included. CSS already suppresses the
 * declarative animations; this is for the JS-driven ones (confetti, count-ups).
 */
export function useReducedMotion(): boolean {
  const settings = useSettings();
  const systemReduced = useSystemReducedMotion();
  const preference = settings.motion ?? "system";

  if (preference === "full") return false;
  if (preference === "off") return true;
  return systemReduced;
}

/** Mirrors the resolved preference onto <html> so the stylesheet can act on it. */
export function useMotionEffect(): void {
  const settings = useSettings();
  const preference = settings.motion ?? "system";

  useEffect(() => {
    const root = document.documentElement;
    if (preference === "system") {
      root.removeAttribute("data-motion");
    } else {
      root.setAttribute("data-motion", preference);
    }
  }, [preference]);
}
