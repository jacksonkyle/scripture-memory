import { useState } from "react";
import { Link } from "react-router-dom";
import { useCollections, useScriptures } from "../hooks/useLiveData";
import { addCollection } from "../db/repositories/collectionRepository";

export function CollectionsPage() {
  const collections = useCollections();
  const scriptures = useScriptures();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await addCollection(name.trim(), description.trim() || undefined);
    setName("");
    setDescription("");
    setShowForm(false);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Scripture Map</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          + New Collection
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 space-y-2 rounded-xl border border-slate-200 p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Collection name (e.g. Identity in Christ)"
            className="input"
            required
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="input"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Create
          </button>
        </form>
      )}

      <ul className="mt-6 space-y-2">
        {collections.map((c) => {
          const count = scriptures.filter((s) => s.collectionIds.includes(c.id)).length;
          return (
            <li key={c.id}>
              <Link
                to={`/collections/${c.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow-md"
              >
                <div>
                  <p className="font-medium text-slate-900">{c.name}</p>
                  {c.description && <p className="text-sm text-slate-500">{c.description}</p>}
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-700">
                  {count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {collections.length === 0 && !showForm && (
        <p className="mt-8 text-center text-slate-500">
          Organize your Scriptures by topic — create your first collection above.
        </p>
      )}
    </div>
  );
}
