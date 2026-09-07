import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAllProgress, useCollections, useScriptures } from "../hooks/useLiveData";
import { ScriptureCard } from "../components/ScriptureCard";
import type { MemorizationStatus } from "../models";

const STATUS_FILTERS: { value: MemorizationStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "learning", label: "Learning" },
  { value: "reviewing", label: "Reviewing" },
  { value: "mastered", label: "Mastered" },
  { value: "paused", label: "Paused" },
];

export function LibraryPage() {
  const scriptures = useScriptures();
  const progress = useAllProgress();
  const collections = useCollections();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MemorizationStatus | "all">("all");
  const [collectionFilter, setCollectionFilter] = useState<string>("all");

  const progressByScriptureId = useMemo(() => {
    const map = new Map<string, (typeof progress)[number]>();
    for (const p of progress) map.set(p.scriptureId, p);
    return map;
  }, [progress]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scriptures.filter((s) => {
      const p = progressByScriptureId.get(s.id);
      if (statusFilter !== "all" && p?.status !== statusFilter) return false;
      if (collectionFilter !== "all" && !s.collectionIds.includes(collectionFilter)) return false;
      if (!q) return true;
      return (
        s.reference.toLowerCase().includes(q) ||
        s.text.toLowerCase().includes(q) ||
        s.book.toLowerCase().includes(q) ||
        s.translation.toLowerCase().includes(q)
      );
    });
  }, [scriptures, progressByScriptureId, query, statusFilter, collectionFilter]);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:pb-8">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Scripture Library</h1>
        <Link
          to="/library/new"
          className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          + Add
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by reference, text, or book…"
          aria-label="Search scriptures"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {collections.length > 0 && (
          <select
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value)}
            aria-label="Filter by collection"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Collections</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <ul className="mt-4 space-y-3">
        {filtered.map((s) => (
          <li key={s.id}>
            <ScriptureCard scripture={s} progress={progressByScriptureId.get(s.id)} />
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="mt-8 text-center text-slate-500">No Scriptures match your search.</p>
      )}
    </div>
  );
}
