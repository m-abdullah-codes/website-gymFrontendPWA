# Backend Plan — Cloudflare Worker + Storage

The frontend is complete without a server: every algorithm (plan picking,
prescription, progression, streaks, heat maps, meal planning) runs on the
client over bundled data, and state persists in `localStorage`. The backend's
only job is to make that state durable across devices and to power the two
genuinely multi-user features: the leaderboard and the community feed.

**Philosophy: the Worker validates and persists; it never computes.** Payload
shapes below are exactly the client store shapes — the server stores what the
client already derived, plus the minimal aggregation reads need.

---

## 1. Storage mapping

| Data                                     | Store              | Why                                                                                                                                       |
| ---------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| User profile + settings (answers, stats) | **KV**             | Single small JSON blob, read-mostly, eventual consistency is fine. Key `user:{id}:profile`.                                               |
| Per-plan progress (lifts, exerciseState) | **KV**             | One blob per plan: `user:{id}:plan:{planId}`. Written after each session; last-write-wins with a `rev` counter is sufficient.             |
| Workout sessions (history)               | **D1**             | Relational + queryable (weekly rollups, PR lookups, date ranges). Append-only rows; sets stored as a JSON column (never queried per-set). |
| Streak state + weekly outcomes           | **D1**             | Small tables; weekly closes are idempotent upserts keyed `(user_id, week_start)`.                                                         |
| Meal logs, weigh-ins, plan swaps         | **D1**             | Date-keyed rows; day logs as JSON columns (client is the only consumer).                                                                  |
| Leaderboard (per gym)                    | **Durable Object** | One DO per gym: serialized rank updates, in-memory sorted list, instant reads. Alarm recomputes weekly on Monday close.                   |
| Community feed (per gym)                 | **Durable Object** | Same DO (or a sibling): ordered post list, reaction counters without race conditions, fan-out-free reads.                                 |
| Post photos, share-card images           | **R2**             | Blobs. Client uploads via presigned URL from the Worker; feed stores the R2 key.                                                          |
| Exercise dataset, plans, food DB         | **none**           | Ships inside the app bundle by design. Versioned updates ride app deploys.                                                                |

Identity for v1 pitch→production: an anonymous `user_id` (ULID) minted on
first sync, held in a signed cookie/`Authorization` token; upgradeable to real
auth later without schema changes. Every user belongs to one `gym_id`.

## 2. D1 schema

```sql
CREATE TABLE users (
  id         TEXT PRIMARY KEY,          -- ULID
  gym_id     TEXT NOT NULL,
  alias      TEXT NOT NULL,             -- leaderboard display name
  created_at INTEGER NOT NULL
);
CREATE INDEX users_gym ON users (gym_id);

CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,       -- client-generated UUID (idempotency)
  user_id       TEXT NOT NULL REFERENCES users(id),
  plan_id       TEXT NOT NULL,
  day_index     INTEGER NOT NULL,
  date          TEXT NOT NULL,          -- local YYYY-MM-DD (client's tz)
  started_at    TEXT NOT NULL,
  ended_at      TEXT NOT NULL,
  duration_sec  INTEGER NOT NULL,
  credited      INTEGER NOT NULL,       -- client-computed; server re-checks caps
  volume_kg     REAL NOT NULL,
  est_kcal      INTEGER NOT NULL,
  pr_slugs      TEXT NOT NULL,          -- JSON array
  unscheduled   INTEGER NOT NULL,
  exercises     TEXT NOT NULL           -- JSON: SessionExerciseRecord[]
);
CREATE INDEX sessions_user_date ON sessions (user_id, date);

CREATE TABLE week_outcomes (
  user_id        TEXT NOT NULL REFERENCES users(id),
  week_start     TEXT NOT NULL,         -- Monday YYYY-MM-DD
  valid_sessions INTEGER NOT NULL,
  target         INTEGER NOT NULL,
  outcome        TEXT NOT NULL,         -- success | shielded | failed | paused
  streak_after   INTEGER NOT NULL,
  PRIMARY KEY (user_id, week_start)
);

CREATE TABLE streak_state (
  user_id       TEXT PRIMARY KEY REFERENCES users(id),
  streak_weeks  INTEGER NOT NULL,
  longest_weeks INTEGER NOT NULL,
  shields       INTEGER NOT NULL,
  paused        INTEGER NOT NULL,
  weekly_target INTEGER NOT NULL,
  start_date    TEXT,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE meal_logs (
  user_id TEXT NOT NULL REFERENCES users(id),
  date    TEXT NOT NULL,
  log     TEXT NOT NULL,                -- JSON DayLog (entries, nextId)
  PRIMARY KEY (user_id, date)
);

CREATE TABLE weigh_ins (
  user_id   TEXT NOT NULL REFERENCES users(id),
  date      TEXT NOT NULL,
  weight_kg REAL NOT NULL,
  PRIMARY KEY (user_id, date)
);
```

