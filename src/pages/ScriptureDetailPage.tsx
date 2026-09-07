import { useNavigate, useParams, Link } from "react-router-dom";
import { useCollections, useProgressForScripture, useScripture } from "../hooks/useLiveData";
import { StatusBadge } from "../components/StatusBadge";
import { ProgressBar } from "../components/ProgressBar";
import { deleteScripture } from "../db/repositories/scriptureRepository";
import { formatFullDate, formatRelativeDate } from "../utils/date";

export function ScriptureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const scripture = useScripture(id);
  const progress = useProgressForScripture(id);
  const collections = useCollections();
  const navigate = useNavigate();

  if (!scripture) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-6">
        <p className="text-slate-600">This Scripture could not be found.</p>
        <Link to="/library" className="text-blue-700 underline">
          Back to Library
        </Link>
      </div>
    );
  }

  const scriptureCollections = collections.filter((c) =>
    scripture.collectionIds.includes(c.id),
  );

  async function handleDelete() {
    if (!scripture) return;
    if (!confirm(`Delete ${scripture.reference}? This cannot be undone.`)) return;
    await deleteScripture(scripture.id);
    navigate("/library");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:pb-8">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{scripture.reference}</h1>
          <p className="text-sm text-slate-500">{scripture.translation}</p>
        </div>
        {progress && <StatusBadge status={progress.status} />}
      </div>

      <p className="mt-4 whitespace-pre-wrap text-lg leading-relaxed text-slate-800">
        {scripture.text}
      </p>

      {scripture.meaning && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-slate-500">What it teaches</h2>
          <p className="mt-1 text-slate-700">{scripture.meaning}</p>
        </div>
      )}
      {scripture.reasonForMemorizing && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-slate-500">Why I'm memorizing this</h2>
          <p className="mt-1 text-slate-700">{scripture.reasonForMemorizing}</p>
        </div>
      )}

      {scriptureCollections.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {scriptureCollections.map((c) => (
            <span key={c.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              {c.name}
            </span>
          ))}
        </div>
      )}

      {progress && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <ProgressBar value={progress.masteryScore} label="Mastery" />
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
            <div>
              <dt className="text-xs uppercase text-slate-400">Next Review</dt>
              <dd>{formatRelativeDate(progress.nextReviewDate)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">Last Reviewed</dt>
              <dd>{progress.lastReviewedAt ? formatFullDate(progress.lastReviewedAt) : "Never"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">Successes</dt>
              <dd>{progress.successCount}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">Failures</dt>
              <dd>{progress.failureCount}</dd>
            </div>
          </dl>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link
          to={`/review?scriptureId=${scripture.id}`}
          className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-center font-semibold text-white hover:bg-blue-800"
        >
          {progress && progress.stage > 0 ? "Review Now" : "Begin Memorizing"}
        </Link>
        <Link
          to={`/library/${scripture.id}/edit`}
          className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-center font-semibold text-slate-700 hover:bg-slate-200"
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          className="flex-1 rounded-xl bg-red-50 px-4 py-3 text-center font-semibold text-red-700 hover:bg-red-100"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
