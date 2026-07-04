/**
 * Muscle-volume + recovery engine for the Body page.
 *
 * - Ring groups (PUSH/PULL/LEGS) are fixed per exercise by primary muscle.
 * - Fractional volume per set: primary 1.0, strong secondary 0.5, minor
 *   synergist 0.25 (the library lists primaries and an ordered secondary
 *   list — the first secondary counts as "strong", the rest as minor).
 * - Recovery% = min(100, 100 × hours_since_last_hard_session / T_rec),
 *   T_rec = T_base × V_factor × A_factor.
 */
import { exerciseLibrary, type WorkoutPlan } from "@/data/exercises";
import type { SessionExerciseRecord, WorkoutSession } from "@/lib/store/types";
import { fromLocalISODate, weekStartOf, addDays } from "@/lib/streak/engine";

/* ---------------------------------------------------------------------------
 * Muscle vocabulary.
 * ------------------------------------------------------------------------- */

export const MUSCLES = [
  "Chest",
  "Shoulders",
  "Triceps",
  "Back",
  "Biceps",
  "Trapezius",
  "Forearms",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Adductors",
  "Abductors",
  "Lower Back",
  "Abs",
  "Obliques",
] as const;

export type Muscle = (typeof MUSCLES)[number];

export type RingGroup = "push" | "pull" | "legs";
export type SetGroup = RingGroup | "core";

/** Fixed group per primary muscle (deadlift → Legs regardless of program day). */
const MUSCLE_GROUP: Record<Muscle, SetGroup> = {
  Chest: "push",
  Shoulders: "push",
  Triceps: "push",
  Back: "pull",
  Biceps: "pull",
  Trapezius: "pull",
  Forearms: "pull",
  Quads: "legs",
  Hamstrings: "legs",
  Glutes: "legs",
  Calves: "legs",
  Adductors: "legs",
  Abductors: "legs",
  "Lower Back": "legs",
  Abs: "core",
  Obliques: "core",
};

export function groupForExercise(slug: string): SetGroup | null {
  const primary = exerciseLibrary[slug]?.primaryMuscles[0] as
    Muscle | undefined;
  if (!primary) return null;
  return MUSCLE_GROUP[primary] ?? null;
}

/* ---------------------------------------------------------------------------
 * Weekly ring targets.
 * ------------------------------------------------------------------------- */

export type GroupTargets = Record<SetGroup, number>;

/**
 * Weekly target per group: sum of scheduled sets (upper bound of set ranges)
 * across the week's actual layout. For rotating plans the layout already
 * reflects the live 7-day window, satisfying the recompute rule.
 */
export function weeklyTargets(
  plan: WorkoutPlan,
  weekDayIndexes: (number | null)[],
): GroupTargets {
  const totals: GroupTargets = { push: 0, pull: 0, legs: 0, core: 0 };
  for (const dayIndex of weekDayIndexes) {
    if (dayIndex == null) continue;
    const day = plan.days[dayIndex];
    if (!day) continue;
    for (const ex of day.exercises) {
      if (ex.loadMode === "duration") continue;
      const group = groupForExercise(ex.slug);
      if (!group) continue;
      totals[group] += Math.max(ex.setsMax ?? 0, ex.setsMin ?? 0) || 3;
    }
  }
  return totals;
}

/** Mid-week start: target = ceil(full × remaining_days / 7). */
export function prorateGroupTargets(
  targets: GroupTargets,
  startedAt: string,
  weekStart: string,
): GroupTargets {
  if (weekStartOf(startedAt) !== weekStart) return targets;
  const startIdx = (fromLocalISODate(startedAt).getDay() + 6) % 7;
  const remaining = 7 - startIdx;
  const scale = (n: number) => Math.ceil((n * remaining) / 7);
  return {
    push: scale(targets.push),
    pull: scale(targets.pull),
    legs: scale(targets.legs),
    core: scale(targets.core),
  };
}