KV blobs (schema-less, versioned with `{ rev, data }`):

- `user:{id}:profile` — answers, stats, units, warm-up preference
- `user:{id}:plan:{planId}` — `PlanProgress` (lifts, exerciseState, swaps,
  sessionsCompleted, startedAt, weeklyTarget)
- `user:{id}:meals` — seedSalt, kcalAdjustment, dislikedFoodIds, planSwaps

## 3. Worker API surface

All writes are idempotent (client-generated ids / date keys) so the offline
queue can retry safely. Reads exist for device restore + the two social pages.

```
POST /v1/sync/profile          { rev, profile }            → KV put
POST /v1/sync/plan-progress    { planId, rev, progress }   → KV put
POST /v1/sessions              WorkoutSession              → D1 insert-or-ignore,
                                                             then DO.notifyRank(user)
POST /v1/weeks/close           WeekOutcome + streak_state  → D1 upsert both,
                                                             then DO.updateRank(user)
POST /v1/meals/log             { date, log }               → D1 upsert
POST /v1/weigh-ins             { date, weightKg }          → D1 upsert
GET  /v1/restore               → everything above for this user (new device)

GET  /v1/leaderboard           → DO read: podium + ranked rows (cached 60s)
GET  /v1/feed?before=…         → DO read: paginated posts
POST /v1/feed/posts            { kind, text?, recap?, milestone?, photoKey? }
POST /v1/feed/posts/:id/react  { kind: like|fire|flex, on: boolean }
POST /v1/feed/posts/:id/comments { text }
POST /v1/uploads/presign       { contentType } → { url, key }   (R2 presigned PUT)
```

**Gym Durable Object** (one per `gym_id`):

- Holds the sorted leaderboard `[{ userId, alias, streakWeeks, headline }]`
  in storage + memory; `updateRank()` is called on weekly close (streak is a
  weekly number, so writes are rare); reads are O(1) snapshots.
- Holds the feed as a reverse-chronological list with per-post reaction
  counters and comment arrays — single-threaded execution makes counters
  race-free without transactions.
- Weekly alarm (Mon 00:30 UTC-shifted per gym timezone) prunes stale ranks
  (users with no close in 2+ weeks marked inactive) and can auto-generate
  milestone posts queued for user approval (Strava-style).

## 4. What stays client-side forever

- Prescription + progression math (M1–M5), plan picking, schedules, swaps
- Streak computation (server only _stores_ closes; it can re-derive from
  sessions for audit when the verified tier arrives)
- Meal targets, day-plan generation, swap fitting, adaptive adjustment
- Heat-map/recovery math and every rendering concern

Anti-cheat/provenance, per-set sanity caps and the verified leaderboard tier
are deliberately deferred (per the product brief) — when they land, they slot
in as a Worker-side validation pass over the already-stored `sessions` rows,
no client changes required to keep logging.

## 5. Cost posture

- KV: a handful of small blobs per user, written a few times/week.
- D1: append-heavy tables with tiny rows; weekly-close upserts.
- DO: one object per gym (not per user); active only on writes + 60s-cached
  leaderboard reads; weekly alarm.
- R2: photos only; presigned uploads keep bytes off the Worker.
- No cron fleets, no queues, no server rendering: the Worker is a thin,
  mostly-idle persistence shim — which is the whole point.
