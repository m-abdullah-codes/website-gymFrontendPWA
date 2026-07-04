# Gym User App

Mobile-first gym PWA built with Next.js. The entire product runs client-side —
plan picking, weight/rep prescription, progression, streaks, muscle heat maps
and meal planning are all local algorithms over bundled data, persisted to
`localStorage`. No auth, no backend required; a Cloudflare Worker later only
persists what the client already computed (see `docs/BACKEND_PLAN.md`).

## Stack

- **Next.js 16** (App Router, `cacheComponents` + `unstable_instant` on every
  route — instant static shells are validated at build time)
- **React 19** · **TypeScript** · **Tailwind CSS v4**
- **zustand** (persisted client state) · **Lucide React** (icons)
- Installable PWA (`src/app/manifest.ts`, icons in `public/icons/`)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → redirects to
`/memberships` (the sales page). The app itself starts at `/home`; first-run
users are pointed to `/onboarding`, which assigns one of the 16 bundled plans
and seeds every page. Settings → "Load 8 weeks of demo history" fills the app
with plausible data for walkthroughs; "Reset all data" reverts to fresh.

## The pages

| Route              | What it does                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `/onboarding`      | Question flow (training + nutrition), body stats, deterministic plan assignment with "why this plan" reasons, rep-max calibration |
| `/home`            | Workout page: plan hero + switcher (16 plans, per-plan progress preserved), today's prescribed workout, week layout               |
| `/workout/record`  | Live session: timer, per-set weight/rep steppers, done toggles, finish summary (volume, est. kcal, PRs, streak credit)            |
| `/exercise/[slug]` | 50vh video + Instructions / Target / Equipment tabs (all 180 statically generated)                                                |
| `/exercises`       | Searchable, muscle-filtered library                                                                                               |
| `/body`            | Targets (PUSH/PULL/LEGS rings, streak card), Silhouette (SVG heat map + recovery model), Progress (calendar, trends, sessions)    |
| `/meals`           | Daily meal plan from the meal engine, macro rings, one-tap logging, swaps, protein-first "what's left" suggestions                |
| `/leaderboard`     | Streak-ranked podium + list (mock data), community feed with reactions/comments (mock data)                                       |
| `/settings`        | Every onboarding answer editable, units/warm-ups/cardio/stretching, streak pause, demo seed / reset                               |

## Architecture

```
src/
├── app/                  # Routes — thin server shells; all state is client-side
├── components/
│   ├── ui/               # Primitives: Button, Badge, IconButton, ProgressBar, Sheet, Dialog
│   ├── layout/           # AppShell, AppHeader, BottomNav (+ Start dialog), blobs
│   ├── home/             # Plan hero, tabs, today/week views
│   ├── workout/          # WorkoutHome, PlanSwitcherSheet, RecordWorkout, SetRow, timers
│   ├── body/             # BodyTabs, StatRing, SilhouetteFigure/Tab, ProgressTab
│   ├── meals/            # MealsHome, MacroRings, swap/log sheets
│   ├── exercises/        # Detail page, library list, video thumbnails
│   ├── leaderboard/      # Podium, rankings, community feed
│   ├── settings/         # Settings sections + editors
│   └── onboarding/       # Question flow, stats, reveal, rep maxes
├── data/
│   ├── exercises.json    # 16 enriched plans + 180-exercise library + load config
│   ├── foods.json        # Pakistani food DB v1.1 (138 items)
│   └── community.ts      # Mock leaderboard/feed content
├── lib/
│   ├── engine/           # Weight/rep engine: 1RM math, prescription, progression
│   │                     #   (M1–M5), plan picker, weekly scheduling, swaps
│   ├── meals/            # Meal engine: BMR/TDEE targets, day-plan generation,
│   │                     #   swaps, logging, adaptive weekly adjustment, search
│   ├── streak/           # Session validity + weekly close + shields + milestones
│   ├── volume/           # Fractional muscle volume, recovery model, silhouette map
│   ├── store/            # zustand stores: user, workout, streak, meals
│   ├── hooks/            # useActivePlan, useMeals (derived view state)
│   └── demo/             # Demo-history seeder (Settings)
└── styles/tokens.css     # Design tokens
```

**State model.** Four persisted stores (`gym.user.v1`, `gym.workout.v1`,
`gym.streak.v1`, `gym.meals.v1`). Per-plan progress (`lifts`,
`exerciseState`, swaps, rotation position) lives under
`workoutStore.planProgress[planId]` — switching plans never discards
anything. All engine math runs in kg; unit conversion happens at display.

**Engines.** Ported 1:1 from the reference implementations and verified
output-identical before the references were deleted (weight engine: 132
prescriptions + 200 progression updates diffed; meal engine: full profile
grid + the original 61-assertion suite; plan picker: all 1,440 quiz
combinations). Streak rules are unit-tested (`npm test`).

**Silhouette.** Four SVG bodies in `public/silhouettes/` are fetched and
DOMParser-injected at runtime; all logic keys off path `id`s and colors via
`path.style.fill` (per-path CSS classes would override attributes). Muscle ↔
path mapping lives in `src/lib/volume/silhouette.ts`.

## Design System

All visual tokens live in `src/styles/tokens.css` as plain CSS custom properties. `globals.css` re-exposes a subset of them as Tailwind theme colors/radii via `@theme inline` (e.g. `--color-ink` → the `text-ink`/`bg-ink` utilities); tokens without a Tailwind name are still available anywhere via arbitrary-value syntax, e.g. `px-[var(--spacing-page-x)]`.

