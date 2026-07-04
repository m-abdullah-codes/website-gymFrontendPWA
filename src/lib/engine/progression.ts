/**
 * applyProgression — after a session, read the logged sets for one exercise
 * and produce the user's next-session state under the plan's progression
 * model (M1–M5). Pure: the input profile is cloned, never mutated, so store
 * updates stay predictable.
 */
import type {
  ExerciseLibraryEntry,
  PlanExercise,
  WorkoutPlan,
} from "@/data/exercises";
import { estimate1RM, roundToEquipment } from "./core";
import { categoryFor } from "./prescription";
import type { EngineUserProfile, LoggedSet, ProgressionChange } from "./types";

const r2 = (x: number) => Math.round(x * 100) / 100;

export function applyProgression(
  plan: WorkoutPlan,
  exercise: PlanExercise,
  loggedSets: LoggedSet[],
  userProfile: EngineUserProfile,
  opts: {
    exerciseLibrary?: Record<string, ExerciseLibraryEntry>;
    date?: string;
  } = {},
): { userProfile: EngineUserProfile; change: ProgressionChange } {
  const lib = opts.exerciseLibrary ?? {};
  const up: EngineUserProfile = structuredClone(userProfile);
  up.lifts = up.lifts ?? {};
  up.exerciseState = up.exerciseState ?? {};
  const slug = exercise.slug;
  const cat = categoryFor(exercise, lib);
  const pp = plan.progressionParams ?? {};
  const model = plan.progressionModel;
  const lower = /quads|glutes|hamstrings|calves/i.test(
    (lib[slug]?.primaryMuscles ?? []).join(" "),
  );
  const incKg =
    exercise.increment?.kg ??
    (lower ? (pp.incrementLowerKg ?? 5) : (pp.incrementUpperKg ?? 2.5));

  const work = (loggedSets ?? []).filter(
    (s) => !s.isWarmup && s.weightKg != null,
  );
  const change: ProgressionChange = {
    slug,
    model,
    action: "none",
    details: {},
  };

  const st = up.exerciseState[slug] ?? {
    workingKg: null,
    stallCount: 0,
    cycleWeek: 0,
  };
  st.stallCount = st.stallCount || 0;

  /* Recompute e1RM from the best (top / AMRAP) set. */
  if (work.length) {
    let best = 0;
    for (const s of work) {
      if (!(s.weightKg! > 0) || !((s.reps ?? 0) >= 1)) continue;
      const e = estimate1RM(s.weightKg!, s.reps!);
      if (e > best) best = e;
    }
    if (best > 0) {
      const prev = up.lifts[slug];
      // Only raise a stored e1RM (or set it if missing); never silently lower a tested max.
      const newE = prev?.e1rmKg ? Math.max(prev.e1rmKg, best) : best;
      up.lifts[slug] = {
        e1rmKg: r2(newE),
        trainingMaxKg: r2(newE * (pp.tmFactor ?? 0.9)),
        source: prev?.source === "tested" ? "tested" : "estimated",
        updatedAt: opts.date ?? new Date().toISOString().slice(0, 10),
      };
      change.details.e1rmKg = up.lifts[slug].e1rmKg;
    }
  }

  const repsMin = exercise.repsMin ?? 5;
  const repsMax = exercise.repsMax ?? repsMin;
  const allHit = (target: number) =>
    work.length > 0 && work.every((s) => (s.reps ?? 0) >= target);
  const curWorking = st.workingKg ?? work[0]?.weightKg ?? null;

  switch (model) {
    case "M1": {
      // Linear: add increment every completed session; -10% after a stall.
      const weekly = pp.progressBy === "week";
      if (allHit(repsMin)) {
        const bump = weekly
          ? (curWorking ?? 0) * (pp.weeklyIncrementPct ?? 0.025)
          : incKg;
        st.workingKg = roundToEquipment((curWorking ?? 0) + bump, cat);
        st.stallCount = 0;
        change.action = "increment";
        change.details.toKg = st.workingKg;
      } else {
        st.stallCount += 1;
        change.action = "stall";
        change.details.stallCount = st.stallCount;
        if (st.stallCount >= (pp.stallSessions ?? 2)) {
          st.workingKg = roundToEquipment(
            (curWorking ?? 0) * (pp.deloadFactor ?? 0.9),
            cat,
          );
          st.stallCount = 0;
          change.action = "reset-10%";
          change.details.toKg = st.workingKg;
        } else {
          st.workingKg = curWorking;
        }
      }
      break;
    }
    case "M2": {
      // Double progression: top of range on all sets → +increment, reset reps.
      if (allHit(repsMax)) {
        st.workingKg = roundToEquipment((curWorking ?? 0) + incKg, cat);
        st.stallCount = 0;
        change.action = "increment+resetReps";
        change.details.toKg = st.workingKg;
      } else if (allHit(repsMin)) {
        st.workingKg = curWorking;
        change.action = "hold-addReps";
        const prevTop = st.lastSession?.topReps;
        const top = Math.max(...work.map((s) => s.reps ?? 0));
        if (prevTop != null && top <= prevTop) {
          st.stallCount += 1;
          change.details.stallCount = st.stallCount;
        } else st.stallCount = 0;
      } else {
        st.workingKg = curWorking;
        st.stallCount += 1;
        change.action = "miss";
        change.details.stallCount = st.stallCount;
      }
      if (st.stallCount >= (pp.stallSessions ?? 3)) {
        st.workingKg = roundToEquipment(
          (curWorking ?? 0) * (pp.deloadFactor ?? 0.9),
          cat,
        );
        st.stallCount = 0;
        change.action = "deload-10%";
        change.details.toKg = st.workingKg;
      }
      break;
    }
    case "M3": {
      // Reps → sets → weight (SHUL).
      const reps = st.curReps ?? repsMin;
      const setsNow = st.curSets ?? exercise.setsMin ?? 3;
      const maxSets = (exercise.setsMax ?? setsNow) + (pp.maxBonusSets ?? 1);
      if (allHit(reps)) {
        if (reps < repsMax) {
          st.curReps = reps + 1;
          change.action = "addRep";
        } else if (setsNow < maxSets) {
          st.curSets = setsNow + 1;
          st.curReps = repsMin;
          change.action = "addSet";
        } else {
          st.workingKg = roundToEquipment((curWorking ?? 0) + incKg, cat);
          st.curReps = repsMin;
          st.curSets = exercise.setsMin ?? 3;
          change.action = "addWeight+reset";
          change.details.toKg = st.workingKg;
        }
        st.stallCount = 0;
      } else {
        st.workingKg = curWorking;
        st.stallCount += 1;
        change.action = "miss";
        if (st.curReps == null) st.curReps = reps;
        if (st.curSets == null) st.curSets = setsNow;
      }
      break;
    }
    case "M4": {
      // Rep-goal total volume (6-day powerbuilding).
      const totalGoal = exercise.repsMax ?? repsMin;
      const achieved = work.reduce((a, s) => a + (s.reps ?? 0), 0);
      const margin = achieved - totalGoal;
      change.details.achieved = achieved;
      change.details.goal = totalGoal;
      change.details.margin = margin;
      if (margin >= (pp.repGoalMarginBig ?? 4)) {
        st.workingKg = roundToEquipment(
          (curWorking ?? 0) +
            (lower ? (pp.bigJumpLowerKg ?? 5) : (pp.bigJumpUpperKg ?? 5)),
          cat,
        );
        st.stallCount = 0;
        change.action = "bigJump";
      } else if (margin >= 0) {
        st.workingKg = roundToEquipment(
          (curWorking ?? 0) +
            (lower
              ? (pp.smallJumpLowerKg ?? 2.5)
              : (pp.smallJumpUpperKg ?? 2.5)),
          cat,
        );
        st.stallCount = 0;
        change.action = "smallJump";
      } else {
        st.workingKg = curWorking;
        st.stallCount += 1;
        change.action = "miss";
        if (st.stallCount >= 3) {
          st.workingKg = roundToEquipment(
            (curWorking ?? 0) * (pp.deloadFactor ?? 0.9),
            cat,
          );
          st.stallCount = 0;
          change.action = "deload-10%";
        }
      }
      change.details.toKg = st.workingKg;
      break;
    }
    case "M5": {
      // Wave / training max (5/3/1).
      const lift = up.lifts[slug] ?? {
        e1rmKg: 0,
        trainingMaxKg: 0,
        source: "estimated",
        updatedAt: opts.date ?? new Date().toISOString().slice(0, 10),
      };
      const week = (st.cycleWeek ?? 0) % 4;
      const last = work[work.length - 1];
      const wr = (pp.waveReps ?? [5, 3, 1, 5])[week];
      const amrapTarget = Array.isArray(wr) ? wr[wr.length - 1] : wr;
      st.cycleWeek = (week + 1) % 4; // advance the wave each logged session
      if (week === 2) {
        // End of the 5/3/1 work weeks → bump or reset TM at cycle close.
        const missed =
          last &&
          last.reps != null &&
          amrapTarget != null &&
          last.reps < amrapTarget;
        const tmPrev =
          lift.trainingMaxKg ||
          (lift.e1rmKg ? lift.e1rmKg * (pp.tmFactor ?? 0.9) : 0);
        if (missed) {
          const tm = r2(tmPrev * (pp.resetTmFactor ?? 0.9));
          up.lifts[slug] = {
            ...lift,
            trainingMaxKg: tm,
            e1rmKg: r2(tm / (pp.tmFactor ?? 0.9)),
            source: "estimated",
          };
          change.action = "TM-reset-10%";
          change.details.tmKg = tm;
        } else {
          const add = lower ? (pp.addLowerKg ?? 5) : (pp.addUpperKg ?? 2.5);
          const tm = r2(tmPrev + add);
          up.lifts[slug] = {
            ...lift,
            trainingMaxKg: tm,
            e1rmKg: r2(tm / (pp.tmFactor ?? 0.9)),
            source: "estimated",
          };
          change.action = "TM-bump";
          change.details.tmKg = tm;
        }
      } else {
        change.action = "advanceWave";
      }
      change.details.nextWeek = st.cycleWeek;
      break;
    }
    default: {
      if (allHit(repsMax)) {
        st.workingKg = roundToEquipment((curWorking ?? 0) + incKg, cat);
        change.action = "increment";
      } else st.workingKg = curWorking;
    }
  }

  // Record session memory.
  const topReps = work.length
    ? Math.max(...work.map((s) => s.reps ?? 0))
    : null;
  st.lastSession = {
    reps: work.map((s) => s.reps ?? null),
    rir: work.length ? (work[work.length - 1].rir ?? null) : null,
    topReps,
    date: opts.date ?? new Date().toISOString().slice(0, 10),
  };
  if (st.workingKg == null && curWorking != null) st.workingKg = curWorking;
  up.exerciseState[slug] = st;

  return { userProfile: up, change };
}
