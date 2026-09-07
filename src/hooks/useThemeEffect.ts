import { useEffect } from "react";
import { useSettings } from "./useLiveData";

const LIGHT_THEME_COLOR = "#1e3a8a";
const DARK_THEME_COLOR = "#0f172a";

function setResolvedTheme(isDark: boolean): void {
  document.documentElement.classList.toggle("dark", isDark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
}

/** Applies the user's theme preference (light/dark/system) to the document root as a `dark` class. */
export function useThemeEffect(): void {
  const settings = useSettings();

  useEffect(() => {
    if (settings.theme === "dark") {
      setResolvedTheme(true);
      return;
    }
    if (settings.theme === "light") {
      setResolvedTheme(false);
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setResolvedTheme(media.matches);

    const listener = (event: MediaQueryListEvent) => setResolvedTheme(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [settings.theme]);
}