/** Completed working sets per group within [weekStart, weekStart+7d). */
export function weeklyCompleted(
  sessions: WorkoutSession[],
  weekStart: string,
  activeExercises?: SessionExerciseRecord[],
): GroupTargets {
  const end = addDays(weekStart, 7);
  const totals: GroupTargets = { push: 0, pull: 0, legs: 0, core: 0 };
  const countRecord = (ex: SessionExerciseRecord) => {
    const group = groupForExercise(ex.slug);
    if (!group) return;
    totals[group] += ex.sets.filter((s) => s.done && !s.isWarmup).length;
  };
  for (const session of sessions) {
    if (session.date < weekStart || session.date >= end) continue;
    session.exercises.forEach(countRecord);
  }
  // Sets are credited the moment they're logged — include the live session.
  activeExercises?.forEach(countRecord);
  return totals;
}

/** The 10–20 working-set science band used for coach hints. */
export const SET_BAND = { min: 10, max: 20 };

/* ---------------------------------------------------------------------------
 * Fractional volume per muscle (heat map).
 * ------------------------------------------------------------------------- */

export type MuscleVolume = Record<Muscle, number>;

function emptyVolume(): MuscleVolume {
  return Object.fromEntries(MUSCLES.map((m) => [m, 0])) as MuscleVolume;
}

/** Fractional involvement of each muscle in one exercise. */
export function muscleFractions(slug: string): Partial<Record<Muscle, number>> {
  const entry = exerciseLibrary[slug];
  if (!entry) return {};
  const out: Partial<Record<Muscle, number>> = {};
  for (const m of entry.primaryMuscles as Muscle[]) {
    out[m] = Math.max(out[m] ?? 0, 1.0);
  }
  (entry.secondaryMuscles as Muscle[]).forEach((m, i) => {
    out[m] = Math.max(out[m] ?? 0, i === 0 ? 0.5 : 0.25);
  });
  return out;
}

/** Sum fractional working-set volume per muscle over the last `days` days. */
export function fractionalVolume(
  sessions: WorkoutSession[],
  now: Date,
  days = 7,
): MuscleVolume {
  const totals = emptyVolume();
  const cutoff = now.getTime() - days * 86400000;
  for (const session of sessions) {
    if (new Date(session.endedAt).getTime() < cutoff) continue;
    for (const ex of session.exercises) {
      const done = ex.sets.filter((s) => s.done && !s.isWarmup).length;
      if (!done) continue;
      const fractions = muscleFractions(ex.slug);
      for (const [muscle, f] of Object.entries(fractions)) {
        totals[muscle as Muscle] += done * f;
      }
    }
  }
  return totals;
}

/** Heat-map buckets aligned to the science bands (12.5–19 ≈ optimal). */
export const VOLUME_BUCKETS = [
  { min: 0, max: 0, label: "0 sets" },
  { min: 0.5, max: 3, label: "0.5–3" },
  { min: 3.5, max: 7, label: "3.5–7" },
  { min: 7.5, max: 12, label: "7.5–12" },
  { min: 12.5, max: 19, label: "12.5–19 · optimal" },
  { min: 20, max: Infinity, label: "20+ · caution" },
] as const;

export function volumeBucket(sets: number): number {
  if (sets <= 0) return 0;
  if (sets <= 3) return 1;
  if (sets <= 7) return 2;
  if (sets <= 12) return 3;
  if (sets < 20) return 4;
  return 5;
}

/* ---------------------------------------------------------------------------
 * Recovery model.
 * ------------------------------------------------------------------------- */

/** Base recovery window (hours) per muscle. */
const T_BASE: Record<Muscle, number> = {
  Biceps: 36,
  Triceps: 36,
  Forearms: 36,
  Calves: 36,
  Abs: 36,
  Obliques: 36,
  Trapezius: 36,
  Chest: 48,
  Back: 48,
  Shoulders: 48,
  Quads: 60,
  Hamstrings: 60,
  Glutes: 60,
  Adductors: 60,
  Abductors: 60,
  "Lower Back": 72,
};

export type RecoveryState = "fresh" | "recovering" | "fatigued" | "untrained";

export type MuscleRecovery = {
  muscle: Muscle;
  state: RecoveryState;
  /** 0–100; 100 = fully recovered. */
  pct: number;
  /** Hours until fully recovered (0 when fresh/untrained). */
  etaHours: number;
  lastTrained: string | null;
  /** Hard sets (involvement ≥ 0.5) in the last qualifying session. */
  hardSets: number;
};

