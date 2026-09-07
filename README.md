# Scripture Memory

Memorize and retain Holy Scripture for the long term through active recall,
progressive memorization, and spaced repetition.

Read → Understand → Memorize → Recall → Review → Retain

## What it is

A fully client-side, installable Progressive Web App. There is no server and
no account — everything you add lives in your browser's IndexedDB. Complete a
useful review session in 5–15 minutes a day, export your entire memorization
state to a JSON file whenever you like, and restore it on any device.

- **Today** — your daily dashboard: what's due, what's new, your streak.
- **Library** — every Scripture you've added, searchable and filterable by
  status, collection, or text.
- **Review** — the memorization flow: read the verse, watch words
  progressively disappear, recall from the reference alone, then type (or
  recite) it from memory and grade your own recall.
- **Collections** — organize Scripture by topic (Faith, Prayer, Identity in
  Christ, etc.).
- **Progress** — mastery counts, streaks, average recall, and upcoming
  review load.
- **Settings** — preferences plus full data & backup controls (download,
  restore, merge, reset).

## Tech stack

| Component        | Technology                     |
| ----------------- | ------------------------------ |
| Frontend          | React + TypeScript             |
| Build tool        | Vite                           |
| Local database    | IndexedDB via Dexie.js         |
| Routing           | React Router (`HashRouter`)    |
| Styling           | Tailwind CSS                   |
| Offline / install | PWA via `vite-plugin-pwa`      |
| Backup format     | JSON                           |
| Speech recitation | Browser Web Speech API (optional, where supported) |

No backend, no SQL database, no required account. All Scripture, progress,
and review history stay on your device unless you export a backup yourself.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL. The app works fully offline once loaded —
try it in airplane mode after the first visit.

### Build

```bash
npm run build   # type-checks and builds to dist/
npm run preview # serve the production build locally
```

## How memorization works

Each Scripture progresses through five stages the first time you learn it:

1. **Read** — the full text is shown.
2. **Hide Words** — words are progressively hidden (20% → 40% → 60% → 80%).
3. **First-Letter Hints** — only the first letter of each word remains.
4. **Reference Only** — just the reference is shown; you recall the rest.
5. **Typed Recall** — you type the verse from memory and get a scored diff
   (missing / incorrect / extra words) plus a suggested rating you can
   override.

After that first pass, a Scripture enters spaced repetition: review
intervals follow the ladder 1 → 3 → 7 → 14 → 30 → 60 → 120 → 240 → 365 days,
adjusted up or down based on how you rate each review (Again / Hard / Good /
Easy). Status moves from **New** → **Learning** → **Reviewing** →
**Mastered** as mastery score increases; a poor recall can drop a Scripture
back to a shorter interval.

## Data & backup

Everything is stored locally. From **Settings → Data & Backup** you can:

- **Download Backup** — a complete JSON export (Scripture, collections,
  progress, review history, settings).
- **Export Scripture Only** — just your Scripture text and references.
- **Restore Backup** — choose a JSON file, preview what it contains, then
  either **Replace** (overwrite everything) or **Merge** (newest-wins,
  per-record, by `updatedAt`) with what's already on this device.
- **Reset Local Data** — wipe everything on this device (asks for
  confirmation twice).

Moving to a new device: download a backup on the old one, transfer the file
however you like (email, cloud drive, USB), then restore it on the new
device. You'll have the same Scriptures, collections, mastery levels, review
history, and settings.

## Deployment

This repo deploys to GitHub Pages automatically via
`.github/workflows/deploy.yml` on every push to `main`/`master`. It builds
with Vite (`base: "/scripture-memory/"`) and publishes `dist/`. To deploy
under a different repo name, update `base` in `vite.config.ts` to match.

Routing uses `HashRouter` (URLs like `/#/library`) specifically so GitHub
Pages — which has no server-side routing — never 404s on a client-side
route.

## Project structure

```
src/
├── components/   Presentational UI pieces (cards, nav, review controls)
├── pages/        One component per route
├── db/           Dexie schema, migrations, and repositories
├── models/       TypeScript types for every stored record
├── services/     Memorization logic, spaced repetition, recall scoring,
│                 backup/restore, speech recognition, stats
├── hooks/        Live-query hooks over the local database
└── utils/        Small stateless helpers (dates, ids, reference parsing)
```

## Privacy

No analytics, no remote calls, no account. Your Scripture library,
memorization progress, review history, and notes stay on your device unless
you export them yourself.
