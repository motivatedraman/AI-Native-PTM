# Nexus OS

A personal task and execution manager. FastAPI + SQLAlchemy + React + Vite + Tailwind v4.

The app does one thing: show you today's tasks, and let you add new ones without thinking about it. Everything else is deliberately secondary.

---

## Why this README reads differently

The first version of this project was a dashboard. It had seven navigation items, a three-card statistics row, two AI widgets that fired API calls on page load, a duplicate "high priority" list sitting above the real task list, and a colour scheme that was one hue described at ten volumes.

It was also slow, and for a specific reason worth recording: the task list endpoint issued **201 database queries** to render 100 tasks.

Both problems had the same root cause, nothing was ever subtracted. Features accumulated, each one individually reasonable, until the sum stopped serving the user. This document records what was removed and why, because the removals are the actual design.

---

## What changed

### The clutter

| | Before | After |
|---|---|---|
| Navigation items | 7 | 6 |
| Views | 8 | 7 |
| Buttons in the app | 100 | 88 |
| Lines in the view layer | ~1,340 | 1,162 |
| Regions on the Today page | 11 | 4 |
| Per-row items on a task | 4 | ≤3 |

**Today was rebuilt.** It went from 573 lines to 268. The page is now: one header line, one capture field, one list. Removed were the three stat cards, two AI widgets, the duplicated high-priority section, and the five-button date preset bar.

The AI widgets were **relocated, not deleted**. `WhatNowWidget` and `AISuggestionsCard` no longer exist as files; their logic lives in the AI Assistant panel behind `A`, and both fetch on demand. Previously opening Today fired two API calls and rendered two large cards *above* your tasks.

**Status badges were removed from rows.** Every task row displayed `PLANNED` / `DOING` / `DONE` in a coloured pill. The list now sorts urgent-first and sinks completed items, so ordering carries that signal instead of a label repeated 100 times.

**Headers were reduced to one line.** Every page repeated the same three-part header, an uppercase eyebrow with an icon, a 3xl heading, and an explanatory paragraph. Fifteen elements saying nothing. All gone.

**Two features were deleted outright:** the University Hub and the Projects Directory. The *views* went; the data model did not. `project_id` is a real foreign key and `TaskCategory` still contains `'University'`, because existing rows carry those values and narrowing the types would strand them.

### The colour

The original palette was monochrome. Surfaces, borders, text and accent were all tints of `#ab7631`, one brown at ten volumes. That, more than any layout decision, is what made it read as generic.

Rebuilt in OKLCH around a cool graphite anchor (hue 250, chroma 0.002-0.016) with a single desaturated slate accent (hue 240, chroma ≤ 0.044). Two independent hues rather than one hue described repeatedly.

The accent was originally gold, then replaced, gold at chroma 0.155 reads as a brand colour. Capping chroma near 0.04 makes it an institutional tint that still signals "interactive" without shouting.

Light mode took three passes. The first version topped out at `rgb(254 255 255)` against a `rgb(243 245 248)` page, effectively white on white, with every surface crammed into the top 5% of the lightness range. Surfaces now descend 244 → 197. Darkening the surfaces cost contrast on faint text and control borders, so both deepened to compensate.

**All 106 text/surface and control-boundary pairs verify against WCAG AA in both modes.** This is checked numerically, not by eye, and the check runs against the built CSS rather than source values.

### The performance

Three fixes, each measured before and after.

**N+1 on the task list, the big one.** `TaskResponse` serializes subtasks, tags and project. SQLAlchemy lazy-loads each one per row, so 100 tasks meant 201 queries.

```
100 tasks, list + serialize
  lazy loading (the bug):  201 queries    123 ms
  selectinload (the fix):    3 queries     16 ms
```

Same fix applied to `/api/focus/sessions`, which embeds a full `TaskResponse`.

**N+1 on the project list.** Each project issued two separate `COUNT` queries for its task totals. 17 round-trips for 8 projects. Replaced with one grouped aggregate: 2 queries.