**Background**

| Token                                       | Value                | Tailwind utility   | Usage                                      |
| ------------------------------------------- | -------------------- | ------------------ | ------------------------------------------ |
| `--color-bg-base`                           | `#000000`            | `surface`          | Page background                            |
| `--color-bg-deep`                           | `#000814`            | `surface-deep`     | Page gradient top, viewport `theme-color`  |
| `--color-bg-elevated`                       | `#0a1628`            | `surface-elevated` | Elevated circles (avatar ring background)  |
| `--color-button-muted`                      | `rgba(30,41,59,0.8)` | `surface-muted`    | Muted button/badge backgrounds             |
| `--color-bg-surface` / `--color-bg-overlay` | translucent navy     | — (CSS var only)   | Reserved for future overlay/sheet surfaces |

**Accent**

| Token                 | Value                  | Tailwind utility | Usage                               |
| --------------------- | ---------------------- | ---------------- | ----------------------------------- |
| `--color-accent`      | `#2B59FF`              | `accent`         | Active states, glows, focus accents |
| `--color-accent-glow` | `rgba(43,89,255,0.45)` | `accent-glow`    | Drop-shadow/glow effects            |
| `--color-accent-soft` | `rgba(43,89,255,0.15)` | — (CSS var only) | Soft accent fills                   |

**Text**

| Token                    | Value     | Tailwind utility | Usage                                              |
| ------------------------ | --------- | ---------------- | -------------------------------------------------- |
| `--color-text-primary`   | `#ffffff` | `ink`            | Headings, primary content                          |
| `--color-text-secondary` | `#94A3B8` | `ink-secondary`  | Subtitles, metadata                                |
| `--color-text-muted`     | `#64748b` | `ink-muted`      | De-emphasized text                                 |
| `--color-text-inverse`   | `#0f172a` | `ink-inverse`    | Text on light/white surfaces (e.g. primary Button) |

**Border & UI**

| Token                                              | Value                               | Tailwind utility | Usage                                                |
| -------------------------------------------------- | ----------------------------------- | ---------------- | ---------------------------------------------------- |
| `--color-border-subtle`                            | `rgba(255,255,255,0.08)`            | `border-subtle`  | Default hairline rings (`ring-1 ring-border-subtle`) |
| `--color-border-strong`                            | `rgba(255,255,255,0.15)`            | — (CSS var only) | Emphasized borders                                   |
| `--color-badge-active`                             | `#ffffff`                           | `badge`          | Active-status badge background                       |
| `--color-progress-track` / `--color-progress-fill` | `rgba(255,255,255,0.2)` / `#ffffff` | `track` / `fill` | `ProgressBar` component                              |
| `--color-card-border`                              | `rgba(105,150,225,0.24)`            | — (CSS var only) | Card outer borders (hero, dialogs)                   |

**Radius & Layout**

| Token                                         | Value                | Tailwind utility | Usage                                |
| --------------------------------------------- | -------------------- | ---------------- | ------------------------------------ |
| `--radius-card`                               | `2rem`               | `radius-card`    | Hero/membership cards                |
| `--radius-nav`                                | `2.5rem`             | `radius-nav`     | Bottom nav pill (desktop)            |
| `--radius-button`                             | `9999px`             | — (CSS var only) | Fully-rounded buttons                |
| `--spacing-page-x` / `--spacing-page-y`       | `1.5rem` / `1.25rem` | — (CSS var only) | `AppShell` page padding              |
| `--max-width-content` / `--max-width-desktop` | `28rem` / `72rem`    | — (CSS var only) | Content vs. desktop shell width caps |
| `--bottom-nav-height`, `--nav-*-size`         | various              | — (CSS var only) | Bottom nav sizing                    |

A further ~30 highly-specific `--card-*` tokens in `tokens.css` exist only to drive `MembershipCard`'s layered gradient "cradle" background and glow effects — they're intentionally single-purpose and not meant to be reused elsewhere.

**Motion**

`globals.css` defines a `@theme` block of animation tokens (`--animate-fade-up`, `--animate-fade-in`, `--animate-scale-in`, `--animate-check-pop`, `--animate-ring-spin`, `--animate-blob-a`–`d`) with their `@keyframes`, exposed as `animate-*` utilities. Always apply them behind the `motion-safe:` variant so reduced-motion users get static UI; stagger entrances with an inline `animationDelay`.

**Conventions worth knowing**

- Reach for a `components/ui/` primitive (`Button`, `Badge`, `IconButton`,
  `ProgressBar`, `Sheet`, `Dialog`) before writing new one-off UI.
- Glass/blur: write `backdrop-filter` through a CSS var (see
  `BottomNav.module.css`) — the compiler strips literal declarations.
- Keep `favicon`/icons in `public/` — file-based app-dir icons break
  `unstable_instant` validation.
- New pages: export `unstable_instant` and keep server shells free of
  runtime data; state hydrates client-side behind `useHydrated()`.

## Scripts

| Command          | Description                               |
| ---------------- | ----------------------------------------- |
| `npm run dev`    | Start development server                  |
| `npm run build`  | Production build (validates instant navs) |
| `npm test`       | Streak/session-validity engine unit tests |
| `npm run lint`   | Run ESLint                                |
| `npm run format` | Format with Prettier                      |

## Backend

Nothing here needs a server today. When accounts land, the write-only
Cloudflare Worker plan (KV/D1/R2/DO mapping + API surface) is in
[`docs/BACKEND_PLAN.md`](docs/BACKEND_PLAN.md).
# website-gymFrontendPWA
