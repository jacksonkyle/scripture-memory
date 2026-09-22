import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAllProgress, useScriptures, useSettings } from "../hooks/useLiveData";
import { ReviewItem } from "../components/ReviewItem";
import { Confetti } from "../components/Confetti";
import { MotionNudge } from "../components/MotionNudge";
import { CountUp } from "../components/CountUp";
import { applyReview } from "../services/reviewScheduler";
import type { ReviewMethod, ReviewRating } from "../models";

export function ReviewPage() {
  const [searchParams] = useSearchParams();
  const onlyScriptureId = searchParams.get("scriptureId");

  const scriptures = useScriptures();
  const progress = useAllProgress();
  const settings = useSettings();

  const queue = useMemo(() => {
    if (onlyScriptureId) {
      const p = progress.find((item) => item.scriptureId === onlyScriptureId);
      return p ? [p] : [];
    }
    const now = new Date();
    const due = progress.filter(
      (p) => p.status !== "paused" && new Date(p.nextReviewDate) <= now,
    );
    const dueNew = due.filter((p) => p.status === "new").slice(0, settings.dailyNewScriptures);
    const dueOthers = due.filter((p) => p.status !== "new");
    return [...dueOthers, ...dueNew];
  }, [onlyScriptureId, progress, settings.dailyNewScriptures]);

  const [position, setPosition] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [xpTotal, setXpTotal] = useState(0);

  const currentProgress = queue[position];
  const currentScripture = currentProgress
    ? scriptures.find((s) => s.id === currentProgress.scriptureId)
    : undefined;

  async function handleComplete(result: {
    method: ReviewMethod;
    score: number;
    rating: ReviewRating;
    advanceStage: boolean;
    xp: number;
  }) {
    if (!currentProgress) return;
    await applyReview({
      scriptureId: currentProgress.scriptureId,
      method: result.method,
      score: result.score,
      rating: result.rating,
      advanceStage: result.advanceStage,
    });
    const nextStreak = result.rating === "again" ? 0 : streak + 1;
    setStreak(nextStreak);
    setBestStreak((best) => Math.max(best, nextStreak));
    setScores((prev) => [...prev, result.score]);
    setXpTotal((xp) => xp + result.xp);
    setSessionCount((c) => c + 1);
    setPosition((p) => p + 1);
  }

  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 text-center sm:pb-8">
        <p className="sm-bob text-6xl" aria-hidden="true">
          🌤️
        </p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
          Nothing Due Right Now
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          You're all caught up. Come back later, or add more Scripture to memorize.
        </p>
        <Link
          to="/"
          className="sm-tap mt-6 inline-block rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          Back to Today
        </Link>
      </div>
    );
  }

  if (position >= queue.length) {
    const averageScore = scores.length
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0;
    return (
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-10 text-center sm:pb-8">
        <Confetti fireKey="session-complete" pieces={70} />
        <p className="sm-bob text-7xl" aria-hidden="true">
          🏆
        </p>
        <h1 className="sm-pop-in mt-4 text-3xl font-bold text-slate-900 dark:text-slate-100">
          Session Complete
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {sessionCount} {sessionCount === 1 ? "Scripture" : "Scriptures"} hidden in your heart today.
        </p>

        <dl className="mx-auto mt-8 grid max-w-md grid-cols-3 gap-3">
          <SummaryTile index={0} label="Reviewed" value={sessionCount} />
          <SummaryTile index={1} label="Avg Score" value={averageScore} suffix="%" />
          <SummaryTile index={2} label="Best Streak" value={bestStreak} suffix="x" />
        </dl>

        <p className="sm-pop-in mt-6 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          <CountUp value={xpTotal} durationMs={1200} /> XP earned
        </p>

        <Link
          to="/"
          className="sm-tap mt-8 inline-block rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          Back to Today
        </Link>
      </div>
    );
  }

  if (!currentScripture || !currentProgress) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:pb-8">
      <MotionNudge />

      <div className="mb-3 flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
        <span className="tabular-nums">
          {position + 1} of {queue.length}
        </span>
        <div className="flex items-center gap-3">
          {streak >= 2 && (
            <span
              key={streak}
              className="sm-pop-in inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300"
            >
              <span className="sm-flicker inline-block" aria-hidden="true">
                🔥
              </span>
              {streak} in a row
            </span>
          )}
          {xpTotal > 0 && (
            <span key={xpTotal} className="sm-pop-in text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {xpTotal} XP
            </span>
          )}
          <Link to="/" className="underline">
            Exit
          </Link>
        </div>
      </div>

      <div className="mb-5 flex gap-1" aria-hidden="true">
        {queue.map((item, index) => (
          <div
            key={item.id}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              index < position
                ? "bg-emerald-500"
                : index === position
                  ? "sm-shimmer bg-blue-600 dark:bg-blue-500"
                  : "bg-slate-200 dark:bg-slate-800"
            }`}
          />
        ))}
      </div>

      <ReviewItem
        key={currentProgress.id}
        scripture={currentScripture}
        progress={currentProgress}
        speechEnabled={settings.enableSpeechRecognition}
        streak={streak}
        onComplete={handleComplete}
      />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  suffix,
  index,
}: {
  label: string;
  value: number;
  suffix?: string;
  index: number;
}) {
  return (
    <div
      className="sm-stagger-pop rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
      style={{ "--i": index } as React.CSSProperties}
    >
      <dd className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
        <CountUp value={value} suffix={suffix} />
      </dd>
      <dt className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{label}</dt>
    </div>
  );
}
