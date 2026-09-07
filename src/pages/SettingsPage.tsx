import { useRef, useState } from "react";
import { useSettings } from "../hooks/useLiveData";
import { updateSettings } from "../db/repositories/settingsRepository";
import {
  BackupValidationError,
  buildRestorePreview,
  downloadBackup,
  downloadScriptureOnlyExport,
  readFileAsText,
  resetLocalData,
  restoreMerge,
  restoreReplace,
  validateBackup,
} from "../services/backupService";
import type { Backup, RestorePreview } from "../models";
import { TRANSLATIONS } from "../models";
import { formatFullDate } from "../utils/date";
import { isSpeechRecognitionSupported } from "../services/speechService";
import { listApiBibles } from "../services/bibleProvider";

export function SettingsPage() {
  const settings = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingBackup, setPendingBackup] = useState<Backup | null>(null);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [keyTestMessage, setKeyTestMessage] = useState<string | null>(null);

  async function handleTestApiBibleKey() {
    setKeyTestStatus("testing");
    setKeyTestMessage(null);
    try {
      const bibles = await listApiBibles(settings.apiBibleKey ?? "");
      setKeyTestStatus("success");
      setKeyTestMessage(`Key works — ${bibles.length} translation${bibles.length === 1 ? "" : "s"} available.`);
    } catch (err) {
      setKeyTestStatus("error");
      setKeyTestMessage(err instanceof Error ? err.message : "Couldn't verify that key.");
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setStatusMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const backup = validateBackup(text);
      setPendingBackup(backup);
      setPreview(buildRestorePreview(backup));
    } catch (err) {
      setPendingBackup(null);
      setPreview(null);
      setError(err instanceof BackupValidationError ? err.message : "Could not read that file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRestore(mode: "replace" | "merge") {
    if (!pendingBackup) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "replace") {
        await restoreReplace(pendingBackup);
        setStatusMessage("Backup restored. Your data has been replaced.");
      } else {
        await restoreMerge(pendingBackup);
        setStatusMessage("Backup merged with your existing data.");
      }
      setPendingBackup(null);
      setPreview(null);
    } catch {
      setError("Restore failed. Your existing data was not changed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!confirm("This will permanently delete all Scripture, progress, and history on this device. Continue?")) {
      return;
    }
    if (!confirm("Are you absolutely sure? This cannot be undone. Consider downloading a backup first.")) {
      return;
    }
    await resetLocalData();
    setStatusMessage("Local data has been reset.");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:pb-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Preferences</h2>
        <div className="mt-3 space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <Field label="Preferred Translation">
            <select
              value={settings.preferredTranslation ?? ""}
              onChange={(e) =>
                updateSettings({ preferredTranslation: e.target.value || undefined })
              }
              className="input"
            >
              <option value="">No preference</option>
              {TRANSLATIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>

          <Field label={`Daily New Scriptures (${settings.dailyNewScriptures})`}>
            <input
              type="range"
              min={0}
              max={10}
              value={settings.dailyNewScriptures}
              onChange={(e) => updateSettings({ dailyNewScriptures: Number(e.target.value) })}
              className="w-full"
            />
          </Field>

          <Field label={`Daily Review Goal (${settings.dailyReviewGoal})`}>
            <input
              type="range"
              min={1}
              max={50}
              value={settings.dailyReviewGoal}
              onChange={(e) => updateSettings({ dailyReviewGoal: Number(e.target.value) })}
              className="w-full"
            />
          </Field>

          <label className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
            <span>
              Speech Recognition
              {!isSpeechRecognitionSupported() && (
                <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">(not supported here)</span>
              )}
            </span>
            <input
              type="checkbox"
              checked={settings.enableSpeechRecognition}
              disabled={!isSpeechRecognitionSupported()}
              onChange={(e) => updateSettings({ enableSpeechRecognition: e.target.checked })}
              className="h-5 w-5"
            />
          </label>

          <Field label="Theme">
            <select
              value={settings.theme}
              onChange={(e) =>
                updateSettings({ theme: e.target.value as "light" | "dark" | "system" })
              }
              className="input"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Scripture Lookup</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Optional: add your own{" "}
          <a
            href="https://scripture.api.bible"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            api.bible
          </a>{" "}
          key to look up additional translations when adding Scripture. It's stored only in this
          browser — never uploaded anywhere or bundled into the app.
        </p>
        <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <Field label="api.bible Key">
            <div className="flex gap-2">
              <input
                type={showApiKey ? "text" : "password"}
                value={settings.apiBibleKey ?? ""}
                onChange={(e) => {
                  updateSettings({ apiBibleKey: e.target.value || undefined });
                  setKeyTestStatus("idle");
                  setKeyTestMessage(null);
                }}
                placeholder="Paste your api.bible key"
                autoComplete="off"
                spellCheck={false}
                className="input flex-1"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                className="rounded-lg bg-slate-100 px-3 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {showApiKey ? "Hide" : "Show"}
              </button>
            </div>
          </Field>
          <button
            type="button"
            onClick={handleTestApiBibleKey}
            disabled={!settings.apiBibleKey?.trim() || keyTestStatus === "testing"}
            className="w-full rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {keyTestStatus === "testing" ? "Checking…" : "Test Key"}
          </button>
          {keyTestMessage && (
            <p
              className={`text-sm ${
                keyTestStatus === "success"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {keyTestMessage}
            </p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Data & Backup</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Your Scripture library, memorization progress, review history, and notes are stored
          locally in your browser. They are not uploaded to a server.
        </p>

        <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => downloadBackup()}
            className="w-full rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Download Backup
          </button>
          <button
            type="button"
            onClick={() => downloadScriptureOnlyExport()}
            className="w-full rounded-lg bg-slate-100 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Export Scripture Only
          </button>

          <div>
            <label
              htmlFor="restore-file"
              className="block w-full cursor-pointer rounded-lg border border-dashed border-slate-300 px-4 py-3 text-center text-sm font-medium text-slate-600 hover:border-blue-400 dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-500"
            >
              Choose Backup File to Restore…
            </label>
            <input
              id="restore-file"
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleFileSelected}
              className="sr-only"
            />
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="w-full rounded-lg bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60"
          >
            Reset Local Data
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {statusMessage && <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{statusMessage}</p>}
      </section>

      {preview && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 sm:rounded-2xl dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Restore Backup</h3>
            <dl className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-400">
              <Row label="Backup Date" value={formatFullDate(preview.exportedAt)} />
              <Row label="Scriptures" value={String(preview.scriptureCount)} />
              <Row label="Collections" value={String(preview.collectionCount)} />
              <Row label="Review Records" value={String(preview.reviewCount)} />
              <Row label="Mastered Scriptures" value={String(preview.masteredCount)} />
              <Row label="Learning Scriptures" value={String(preview.learningCount)} />
            </dl>
            <div className="mt-5 space-y-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleRestore("replace")}
                className="w-full rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60 dark:bg-red-700 dark:hover:bg-red-600"
              >
                Replace Existing Data
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleRestore("merge")}
                className="w-full rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                Merge With Existing Data
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPendingBackup(null);
                  setPreview(null);
                }}
                className="w-full rounded-lg bg-slate-100 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt>{label}</dt>
      <dd className="font-medium text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  );
}
