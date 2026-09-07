import { Link } from "react-router-dom";
import { useAllProgress, useAllReviews, useScriptures } from "../hooks/useLiveData";
import { computeStreak, reviewsToday, statusCounts } from "../services/stats";
import { formatRelativeDate } from "../utils/date";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function TodayPage() {
  const scriptures = useScriptures();
  const progress = useAllProgress();
  const reviews = useAllReviews();

  const counts = statusCounts(progress);
  const dueToday = progress.filter(
    (p) => p.status !== "paused" && new Date(p.nextReviewDate) <= new Date(),
  ).length;
  const streak = computeStreak(reviews);
  const doneToday = reviewsToday(reviews);

  const dueTomorrow = progress.filter((p) => {
    if (p.status === "paused") return false;
    const diffDays = Math.round(
      (new Date(p.nextReviewDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
        (24 * 60 * 60 * 1000),
    );
    return diffDays === 1;
  }).length;

  const recentlyMastered = progress
    .filter((p) => p.status === "mastered")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3)
    .map((p) => scriptures.find((s) => s.id === p.scriptureId))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const hasWork = dueToday > 0 || counts.new > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:pb-8">
      <h1 className="text-2xl font-bold text-slate-900">{greeting()}</h1>
      <p className="mt-1 text-slate-600">Today's Scripture Review</p>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Due Today" value={dueToday} accent="text-blue-700" />
        <StatTile label="Learning" value={counts.learning} accent="text-amber-700" />
        <StatTile label="New" value={counts.new} accent="text-slate-700" />
        <StatTile label="Mastered" value={counts.mastered} accent="text-emerald-700" />
      </dl>

      <Link
        to="/review"
        className={`mt-6 block rounded-xl px-6 py-4 text-center text-lg font-semibold text-white shadow-sm transition-colors ${
          hasWork ? "bg-blue-700 hover:bg-blue-800" : "bg-slate-300"
        }`}
        aria-disabled={!hasWork}
        onClick={(e) => {
          if (!hasWork) e.preventDefault();
        }}
      >
        {hasWork ? "Start Today's Review" : "Nothing Due — Great Job!"}
      </Link>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoCard label="Current Streak" value={`${streak} ${streak === 1 ? "day" : "days"}`} />
        <InfoCard label="Reviewed Today" value={String(doneToday)} />
        <InfoCard label="Due Tomorrow" value={String(dueTomorrow)} />
      </div>

      {recentlyMastered.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recently Mastered
          </h2>
          <ul className="mt-2 space-y-2">
            {recentlyMastered.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-900"
              >
                {s.reference}
              </li>
            ))}
          </ul>
        </section>
      )}

      {scriptures.length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 p-6 text-center">
          <p className="text-slate-600">
            You haven't added any Scripture yet. Start building your library.
          </p>
          <Link
            to="/library/new"
            className="mt-3 inline-block rounded-lg bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
          >
            Add Your First Scripture
          </Link>
        </div>
      )}

      <p className="mt-2 text-xs text-slate-400">
        {dueToday > 0 && `Next review window: ${formatRelativeDate(new Date().toISOString())}`}
      </p>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-1 text-2xl font-bold ${accent}`}>{value}</dd>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 text-center">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-800">{value}</p>
    </div>
  );
}
