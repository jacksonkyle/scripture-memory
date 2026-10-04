import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { useThemeEffect } from "./hooks/useThemeEffect";
import { useMotionEffect } from "./hooks/useReducedMotion";
import {
  TodayPage,
  LibraryPage,
  AddScripturePage,
  ScriptureDetailPage,
  ReviewPage,
  CollectionsPage,
  CollectionDetailPage,
  ProgressPage,
  SettingsPage,
} from "./pages";

function AppShell() {
  // Review is a focused flow with its own Exit link, so the tab bar is hidden.
  const showNav = useLocation().pathname !== "/review";
  return (
    <div
      className={`min-h-screen bg-slate-50 dark:bg-slate-950 ${
        showNav ? "pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0" : ""
      }`}
    >
      {showNav && <Navigation />}
      <main>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/library/new" element={<AddScripturePage />} />
          <Route path="/library/:id" element={<ScriptureDetailPage />} />
          <Route path="/library/:id/edit" element={<AddScripturePage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/collections/:id" element={<CollectionDetailPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  useThemeEffect();
  useMotionEffect();
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}
