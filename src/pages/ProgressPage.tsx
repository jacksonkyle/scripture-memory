import { useAllProgress, useAllReviews, useScriptures } from "../hooks/useLiveData";
import {
  averageRecallScore,
  computeStreak,
  computeUpcomingLoad,
  reviewsThisWeek,
  statusCounts,
} from "../services/stats";

export function ProgressPage() {
  const scriptures = useScriptures();
  const progress = useAllProgress();
  const reviews = useAllReviews();

  const counts = statusCounts(progress);
  const upcoming = computeUpcomingLoad(progress);
  const streak = computeStreak(reviews);
  const weeklyReviews = reviewsThisWeek(reviews);
  const avgRecall = averageRecallScore(reviews);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:pb-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Scripture Progress</h1>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Total Scriptures" value={scriptures.length} />
        <Stat label="Mastered" value={counts.mastered} accent="text-emerald-700 dark:text-emerald-400" />
        <Stat label="Learning" value={counts.learning} accent="text-amber-700 dark:text-amber-400" />
        <Stat label="Reviewing" value={counts.reviewing} accent="text-blue-700 dark:text-blue-400" />
        <Stat label="Reviews This Week" value={weeklyReviews} />
        <Stat label="Average Recall" value={`${avgRecall}%`} />
        <Stat label="Current Streak" value={`${streak}d`} />
      </dl>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Upcoming Review Load
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Today" value={upcoming.today} />
          <Stat label="Tomorrow" value={upcoming.tomorrow} />
          <Stat label="Next 7 Days" value={upcoming.next7Days} />
          <Stat label="Next 30 Days" value={upcoming.next30Days} />
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`mt-1 text-xl font-bold ${accent ?? "text-slate-800 dark:text-slate-200"}`}>{value}</dd>
    </div>
  );
}