**Client over-fetching.** `handleTaskCreated` refetched all five endpoints after every task creation, discarding the authoritative POST response it already had. Now it applies the response directly. A single user action went from 5 requests to 0.

Also: removed four unused dependencies (`clsx`, `date-fns`, `tailwind-merge`, `autoprefixer`), added cleanup to three focus timers that could outlive their components, and moved a ref write out of React's render phase.

---

## Architecture

```
frontend/   React 19 · Vite 8 · Tailwind v4 (CSS-first) · TypeScript
backend/    FastAPI · SQLAlchemy 2 · SQLite (local) / PostgreSQL (prod)
```

**Tailwind v4 is configured in CSS, not JS.** The design tokens live in a `@theme` block in `frontend/src/index.css` and reference runtime custom properties, so toggling light/dark re-tints the whole app without a rebuild. There is no `tailwind.config.js`.

Tokens are RGB channel triplets rather than `oklch()` for one reason: ~40 call sites use `rgb(var(--token) / <alpha>)` for opacity modifiers, and Tailwind v4 removed the `<alpha-value>` placeholder. Emitting `oklch()` directly would break every one of them.

**AI never blocks the app.** If a model call fails, the service falls back to heuristics. Task creation cannot fail because a provider is down. API keys stay on the backend.

**Inline capture deliberately bypasses the AI parser.** The Today capture field posts to `/api/tasks` with today's due date rather than `/api/tasks/quick-add`. Quick-add routes through the AI to *guess* a due date, correct for an untriaged inbox dump, wrong here, where "today" is the stated intent and a guessed date would silently misfile the calendar's target day.

---

## Setup against a database

```bash
./setup.sh
```

It asks for the Neon connection string, checks it connects, reconciles
alembic's history with whatever schema it finds, applies every migration,
seeds, and verifies. Then put the same URL in Render under `DATABASE_URL`
and deploy.

### Why the reconcile step exists

**A database created by this app has no alembic history.** `main.py` runs
`Base.metadata.create_all()` on boot, which issues `CREATE TABLE` and
nothing else — it can never add a column or change a type on a table that
already exists. So on such a database `alembic_version` is empty, and
`alembic upgrade head` tries to run `78c267805219` (initial_schema) against
tables that are already there. That revision wraps none of its six
`create_table` calls in `try/except`, so it aborts, and every revision
after it never runs.

This was invisible for a long time because `build.sh` piped alembic into
`|| true`: a migration that had never executed produced exactly the same
build output as one that had. `build.sh` now lets that failure stop the
deploy, so the mismatch cannot stay hidden again.

`setup.sh` handles both cases by inspecting the database rather than
assuming: empty means run the chain from the start; existing tables with no
alembic history get stamped at the revision matching the current schema
(`e5f6a7b8c9d0`), after which only genuinely-new migrations run. Override
with `REVISION=<id>` if your schema is at a different point.

The final verification is the part worth trusting: it queries
`information_schema` and reports any column still reading
`timestamp without time zone`, rather than assuming the migration worked.

### Doing it by hand

```sql
-- Check where the schema stands.
SELECT version_num FROM alembic_version;   -- empty: never stamped
SELECT to_regclass('daily_reflections');   -- null: e5f6a7b8c9d0 already applied
```

Then either stamp and upgrade:

```bash
PYTHONPATH=. alembic stamp e5f6a7b8c9d0
PYTHONPATH=. alembic upgrade head
```

or run the DDL directly:

```sql
BEGIN;
ALTER TABLE tasks ALTER COLUMN due_date      TYPE TIMESTAMPTZ USING due_date      AT TIME ZONE 'UTC';
ALTER TABLE tasks ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'UTC';
ALTER TABLE tasks ALTER COLUMN updated_at    TYPE TIMESTAMPTZ USING updated_at    AT TIME ZONE 'UTC';
ALTER TABLE tasks ALTER COLUMN completed_at  TYPE TIMESTAMPTZ USING completed_at  AT TIME ZONE 'UTC';
ALTER TABLE activity_logs ALTER COLUMN created_at      TYPE TIMESTAMPTZ USING created_at      AT TIME ZONE 'UTC';
ALTER TABLE projects ALTER COLUMN created_at  TYPE TIMESTAMPTZ USING created_at  AT TIME ZONE 'UTC';
ALTER TABLE projects ALTER COLUMN updated_at  TYPE TIMESTAMPTZ USING updated_at  AT TIME ZONE 'UTC';
ALTER TABLE tags ALTER COLUMN created_at      TYPE TIMESTAMPTZ USING created_at      AT TIME ZONE 'UTC';
ALTER TABLE subtasks ALTER COLUMN created_at  TYPE TIMESTAMPTZ USING created_at  AT TIME ZONE 'UTC';
ALTER TABLE task_dependencies ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE user_settings ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE user_settings ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
ALTER TABLE focus_sessions ALTER COLUMN started_at TYPE TIMESTAMPTZ USING started_at AT TIME ZONE 'UTC';
ALTER TABLE focus_sessions ALTER COLUMN ended_at   TYPE TIMESTAMPTZ USING ended_at   AT TIME ZONE 'UTC';
COMMIT;
```

`AT TIME ZONE 'UTC'` reinterprets a stored naive value as UTC rather than
shifting it, so existing timestamps keep the meaning they had. Confirm with:

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'tasks' AND column_name IN ('due_date', 'created_at');
-- both should read 'timestamp with time zone'
```

---

## Holidays

Nepali public holidays are a checked-in JSON file, `frontend/src/data/nepalHolidays.json`, updated by hand each year.

There is no API for this, which was checked rather than assumed. **Nager.Date** is the usual free option and does not carry Nepal at all — `NP` is absent from `/api/v3/AvailableCountries`, and a direct query for 2026 returns `204`. **Calendarific** and **AbstractAPI** both require a key, so Nepal coverage could not be verified. **timeanddate.com** has correct 2026 data but answers scripted requests with `403`. **Google Calendar's** holiday feed needs a registered API key. The closest match, `casualsnek/npEventsAPI`, publishes usable JSON on GitHub, but its current-year file (BS 2083) has one populated day out of 365.

So the trade is explicit: ~5 minutes of maintenance once a year when the gazette publishes, in exchange for no network call, no key, no rate limit, and no new way for the app to fail. Entries carry a `type` (`public` / `optional` / `local`) because a nationwide day off and a regional festival are not the same thing for planning. Dates carried forward ahead of the gazette are marked `provisional` rather than presented as confirmed — lunar-calendar dates in an unpublished year genuinely cannot be known.

---

## Setup

```bash
# Backend
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && cd ..
cp .env.example .env      # then edit it, see below

# Frontend
cd frontend && npm install && cd ..

./setup.sh                # migrations + seed, for local sqlite or a Neon URL
./start.sh                # backend :8000, frontend :5173
```

If `backend/.venv` fails to create with `ensurepip is not available`, install `python3.13-venv`, or use `uv venv backend/.venv`.

### Configuration

`.env` is gitignored. Fill in:

| Variable | Notes |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio. Keys now use the `AQ.` prefix, not `AIza`, that is the current format, not a mistake. |
| `AI_MODEL` | `gemini-3.5-flash-lite` works. `gemini-2.0-flash` is retired and returns 404. |
| `AUTH_PASSWORD` | Empty falls back to a default, set it. |
| `CORS_ORIGINS` | Add your host's origin, or the browser will block API calls from a non-localhost UI. |
| `DATABASE_URL` | `sqlite:///./data/app.db` locally. Relative to process CWD. |

---

## Keyboard

Press `M` for the in-app manual. It is deliberately unreachable from the UI, no nav item, no palette entry, so it cannot become clutter once you know it.

| Key | Action |
|---|---|
| `N` | Capture. Focuses the inline field on Today, opens the full modal elsewhere. |
| `Cmd/Ctrl+N` | Full capture, from anywhere |
| `A` | AI assistant |
| `J` | Create or manage projects |
| `P` | Plan my day |
| `/` | Command palette and search |
| `T` `I` `K` `C` `D` `W` | Today / Inbox / Kanban / Calendar / Daily Log / Weekly Review |
| `M` | Manual (toggles) |
| `Esc` | Close anything |