/**
 * Recovery per muscle from session history.
 * A "hard session" for a muscle = one with ≥1 working set at involvement ≥0.5.
 */
export function muscleRecovery(
  sessions: WorkoutSession[],
  now: Date,
  ageYears: number,
): Record<Muscle, MuscleRecovery> {
  const aFactor = ageYears >= 40 ? 1.25 : 1.0;
  const out = {} as Record<Muscle, MuscleRecovery>;

  for (const muscle of MUSCLES) {
    let last: { endedAt: string; hardSets: number } | null = null;
    let trainedInWindow = false;
    for (const session of sessions) {
      let hardSets = 0;
      let anyVolume = false;
      for (const ex of session.exercises) {
        const f = muscleFractions(ex.slug)[muscle] ?? 0;
        if (f <= 0) continue;
        const done = ex.sets.filter((s) => s.done && !s.isWarmup).length;
        if (!done) continue;
        anyVolume = true;
        if (f >= 0.5) hardSets += done;
      }
      if (!anyVolume) continue;
      const ageDays =
        (now.getTime() - new Date(session.endedAt).getTime()) / 86400000;
      if (ageDays < 7) trainedInWindow = true;
      if (hardSets > 0 && (!last || session.endedAt > last.endedAt)) {
        last = { endedAt: session.endedAt, hardSets };
      }
    }

    if (!last || !trainedInWindow) {
      out[muscle] = {
        muscle,
        state: "untrained",
        pct: 100,
        etaHours: 0,
        lastTrained: last?.endedAt ?? null,
        hardSets: 0,
      };
      continue;
    }

    const hours = (now.getTime() - new Date(last.endedAt).getTime()) / 3600000;
    const vFactor = Math.min(
      1.5,
      Math.max(0.8, 0.8 + (0.1 * last.hardSets) / 5),
    );
    const tRec = T_BASE[muscle] * vFactor * aFactor;
    const pct = Math.min(100, (100 * hours) / tRec);
    const state: RecoveryState =
      pct >= 85 ? "fresh" : pct >= 40 ? "recovering" : "fatigued";
    out[muscle] = {
      muscle,
      state,
      pct: Math.round(pct),
      etaHours: Math.max(0, Math.ceil(tRec - hours)),
      lastTrained: last.endedAt,
      hardSets: last.hardSets,
    };
  }
  return out;
}

/**
 * e1RM history for one exercise across sessions (Epley for smoothness —
 * trend lines only, never prescription).
 */
export function e1rmHistory(
  sessions: WorkoutSession[],
  slug: string,
): { date: string; e1rm: number }[] {
  const points: { date: string; e1rm: number }[] = [];
  for (const session of [...sessions].sort((a, b) =>
    a.date < b.date ? -1 : 1,
  )) {
    let best = 0;
    for (const ex of session.exercises) {
      if (ex.slug !== slug) continue;
      for (const s of ex.sets) {
        if (!s.done || s.isWarmup || !s.weightKg || !s.reps) continue;
        const e = s.weightKg * (1 + s.reps / 30); // Epley
        if (e > best) best = e;
      }
    }
    if (best > 0)
      points.push({ date: session.date, e1rm: Math.round(best * 10) / 10 });
  }
  return points;
}

/** Top exercises contributing volume to a muscle in the last `days` days. */
export function topExercisesFor(
  sessions: WorkoutSession[],
  muscle: Muscle,
  now: Date,
  days = 7,
  n = 3,
): { slug: string; name: string; sets: number }[] {
  const cutoff = now.getTime() - days * 86400000;
  const bySlug = new Map<
    string,
    { slug: string; name: string; sets: number }
  >();
  for (const session of sessions) {
    if (new Date(session.endedAt).getTime() < cutoff) continue;
    for (const ex of session.exercises) {
      const f = muscleFractions(ex.slug)[muscle] ?? 0;
      if (f < 0.5) continue;
      const done = ex.sets.filter((s) => s.done && !s.isWarmup).length;
      if (!done) continue;
      const cur = bySlug.get(ex.slug) ?? {
        slug: ex.slug,
        name: ex.name,
        sets: 0,
      };
      cur.sets += done;
      bySlug.set(ex.slug, cur);
    }
  }
  return [...bySlug.values()].sort((a, b) => b.sets - a.sets).slice(0, n);
}
