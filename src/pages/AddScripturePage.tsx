import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { TRANSLATIONS } from "../models";
import { useCollections, useScripture, useSettings } from "../hooks/useLiveData";
import { db } from "../db/database";
import { addScripture, updateScripture } from "../db/repositories/scriptureRepository";
import { addCollection } from "../db/repositories/collectionRepository";
import { parseReference } from "../utils/reference";
import {
  ApiBibleProvider,
  bibleProvider,
  isLookupTranslation,
  listApiBibles,
  LOOKUP_TRANSLATIONS,
  type ApiBibleSummary,
} from "../services/bibleProvider";

export function AddScripturePage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const existing = useScripture(id);
  const collections = useCollections();
  const settings = useSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [reference, setReference] = useState("");
  const [translation, setTranslation] = useState<string>("KJV");
  const [text, setText] = useState("");
  const [meaning, setMeaning] = useState("");
  const [reason, setReason] = useState("");
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupSuccess, setLookupSuccess] = useState(false);

  const [apiBibles, setApiBibles] = useState<ApiBibleSummary[]>([]);
  const [apiBiblesLoading, setApiBiblesLoading] = useState(false);
  const [apiBiblesError, setApiBiblesError] = useState<string | null>(null);
  const [selectedApiBibleId, setSelectedApiBibleId] = useState<string>("");
  const [apiLookupLoading, setApiLookupLoading] = useState(false);
  const [apiLookupError, setApiLookupError] = useState<string | null>(null);
  const [apiLookupCopyright, setApiLookupCopyright] = useState<string | null>(null);

  const apiBibleKey = settings.apiBibleKey?.trim();

  const [prefilledFromLink, setPrefilledFromLink] = useState(false);
  const [collectionParamStatus, setCollectionParamStatus] = useState<"pending" | "done">(
    isEditing || !searchParams.get("collection") ? "done" : "pending",
  );
  const rawCollections = useLiveQuery(() => db.collections.toArray(), []);
  const autosaveTriggered = useRef(false);
  const collectionResolutionStarted = useRef(false);

  // Pre-fill from URL query params (e.g. a link from an LLM recommending a
  // verse): ?reference=John+3:16&text=...&translation=ESV&meaning=...
  // &reason=...&collection=Faith,Salvation. Runs once, on mount, for new
  // (not edit) scriptures only.
  useEffect(() => {
    if (isEditing) return;
    const qReference = searchParams.get("reference");
    const qText = searchParams.get("text");
    const qTranslation = searchParams.get("translation");
    const qMeaning = searchParams.get("meaning");
    const qReason = searchParams.get("reason");
    if (!qReference && !qText && !qTranslation && !qMeaning && !qReason) return;
    if (qReference) setReference(qReference);
    if (qText) setText(qText);
    if (qTranslation) setTranslation(qTranslation);
    if (qMeaning) setMeaning(qMeaning);
    if (qReason) setReason(qReason);
    setPrefilledFromLink(true);
    // Intentionally runs once on mount only - this reads the initial URL, not live state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve ?collection=Name,Other into ids, creating any collection that
  // doesn't already exist. Waits for the real collections list (rawCollections
  // is undefined while Dexie's live query is still loading) to avoid creating
  // a duplicate of a collection that already exists. Guarded by a ref (not
  // just collectionParamStatus) because addCollection's writes make Dexie's
  // live query re-fire mid-flight, which would otherwise re-enter this same
  // effect - with collectionParamStatus still "pending" - and double-create.
  useEffect(() => {
    if (isEditing || collectionParamStatus !== "pending") return;
    if (rawCollections === undefined) return;
    if (collectionResolutionStarted.current) return;
    collectionResolutionStarted.current = true;
    const qCollection = searchParams.get("collection");
    if (!qCollection) {
      setCollectionParamStatus("done");
      return;
    }
    let cancelled = false;
    (async () => {
      const names = qCollection.split(",").map((n) => n.trim()).filter(Boolean);
      const ids: string[] = [];
      for (const name of names) {
        const match = rawCollections.find((c) => c.name.toLowerCase() === name.toLowerCase());
        ids.push(match ? match.id : (await addCollection(name)).id);
      }
      if (cancelled) return;
      setSelectedCollectionIds((prev) => Array.from(new Set([...prev, ...ids])));
      setPrefilledFromLink(true);
    })().finally(() => {
      if (!cancelled) setCollectionParamStatus("done");
    });
    return () => {
      cancelled = true;
    };
  }, [rawCollections, isEditing, searchParams, collectionParamStatus]);

  // Optional zero-click add: ?autosave=1 saves immediately once prefill and
  // collection resolution are done, then navigates to the new scripture.
  useEffect(() => {
    if (isEditing || autosaveTriggered.current || collectionParamStatus !== "done") return;
    const wantsAutosave = ["1", "true", "yes"].includes(
      (searchParams.get("autosave") ?? "").toLowerCase(),
    );
    if (!wantsAutosave) {
      // Stable, URL-derived decision - safe to lock in immediately.
      autosaveTriggered.current = true;
      return;
    }
    // reference/text may not be populated yet on this same effect flush (the
    // prefill effect's setState hasn't re-rendered yet) - wait for them
    // without locking, so this re-checks once they land.
    if (!reference.trim() || !text.trim()) return;
    autosaveTriggered.current = true;
    void saveScripture();
    // saveScripture is stable enough for this one-shot effect; re-running on
    // every keystroke would be wrong once the user starts editing manually.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionParamStatus, reference, text, isEditing, searchParams]);

  useEffect(() => {
    if (!apiBibleKey) {
      setApiBibles([]);
      setSelectedApiBibleId("");
      return;
    }
    let cancelled = false;
    setApiBiblesLoading(true);
    setApiBiblesError(null);
    listApiBibles(apiBibleKey)
      .then((bibles) => {
        if (cancelled) return;
        setApiBibles(bibles);
        setSelectedApiBibleId((current) => current || bibles[0]?.id || "");
      })
      .catch((err) => {
        if (cancelled) return;
        setApiBiblesError(err instanceof Error ? err.message : "Couldn't load translations.");
      })
      .finally(() => {
        if (!cancelled) setApiBiblesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBibleKey]);

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
    await saveScripture();
  }

  async function saveScripture() {
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

  async function handleLookup() {
    if (!isLookupTranslation(translation)) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupSuccess(false);
    try {
      const result = await bibleProvider.getPassage(translation, reference);
      setReference(result.reference);
      setText(result.text);
      setLookupSuccess(true);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Lookup failed. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleApiLookup() {
    if (!apiBibleKey || !selectedApiBibleId) return;
    setApiLookupLoading(true);
    setApiLookupError(null);
    setApiLookupCopyright(null);
    try {
      const provider = new ApiBibleProvider(apiBibleKey);
      const result = await provider.getPassage(selectedApiBibleId, reference);
      setReference(result.reference);
      setText(result.text);
      const chosenBible = apiBibles.find((b) => b.id === selectedApiBibleId);
      if (chosenBible) setTranslation(chosenBible.abbreviation);
      if (result.copyright) setApiLookupCopyright(result.copyright);
    } catch (err) {
      setApiLookupError(err instanceof Error ? err.message : "Lookup failed. Please try again.");
    } finally {
      setApiLookupLoading(false);
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
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        {isEditing ? "Edit Scripture" : "Add Scripture"}
      </h1>

      {prefilledFromLink && (
        <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          Filled in from a link — review it below, then save.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <Field label="Reference" htmlFor="reference">
          <input
            id="reference"
            value={reference}
            onChange={(e) => {
              setReference(e.target.value);
              setLookupError(null);
              setLookupSuccess(false);
            }}
            placeholder="Romans 8:1"
            required
            className="input"
          />
        </Field>

        <Field label="Translation" htmlFor="translation">
          <select
            id="translation"
            value={translation}
            onChange={(e) => {
              setTranslation(e.target.value);
              setLookupError(null);
              setLookupSuccess(false);
            }}
            className="input"
          >
            {!(TRANSLATIONS as readonly string[]).includes(translation) && translation && (
              <option value={translation}>{translation}</option>
            )}
            {TRANSLATIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>

        <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Free lookup ({LOOKUP_TRANSLATIONS.join("/")}, no key needed)
          </p>
          <button
            type="button"
            onClick={handleLookup}
            disabled={!isLookupTranslation(translation) || !reference.trim() || lookupLoading}
            className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {lookupLoading ? "Looking up…" : "Look Up & Fill Text"}
          </button>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {isLookupTranslation(translation)
              ? `Pulls the verse text automatically for ${translation} from a public-domain Bible API. Requires an internet connection.`
              : `This free lookup only supports public-domain translations (${LOOKUP_TRANSLATIONS.join(" or ")}) due to copyright. Switch translation above to use it here, type the text below, or use the api.bible lookup below if your key has access to ${translation}.`}
          </p>
          {lookupError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{lookupError}</p>}
          {lookupSuccess && (
            <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
              Verse text filled in below — review it, then save.
            </p>
          )}
        </div>

        {apiBibleKey && (
          <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              Look up via your api.bible key
            </p>
            {apiBiblesLoading && (
              <p className="text-xs text-slate-500 dark:text-slate-400">Loading available translations…</p>
            )}
            {apiBiblesError && (
              <p className="text-sm text-red-600 dark:text-red-400">{apiBiblesError}</p>
            )}
            {!apiBiblesLoading && !apiBiblesError && apiBibles.length > 0 && (
              <>
                <select
                  value={selectedApiBibleId}
                  onChange={(e) => setSelectedApiBibleId(e.target.value)}
                  className="input"
                >
                  {apiBibles.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.abbreviation})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleApiLookup}
                  disabled={!reference.trim() || apiLookupLoading}
                  className="mt-2 w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  {apiLookupLoading ? "Looking up…" : "Look Up & Fill Text"}
                </button>
                {apiLookupError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{apiLookupError}</p>
                )}
                {apiLookupCopyright && (
                  <p className="mt-2 text-xs italic text-slate-500 dark:text-slate-400">
                    {apiLookupCopyright}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <Field label="Scripture Text" htmlFor="text">
          <textarea
            id="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setLookupSuccess(false);
            }}
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
          <legend className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Collections</legend>
          <div className="flex flex-wrap gap-2">
            {collections.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => toggleCollection(c.id)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  selectedCollectionIds.includes(c.id)
                    ? "bg-blue-700 text-white dark:bg-blue-600"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Add
            </button>
          </div>
        </fieldset>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-blue-700 py-3 text-lg font-semibold text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
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
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}
