import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TRANSLATIONS } from "../models";
import { useCollections, useScripture } from "../hooks/useLiveData";
import { addScripture, updateScripture } from "../db/repositories/scriptureRepository";
import { addCollection } from "../db/repositories/collectionRepository";
import { parseReference } from "../utils/reference";

export function AddScripturePage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const existing = useScripture(id);
  const collections = useCollections();
  const navigate = useNavigate();

  const [reference, setReference] = useState("");
  const [translation, setTranslation] = useState<string>("ESV");
  const [text, setText] = useState("");
  const [meaning, setMeaning] = useState("");
  const [reason, setReason] = useState("");
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (existing) {
      setReference(existing.reference);
      setTranslation(existing.translation);
      setText(existing.text);
      setMeaning(existing.meaning ?? "");
      setReason(existing.reasonForMemorizing ?? "");
      setSelectedCollectionIds(existing.collectionIds);
    }
  }, [existing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!reference.trim() || !text.trim()) {
      setError("Reference and Scripture text are required.");
      return;
    }
    setSubmitting(true);
    try {
      const parsed = parseReference(reference);
      const payload = {
        reference: reference.trim(),
        ...parsed,
        text: text.trim(),
        translation,
        collectionIds: selectedCollectionIds,
        meaning: meaning.trim() || undefined,
        reasonForMemorizing: reason.trim() || undefined,
      };
      if (isEditing && id) {
        await updateScripture(id, payload);
        navigate(`/library/${id}`);
      } else {
        const created = await addScripture(payload);
        navigate(`/library/${created.id}`);
      }
    } catch {
      setError("Something went wrong saving this Scripture. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddCollection() {
    const name = newCollectionName.trim();
    if (!name) return;
    const created = await addCollection(name);
    setSelectedCollectionIds((prev) => [...prev, created.id]);
    setNewCollectionName("");
  }

  function toggleCollection(collectionId: string) {
    setSelectedCollectionIds((prev) =>
      prev.includes(collectionId)
        ? prev.filter((c) => c !== collectionId)
        : [...prev, collectionId],
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:pb-8">
      <h1 className="text-2xl font-bold text-slate-900">
        {isEditing ? "Edit Scripture" : "Add Scripture"}
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <Field label="Reference" htmlFor="reference">
          <input
            id="reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Romans 8:1"
            required
            className="input"
          />
        </Field>

        <Field label="Translation" htmlFor="translation">
          <select
            id="translation"
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            className="input"
          >
            {TRANSLATIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Scripture Text" htmlFor="text">
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            rows={5}
            className="input resize-y"
          />
        </Field>

        <Field label="What does this Scripture teach? (optional)" htmlFor="meaning">
          <textarea
            id="meaning"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            rows={2}
            className="input resize-y"
          />
        </Field>

        <Field label="Why do you want to remember this Scripture? (optional)" htmlFor="reason">
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="input resize-y"
          />
        </Field>

        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-slate-700">Collections</legend>
          <div className="flex flex-wrap gap-2">
            {collections.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => toggleCollection(c.id)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  selectedCollectionIds.includes(c.id)
                    ? "bg-blue-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="New collection name"
              className="input flex-1"
            />
            <button
              type="button"
              onClick={handleAddCollection}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Add
            </button>
          </div>
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-blue-700 py-3 text-lg font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {isEditing ? "Save Changes" : "Save Scripture"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}
