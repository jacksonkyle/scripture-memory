import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/database";
import { useAllProgress, useAllReviews, useScriptures, useSettings } from "../hooks/useLiveData";
import { useDailyVerse } from "../hooks/useDailyVerse";
import { addScripture } from "../db/repositories/scriptureRepository";
import { computeStreak, reviewsToday } from "../services/stats";
import { parseReference } from "../utils/reference";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

const HOW_IT_WORKS = [
  { title: "Read it", detail: "Read the verse through a few times." },
  { title: "Fill the gaps", detail: "Words fade away until you can say it from memory." },
  { title: "Keep it", detail: "Short daily reviews, spaced out so it sticks." },
];

const primaryButton =
  "sm-tap block w-full rounded-xl bg-white px-6 py-4 text-center text-lg font-semibold text-blue-900 shadow-lg shadow-blue-950/30 transition-colors hover:bg-blue-50 disabled:opacity-70";

export function TodayPage() {
  // Undefined until the database answers, so returning users don't see the first-run screen flash.
  const scriptureCount = useLiveQuery(() => db.scriptures.count());
  const scriptures = useScriptures();
  const progress = useAllProgress();
  const reviews = useAllReviews();
  const settings = useSettings();
  const verse = useDailyVerse();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  const isNewUser = scriptureCount === 0;
  const isReturning = scriptureCount !== undefined && scriptureCount > 0;
  const canMemorizeVerse =
    verse !== undefined && !scriptures.some((s) => s.reference === verse.reference);

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
    if (!verse) return;
    setAdding(true);
    try {
      const created = await addScripture({
        reference: verse.reference,
        ...parseReference(verse.reference),
        text: verse.text,
        translation: verse.translation,
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

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="pb-24 sm:pb-8">
      <section className="relative overflow-hidden bg-linear-to-b from-blue-900 to-indigo-950 px-4 pb-10 pt-[calc(2.5rem+env(safe-area-inset-top))] text-white sm:rounded-b-3xl dark:from-blue-950 dark:to-slate-950">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-amber-200/15 blur-3xl"
        />
        <div className="relative mx-auto max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">{today}</p>
          <h1 className="mt-1 text-2xl font-bold">{greeting()}</h1>

          <div className="min-h-56">
            {verse && (
              <figure key={verse.reference} className="sm-card-in mt-8">
                <blockquote
                  className={`font-serif leading-snug text-balance ${
                    verse.text.length > 160 ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
                  }`}
                >
                  “{verse.text}”
                </blockquote>
                <figcaption className="mt-4 text-sm font-semibold uppercase tracking-widest text-amber-300">
                  {verse.reference} <span className="font-normal text-blue-200/80">· {verse.translation}</span>
                </figcaption>
                <p className="mt-6 text-blue-100">{verse.encouragement}</p>
              </figure>
            )}
          </div>

          <div className="mt-8">
            {isNewUser && (
              <>
                <button type="button" onClick={memorizeVerse} disabled={adding || !verse} className={primaryButton}>
                  {adding ? "Adding…" : "Memorize this verse"}
                </button>
                <p className="mt-4 text-center text-sm text-blue-100">
                  Or{" "}
                  <Link to="/library/new" className="font-medium text-white underline">
                    add a verse of your own
                  </Link>
                </p>
              </>
            )}

            {isReturning && dueToday > 0 && (
              <>
                <Link to="/review" className={primaryButton}>
                  Start Today's Review
                  <span className="block text-sm font-normal text-blue-700">
                    {dueToday} {dueToday === 1 ? "verse" : "verses"} waiting
                  </span>
                </Link>
                {canMemorizeVerse && (
                  <button
                    type="button"
                    onClick={memorizeVerse}
                    disabled={adding}
                    className="mt-3 block w-full text-center text-sm font-medium text-blue-100 underline hover:text-white"
                  >
                    {adding ? "Adding…" : "Memorize today's verse too"}
                  </button>
                )}
              </>
            )}

            {isReturning && dueToday === 0 && (
              <div className="rounded-xl bg-white/10 p-5 text-center ring-1 ring-white/15">
                <p className="font-semibold">You're all caught up for today.</p>
                {canMemorizeVerse ? (
                  <>
                    <p className="mt-1 text-sm text-blue-100">Ready for something new?</p>
                    <button type="button" onClick={memorizeVerse} disabled={adding} className={`${primaryButton} mt-4`}>
                      {adding ? "Adding…" : "Memorize today's verse"}
                    </button>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-blue-100">
                    Come back tomorrow, or{" "}
                    <Link to="/library/new" className="text-white underline">
                      add a new verse
                    </Link>
                    .
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="px-4">
        <div className="mx-auto max-w-2xl">
          {isNewUser && (
            <section className="mt-8" aria-labelledby="how-it-works">
              <h2
                id="how-it-works"
                className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                How it works
              </h2>
              <ol className="mt-3 space-y-3">
                {HOW_IT_WORKS.map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {index + 1}
                    </span>
                    <p className="text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{step.title}.</span>{" "}
                      {step.detail}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {isReturning && summary.length > 0 && (
            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">{summary.join(" · ")}</p>
          )}

          {isReturning && recentlyMastered.length > 0 && (
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
        </div>
      </div>
    </div>
  );
}
