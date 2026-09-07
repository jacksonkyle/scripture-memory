import { HashRouter, Route, Routes } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { useThemeEffect } from "./hooks/useThemeEffect";
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

export function App() {
  useThemeEffect();
  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-50 pb-16 sm:pb-0 dark:bg-slate-950">
        <Navigation />
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
    </HashRouter>
  );
}
