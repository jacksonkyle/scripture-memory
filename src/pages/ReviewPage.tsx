import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAllProgress, useScriptures, useSettings } from "../hooks/useLiveData";
import { ReviewItem } from "../components/ReviewItem";
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

  const currentProgress = queue[position];
  const currentScripture = currentProgress
    ? scriptures.find((s) => s.id === currentProgress.scriptureId)
    : undefined;

  async function handleComplete(result: {
    method: ReviewMethod;
    score: number;
    rating: ReviewRating;
    advanceStage: boolean;
  }) {
    if (!currentProgress) return;
    await applyReview({
      scriptureId: currentProgress.scriptureId,
      ...result,
    });
    setSessionCount((c) => c + 1);
    setPosition((p) => p + 1);
  }

  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 text-center sm:pb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Nothing Due Right Now</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          You're all caught up. Come back later, or add more Scripture to memorize.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          Back to Today
        </Link>
      </div>
    );
  }

  if (position >= queue.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 text-center sm:pb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Session Complete</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          You reviewed {sessionCount} {sessionCount === 1 ? "Scripture" : "Scriptures"}. Well
          done.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
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
      <div className="mb-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>
          {position + 1} of {queue.length}
        </span>
        <Link to="/" className="underline">
          Exit Review
        </Link>
      </div>
      <ReviewItem
        key={currentProgress.id}
        scripture={currentScripture}
        progress={currentProgress}
        speechEnabled={settings.enableSpeechRecognition}
        onComplete={handleComplete}
      />
    </div>
  );
}
