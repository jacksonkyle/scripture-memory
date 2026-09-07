import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAllProgress, useCollections, useScriptures } from "../hooks/useLiveData";
import { ScriptureCard } from "../components/ScriptureCard";
import { deleteCollection, updateCollection } from "../db/repositories/collectionRepository";

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const collections = useCollections();
  const scriptures = useScriptures();
  const progress = useAllProgress();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");

  const collection = collections.find((c) => c.id === id);
  const items = scriptures.filter((s) => id && s.collectionIds.includes(id));

  if (!collection) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-6">
        <p className="text-slate-600">This collection could not be found.</p>
        <Link to="/collections" className="text-blue-700 underline">
          Back to Collections
        </Link>
      </div>
    );
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!collection || !name.trim()) return;
    await updateCollection(collection.id, { name: name.trim() });
    setIsEditing(false);
  }

  async function handleDelete() {
    if (!collection) return;
    if (!confirm(`Delete the "${collection.name}" collection? Scriptures will not be deleted.`)) {
      return;
    }
    await deleteCollection(collection.id);
    navigate("/collections");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:pb-8">
      {isEditing ? (
        <form onSubmit={handleRename} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            autoFocus
          />
          <button type="submit" className="rounded-lg bg-blue-700 px-3 py-2 text-sm text-white">
            Save
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">{collection.name}</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setName(collection.name);
                setIsEditing(true);
              }}
              className="rounded-lg bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg bg-red-50 px-3 py-1 text-sm text-red-700 hover:bg-red-100"
            >
              Delete
            </button>
          </div>
        </div>
      )}
      {collection.description && <p className="mt-1 text-slate-500">{collection.description}</p>}

      <ul className="mt-6 space-y-3">
        {items.map((s) => (
          <li key={s.id}>
            <ScriptureCard
              scripture={s}
              progress={progress.find((p) => p.scriptureId === s.id)}
            />
          </li>
        ))}
      </ul>

      {items.length === 0 && (
        <p className="mt-8 text-center text-slate-500">
          No Scriptures in this collection yet.{" "}
          <Link to="/library/new" className="text-blue-700 underline">
            Add one
          </Link>
          .
        </p>
      )}
    </div>
  );
}