Shortcuts suspend while a focus timer runs, and never fire inside a text input.

---

## Tests

```bash
# End-to-end API suite, needs a server on :8001 with an isolated DB
rm -f /tmp/nexus_e2e.db
DATABASE_URL="sqlite:////tmp/nexus_e2e.db" AI_PROVIDER=mock PYTHONPATH=. \
  backend/.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8001 &
PYTHONPATH=. backend/.venv/bin/python backend/seed.py   # the suite asserts on seed data
backend/.venv/bin/python backend/tests/e2e_tests.py

# Query-count regression, isolated in-memory DB, never touches app data
backend/.venv/bin/python backend/tests/perf_test.py
```

`e2e_tests.py`. 123 assertions pass, covering auth, task CRUD, timezone round-trips, subtasks, dependencies, projects, tags, quick-add parsing, activity, reflections, settings, and every AI endpoint.

`perf_test.py`, asserts the task list issues ≤5 queries and that the count **does not grow with row count**. Testing the fixed ceiling rather than a wall-clock number is deliberate: the bug was O(n) round-trips, so the property to protect is O(1).

Frontend: `npm run build && npx tsc -b && npx oxlint src && npm audit`.

---

## Deployment

`render.yaml` and `build.sh` are included.

### Your data is disappearing because the filesystem is ephemeral

Render's free web services have an **ephemeral filesystem**. Every deploy, and every spin-down after 15 minutes idle, throws away the container and its contents. Your `sqlite:///./data/app.db` lives in that container, so every deploy starts you from zero. This is not a bug in the app, and no amount of code changes will fix it.

Two facts about the free tier that rule out the obvious workarounds:

- **Persistent disks are not available on free web services.** Render rejects the blueprint with `disks are not supported for free tier services`. This is a paid-plan feature.
- **Render's own free Postgres expires 30 days after creation.** It is not a durable home for your data.

The fix is an external Postgres database. Your code already supports it; only `DATABASE_URL` changes.

**Neon** is the best fit for free tier: no expiry, 1 GB per project, and it scales to zero after 5 minutes idle then wakes in a few hundred milliseconds. Supabase's free tier also works but pauses projects after a week of low activity, which needs a manual restore.

1. Create a project at [neon.tech](https://neon.tech), take the **pooled** connection string.
2. Run `./setup.sh` and paste that string. It creates the schema and checks it, so Render never has to guess.
3. In Render, set `DATABASE_URL` to the same string under Environment. It is declared `sync: false` in `render.yaml` so the blueprint never overwrites it.
4. Deploy.

### Migrating your existing tasks

Only if you want to bring tasks over from an older database. Skip it for a
fresh project.

```bash
# Preview first. Writes nothing.
backend/.venv/bin/python backend/scripts/migrate_sqlite_to_postgres.py \
  --target "postgresql://user:pass@host/db?sslmode=require"

# Then copy.
backend/.venv/bin/python backend/scripts/migrate_sqlite_to_postgres.py \
  --target "postgresql://user:pass@host/db?sslmode=require" --apply
```

The script opens your source database read-only, skips rows whose primary key
already exists so it is safe to re-run, and copies parents before children so
foreign keys resolve.

After switching, the boot log tells you which database you are on:

```
[Startup] Database: ep-xxx-pooler/neon.tech/neondb (persistent)
```

If it ever prints a sqlite warning instead, you are back on an ephemeral filesystem and the next deploy will wipe your data.

---

## A note on the design work

The UI was audited with the [Hallmark](https://github.com/nutlope/hallmark) anti-slop skill, which scores existing code against named AI tells and returns a punch list without editing. It found, among others: Inter used as both display and body with no pairing face; a single-hue palette; `shadow-2xl` (24px blur) as the default reach for "modal"; and a decorative `feTurbulence` grain overlay at `z-index: 9999`.

The instinct to keep it installed and run `hallmark audit` before adding UI features is a good one. Most of what made this project feel generic was not a missing feature, it was features that nobody had the nerve to remove.