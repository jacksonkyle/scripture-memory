import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/database";
import { useAllProgress, useAllReviews, useScriptures, useSettings } from "../hooks/useLiveData";
import { addScripture } from "../db/repositories/scriptureRepository";
import { computeStreak, reviewsToday } from "../services/stats";
import { verseForDate } from "../data/dailyVerses";
import { parseReference } from "../utils/reference";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function TodayPage() {
  // Undefined until the database answers, so returning users don't see the first-run screen flash.
  const scriptureCount = useLiveQuery(() => db.scriptures.count());
  const scriptures = useScriptures();
  const progress = useAllProgress();
  const reviews = useAllReviews();
  const settings = useSettings();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  const verse = verseForDate();
  const verseInLibrary = scriptures.some((s) => s.reference === verse.reference);

  // Mirrors ReviewPage's queue: everything due, with new verses capped at the daily limit.
  const due = progress.filter(
    (p) => p.status !== "paused" && new Date(p.nextReviewDate) <= new Date(),
  );
  const dueNew = due.filter((p) => p.status === "new").length;
  const dueToday = due.length - dueNew + Math.min(dueNew, settings.dailyNewScriptures);
  const streak = computeStreak(reviews);
  const doneToday = reviewsToday(reviews);

  const recentlyMastered = progress
    .filter((p) => p.status === "mastered")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3)
    .map((p) => scriptures.find((s) => s.id === p.scriptureId))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  async function memorizeVerse() {
    setAdding(true);
    try {
      const created = await addScripture({
        reference: verse.reference,
        ...parseReference(verse.reference),
        text: verse.text,
        translation: "KJV",
        collectionIds: [],
      });
      navigate(`/review?scriptureId=${created.id}`);
    } finally {
      setAdding(false);
    }
  }

  const summary = [
    streak > 0 && `🔥 ${streak}-day streak`,
    doneToday > 0 && `${doneToday} reviewed today`,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:pb-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{greeting()}</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">Take a few minutes in the Word today.</p>

      <figure className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
          Today's Word
        </p>
        <blockquote className="mt-2 font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200">
          “{verse.text}”
        </blockquote>
        <figcaption className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          {verse.reference} · KJV
        </figcaption>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{verse.encouragement}</p>
        {scriptureCount !== undefined && !verseInLibrary && (
          <button
            type="button"
            onClick={memorizeVerse}
            disabled={adding}
            className={`mt-4 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
              scriptureCount === 0
                ? "w-full bg-blue-700 py-3 text-base text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {adding ? "Adding…" : "Memorize this verse"}
          </button>
        )}
      </figure>

      {scriptureCount === 0 && (
        <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
          Or{" "}
          <Link to="/library/new" className="font-medium text-blue-700 underline dark:text-blue-400">
            add a verse of your own
          </Link>
          .
        </p>
      )}

      {scriptureCount !== undefined && scriptureCount > 0 && (
        <>
          {dueToday > 0 ? (
            <Link
              to="/review"
              className="mt-6 block rounded-xl bg-blue-700 px-6 py-4 text-center text-lg font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Start Today's Review
              <span className="block text-sm font-normal text-blue-100">
                {dueToday} {dueToday === 1 ? "verse" : "verses"} waiting
              </span>
            </Link>
          ) : (
            <div className="mt-6 rounded-xl bg-emerald-50 px-6 py-4 text-center dark:bg-emerald-950/30">
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">You're all caught up for today.</p>
              <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
                Come back tomorrow, or{" "}
                <Link to="/library/new" className="underline">
                  add a new verse
                </Link>
                .
              </p>
            </div>
          )}

          {summary.length > 0 && (
            <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">{summary.join(" · ")}</p>
          )}

          {recentlyMastered.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Recently Mastered
              </h2>
              <ul className="mt-2 space-y-2">
                {recentlyMastered.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                  >
                    {s.reference}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
