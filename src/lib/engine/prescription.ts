/**
 * getPrescription — turn (plan, dayIndex, userProfile) into the exact working
 * + warm-up sets for a session. Faithful port of the reference engine; all
 * math in kg, display conversion at the boundary via userProfile.units.
 */
import type {
  ExerciseLibraryEntry,
  PlanExercise,
  WorkoutPlan,
} from "@/data/exercises";
import {
  classifyEquipment,
  estimate1RM,
  kgToLb,
  roundToEquipment,
  seedE1RM,
  weightForReps,
  type EquipmentCategory,
} from "./core";
import type {
  EngineUserProfile,
  PrescribedSet,
  EngineMessage,
  SessionPrescription,
  WeightUnits,
} from "./types";

/** Absolute conservative floors when nothing can be seeded (kg). */
const CATEGORY_FLOOR_KG: Record<EquipmentCategory, number> = {
  barbell: 20,
  dumbbellPair: 4,
  machine: 10,
  cable: 5,
  bodyweight: 0,
};

const r2 = (x: number) => Math.round(x * 100) / 100;

type ExerciseLibrary = Record<string, ExerciseLibraryEntry>;

type WorkingCache = {
  working: Record<string, number>;
  workingRes: Record<string, ResolvedWorking>;
};

type ResolvedWorking = {
  workingKg: number;
  confidence: "high" | "low";
  recommendTest: boolean;
  source: string;
  note?: string;
};

function equipmentFor(
  ex: PlanExercise | { slug: string },
  lib: ExerciseLibrary,
): string[] {
  return lib[ex.slug]?.equipment ?? [];
}

export function categoryFor(
  ex: PlanExercise,
  lib: ExerciseLibrary,
): EquipmentCategory {
  return ex.loadCategory || classifyEquipment(equipmentFor(ex, lib));
}

/** Round to loadable kg, then express for display in the user's units. */
export function displayWeight(
  weightKg: number | null,
  units: WeightUnits,
): number | null {
  if (weightKg == null) return null;
  if (units === "lb") return Math.round(kgToLb(weightKg) / 2.5) * 2.5;
  return r2(weightKg);
}

/** Working weight (~5RM) of a REFERENCE lift. Memoized per session. */
function refWorkingKg(
  refSlug: string,
  userProfile: EngineUserProfile,
  cache: WorkingCache,
): number | null {
  const st = userProfile.exerciseState?.[refSlug];
  if (st?.workingKg && st.workingKg > 0) return st.workingKg;
  if (cache.working[refSlug] != null) return cache.working[refSlug];
  const lift = userProfile.lifts?.[refSlug];
  if (lift && lift.e1rmKg > 0) {
    const w = weightForReps(lift.e1rmKg, 5);
    cache.working[refSlug] = w;
    return w;
  }
  const seed = seedE1RM({
    sex: userProfile.sex,
    ageYears: userProfile.ageYears,
    bodyweightKg: userProfile.bodyweightKg,
    liftSlug: refSlug,
    experience: userProfile.experience,
  });
  if (seed.e1rmKg && seed.e1rmKg > 0) {
    const w = weightForReps(seed.e1rmKg, 5);
    cache.working[refSlug] = w;
    return w;
  }
  return null;
}

type ResolvedE1RM = {
  e1rmKg: number | null;
  source: string;
  confidence: "high" | "low";
  recommendTest: boolean;
  note?: string;
};

/** e1RM (kg) from a lift's OWN history/standard (no reference seeding). */
function resolveE1RM(
  slug: string,
  userProfile: EngineUserProfile,
): ResolvedE1RM {
  const lift = userProfile.lifts?.[slug];
  if (lift && lift.e1rmKg > 0) {
    return {
      e1rmKg: lift.e1rmKg,
      source: lift.source || "stored",
      confidence: "high",
      recommendTest: false,
    };
  }
  const seed = seedE1RM({
    sex: userProfile.sex,
    ageYears: userProfile.ageYears,
    bodyweightKg: userProfile.bodyweightKg,
    liftSlug: slug,
    experience: userProfile.experience,
  });
  if (seed.e1rmKg && seed.e1rmKg > 0) {
    return {
      e1rmKg: seed.e1rmKg,
      source: "seed:bodyweight",
      confidence: seed.confidence,
      recommendTest: seed.recommendTest,
      note: seed.note,
    };
  }
  return {
    e1rmKg: null,
    source: "none",
    confidence: "low",
    recommendTest: true,
    note: seed.note,
  };
}

/** Starting WORKING weight (kg) at a rep target. Memoized so a lift and the
 *  accessories that reference it stay mutually consistent within a session. */
function resolveWorkingKg(
  slug: string,
  ex: PlanExercise,
  userProfile: EngineUserProfile,
  lib: ExerciseLibrary,
  targetReps: number,
  cache: WorkingCache,
): ResolvedWorking {
  const st = userProfile.exerciseState?.[slug];
  if (st?.workingKg && st.workingKg > 0) {
    return {
      workingKg: st.workingKg,
      confidence: "high",
      recommendTest: false,
      source: "stored",
    };
  }
  if (cache.workingRes[slug]) return cache.workingRes[slug];
  const cat = categoryFor(ex, lib);
  const floorFor = CATEGORY_FLOOR_KG[cat] ?? 0;
  let res: ResolvedWorking | null = null;

  // 1) The lift's own stored e1RM.
  const lift = userProfile.lifts?.[slug];
  if (lift && lift.e1rmKg > 0) {
    const wk = Math.max(
      roundToEquipment(
        weightForReps(lift.e1rmKg, Math.max(targetReps, 1)),
        cat,
      ),
      floorFor,
    );
    res = {
      workingKg: wk,
      confidence: "high",
      recommendTest: false,
      source: "stored-e1rm",
    };
  }
  // 2) Seed off a reference lift (resolves & caches the reference, even cold).
  else if (ex.referenceLift && ex.referenceLift !== slug && ex.referencePct) {
    const rw = refWorkingKg(ex.referenceLift, userProfile, cache);
    if (rw && rw > 0) {
      const wk = Math.max(
        roundToEquipment(rw * ex.referencePct, cat),
        floorFor,
      );
      res = {
        workingKg: wk,
        confidence: "low",
        recommendTest: true,
        source: "reference:" + ex.referenceLift,
        note:
          "Seeded from " +
          ex.referenceLift +
          " at " +
          Math.round(ex.referencePct * 100) +
          "% — log a set to calibrate.",
      };
    }
  }
  // 3) Own bodyweight standard (halve for per-dumbbell loads — the standard is bilateral).
  if (!res) {
    const e = resolveE1RM(slug, userProfile);
    if (e.e1rmKg && e.e1rmKg > 0) {
      let ideal = weightForReps(e.e1rmKg, Math.max(targetReps, 1));
      if (cat === "dumbbellPair") ideal *= 0.5;
      const wk = Math.max(roundToEquipment(ideal, cat), floorFor);
      res = {
        workingKg: wk,
        confidence: e.confidence,
        recommendTest: e.recommendTest,
        source: e.source,
        note: e.note,
      };
    }
  }
  // 4) Absolute floor by category (pure isolation with no reference).
  if (!res) {
    res = {
      workingKg: floorFor || 20,
      confidence: "low",
      recommendTest: true,
      source: "floor:" + cat,
      note: "No history or reference — starting at the lightest sensible load; the first sessions will autoregulate.",
    };
  }
  cache.workingRes[slug] = res;
  cache.working[slug] = res.workingKg;
  return res;
}

type ResolvedTM = {
  tmKg: number;
  confidence: "high" | "low";
  recommendTest: boolean;
  source: string;
  note?: string;
};

/** Training Max (kg) for M5 main lifts. */
function resolveTrainingMax(
  slug: string,
  ex: PlanExercise,
  userProfile: EngineUserProfile,
  lib: ExerciseLibrary,
  tmFactor: number,
): ResolvedTM {
  const lift = userProfile.lifts?.[slug];
  if (lift && lift.trainingMaxKg > 0) {
    return {
      tmKg: lift.trainingMaxKg,
      confidence: "high",
      recommendTest: false,
      source: "stored",
    };
  }
  const e = resolveE1RM(slug, userProfile);
  if (e.e1rmKg && e.e1rmKg > 0) {
    return {
      tmKg: e.e1rmKg * (tmFactor || 0.9),
      confidence: e.confidence,
      recommendTest: e.recommendTest,
      source: e.source,
      note: e.note,
    };
  }
  const cat = categoryFor(ex, lib);
  return {
    tmKg: (CATEGORY_FLOOR_KG[cat] || 20) * (tmFactor || 0.9),
    confidence: "low",
    recommendTest: true,
    source: "floor",
  };
}

type WarmupRamp = { sets: { pct: number; reps: number }[] };

function buildWarmups(
  topKg: number,
  cat: EquipmentCategory,
  ramp: WarmupRamp | undefined,
  units: WeightUnits,
  restSec: number,
): Omit<PrescribedSet, "slug" | "name" | "role" | "loadMode">[] {
  const out: Omit<PrescribedSet, "slug" | "name" | "role" | "loadMode">[] = [];
  if (!(topKg > 30) || cat === "bodyweight") return out; // not worth ramping light loads
  const sets = ramp?.sets ?? [
    { pct: 0.5, reps: 5 },
    { pct: 0.7, reps: 3 },
    { pct: 0.85, reps: 2 },
  ];
  for (const s of sets) {
    const w = roundToEquipment(topKg * s.pct, cat);
    if (w <= 0 || w >= topKg) continue;
    out.push({
      isWarmup: true,
      weightKg: w,
      weightDisplay: displayWeight(w, units),
      reps: s.reps,
      repsText: String(s.reps),
      targetRIR: null,
      restSec: Math.min(restSec || 90, 90),
    });
  }
  return out;
}

type DeloadStatus = {
  due: boolean;
  factor: number;
  method: string;
  builtIn: boolean;
  reasons: string[];
};

/** Deload check — policy is stored on the plan; the app decides the UX. */
export function deloadStatus(
  plan: WorkoutPlan,
  userProfile: EngineUserProfile,
): DeloadStatus {
  const policy = plan.deload ?? {};
  const weeksSince = userProfile.weeksSinceDeload ?? 0;
  let due = false;
  const reasons: string[] = [];
  if (policy.everyWeeks && weeksSince >= policy.everyWeeks) {
    due = true;
    reasons.push("scheduled: " + weeksSince + "w since last deload");
  }
  if (policy.trigger === "onStall" || /Stall/.test(policy.trigger ?? "")) {
    const states = Object.values(userProfile.exerciseState ?? {});
    const stalled = states.filter(
      (s) =>
        (s.stallCount || 0) >= (plan.progressionParams?.stallSessions ?? 3),
    );
    if (stalled.length) {
      due = true;
      reasons.push(stalled.length + " lift(s) stalled");
    }
  }
  return {
    due,
    factor: policy.factor ?? 0.9,
    method: policy.method ?? "percent",
    builtIn: !!policy.builtIn,
    reasons,
  };
}

export type PrescriptionOptions = {
  exerciseLibrary?: ExerciseLibrary;
  warmupRamp?: WarmupRamp;
  applyDeload?: boolean;
  /** Skip the warm-up ramp entirely (user preference). */
  includeWarmups?: boolean;
};

export function getPrescription(
  plan: WorkoutPlan,
  dayIndex: number,
  userProfile: EngineUserProfile,
  opts: PrescriptionOptions = {},
): SessionPrescription {
  const lib = opts.exerciseLibrary ?? {};
  const units = userProfile?.units ?? "kg";
  const warmupCfg = opts.warmupRamp;
  const includeWarmups = opts.includeWarmups !== false;
  const day = plan.days[dayIndex];
  if (!day) throw new Error("getPrescription: no day at index " + dayIndex);

  const model = plan.progressionModel;
  const pp = plan.progressionParams ?? {};
  const deload = deloadStatus(plan, userProfile);
  const applyDeload = !!opts.applyDeload && deload.due && !deload.builtIn;
  const messages: EngineMessage[] = [];
  const seen = new Set<string>();
  const sets: PrescribedSet[] = [];
  const cache: WorkingCache = { working: {}, workingRes: {} };

  for (const ex of day.exercises) {
    const cat = categoryFor(ex, lib);
    const restSec = ex.restSec || 90;
    const repsMin = ex.repsMin ?? 5;
    const nWork = Math.max(1, ex.setsMin || ex.setsMax || 3);
    const push = (
      s: Omit<PrescribedSet, "slug" | "name" | "role" | "loadMode">,
    ) =>
      sets.push({
        slug: ex.slug,
        name: ex.name,
        role: ex.role,
        loadMode: ex.loadMode,
        ...s,
      });
    const pushWarmups = (topKg: number) => {
      if (!includeWarmups) return;
      buildWarmups(topKg, cat, warmupCfg, units, restSec).forEach(push);
    };
    const calib = (res: { recommendTest: boolean; note?: string }) => {
      if (res.recommendTest && !seen.has(ex.slug)) {
        seen.add(ex.slug);
        messages.push({
          slug: ex.slug,
          type: "calibration",
          text:
            (ex.name || ex.slug) +
            ": " +
            (res.note || "log a calibration set for accuracy."),
        });
      }
    };
    const scale = (w: number | null) =>
      applyDeload && w != null ? roundToEquipment(w * deload.factor, cat) : w;

    /* ---- Non-loaded modes ---- */
    if (ex.loadMode === "duration") {
      push({
        isWarmup: false,
        setIndex: 0,
        weightKg: null,
        weightDisplay: null,
        reps: null,
        repsText: String(ex.reps),
        targetRIR: null,
        restSec,
        note: "Duration/distance — not load-bearing.",
      });
      continue;
    }
    if (ex.loadMode === "bodyweight") {
      const amrap = ex.special === "amrap";
      for (let i = 0; i < nWork; i++) {
        push({
          isWarmup: false,
          setIndex: i,
          weightKg: 0,
          weightDisplay: 0,
          reps: amrap ? null : repsMin,
          repsText: amrap ? "AMRAP" : String(repsMin),
          targetRIR: amrap ? 0 : ex.targetRIR,
          restSec,
          note: "Bodyweight — track max reps; add a belt/vest only once reps exceed the top of range.",
        });
      }
      continue;
    }

    /* ---- M5: percentage of Training Max (wave) ---- */
    if (ex.loadMode === "percent1RM") {
      const tmRes = resolveTrainingMax(
        ex.slug,
        ex,
        userProfile,
        lib,
        pp.tmFactor ?? 0.9,
      );
      calib(tmRes);
      const week = (userProfile.exerciseState?.[ex.slug]?.cycleWeek ?? 0) % 4;
      const waves = plan.loadScheme?.waves;
      const ppWave = pp.wave ?? [[0.75, 0.8, 0.85]];
      const wave = waves
        ? [waves.A, waves.B, waves.C, waves.D_deload][week]
        : {
            pct: ppWave[week] ?? ppWave[0],
            reps: (pp.waveReps ?? [5])[week] as number | number[],
          };
      const pcts = wave?.pct ?? [0.75, 0.8, 0.85];
      const repsArr = Array.isArray(wave?.reps)
        ? wave.reps
        : pcts.map(() => wave?.reps as number);
      const isDeloadWave = week === (pp.deloadWaveIndex ?? 3);
      const topKg = roundToEquipment(tmRes.tmKg * pcts[pcts.length - 1], cat);
      pushWarmups(topKg);
      pcts.forEach((p, i) => {
        const w = roundToEquipment(tmRes.tmKg * p, cat);
        const lastSet = i === pcts.length - 1;
        const amrap = lastSet && pp.amrapLastSet && !isDeloadWave;
        push({
          isWarmup: false,
          setIndex: i,
          weightKg: w,
          weightDisplay: displayWeight(w, units),
          reps: amrap ? null : (repsArr[i] as number),
          repsText: amrap ? repsArr[i] + "+ (AMRAP)" : String(repsArr[i]),
          targetRIR: amrap ? 0 : 1,
          restSec,
          note: amrap
            ? "Last set: as many reps as possible (drives e1RM)."
            : undefined,
        });
      });
      continue;
    }

    /* ---- Pyramid: ascending load, descending reps (40+ plans) ---- */
    if (ex.loadMode === "pyramid" && ex.repsPerSet && ex.repsPerSet.length) {
      const minReps = Math.min(...ex.repsPerSet);
      const wRes = resolveWorkingKg(
        ex.slug,
        ex,
        userProfile,
        lib,
        minReps,
        cache,
      );
      calib(wRes);
      const e1 = estimate1RM(wRes.workingKg, minReps); // anchor ladder off the heaviest set
      ex.repsPerSet.forEach((reps, i) => {
        let w = roundToEquipment(weightForReps(e1, reps), cat);
        w = scale(w) as number;
        push({
          isWarmup: false,
          setIndex: i,
          weightKg: w,
          weightDisplay: displayWeight(w, units),
          reps,
          repsText: String(reps) + (ex.unilateral ? " /side" : ""),
          targetRIR: ex.targetRIR ?? 2,
          restSec,
          note:
            i === ex.repsPerSet!.length - 1
              ? "Heaviest set — drives progression. Never to failure (2-3 RIR)."
              : undefined,
        });
      });
      continue;
    }

    /* ---- M4: rep-goal / total volume (6-day powerbuilding) ---- */
    if (ex.loadMode === "repGoal") {
      const total = ex.repsMax ?? repsMin; // for this plan `reps` is the TOTAL
      const perSet = Math.max(1, Math.round(total / nWork));
      const wRes = resolveWorkingKg(
        ex.slug,
        ex,
        userProfile,
        lib,
        perSet,
        cache,
      );
      calib(wRes);
      const firstMainIdx = day.exercises.findIndex((e) => e.role === "main");
      const isFirst =
        ex.role === "main" && day.exercises.indexOf(ex) === firstMainIdx;
      if (isFirst) pushWarmups(scale(wRes.workingKg) as number);
      for (let i = 0; i < nWork; i++) {
        const w = scale(wRes.workingKg);
        push({
          isWarmup: false,
          setIndex: i,
          weightKg: w,
          weightDisplay: displayWeight(w, units),
          reps: perSet,
          repsText: String(perSet),
          targetRIR: ex.targetRIR,
          restSec,
          note:
            i === 0
              ? "Rep-goal total " + total + " across " + nWork + " sets."
              : undefined,
        });
      }
      if (isFirst && plan.loadScheme?.firstExerciseEachDay) {
        const bo = plan.loadScheme.firstExerciseEachDay.backoffSet;
        const w = scale(
          roundToEquipment(
            wRes.workingKg * (bo?.loadPctOfWorking ?? pp.backoffPct ?? 0.8),
            cat,
          ),
        );
        push({
          isWarmup: false,
          setIndex: nWork,
          weightKg: w,
          weightDisplay: displayWeight(w, units),
          reps: null,
          repsText: "AMRAP",
          targetRIR: 0,
          restSec,
          note:
            "Back-off AMRAP at " +
            Math.round((pp.backoffPct ?? 0.8) * 100) +
            "% — record reps.",
        });
      }
      continue;
    }

    /* ---- Ramped: warm-up ramp to a top working set (Bill Starr / M&S mains) ---- */
    if (ex.loadMode === "ramped" || ex.setScheme === "ramped") {
      const wRes = resolveWorkingKg(
        ex.slug,
        ex,
        userProfile,
        lib,
        repsMin,
        cache,
      );
      calib(wRes);
      const topKg = scale(wRes.workingKg) as number;
      pushWarmups(topKg);
      const topSetOnly = plan.loadScheme?.repsAre === "topSetTarget";
      const workingSets = topSetOnly ? 1 : nWork;
      for (let i = 0; i < workingSets; i++) {
        push({
          isWarmup: false,
          setIndex: i,
          weightKg: topKg,
          weightDisplay: displayWeight(topKg, units),
          reps: repsMin,
          repsText: String(repsMin),
          targetRIR: ex.targetRIR ?? 1,
          restSec,
          note: i === 0 ? "Top working set after the ramp." : undefined,
        });
      }
      continue;
    }

    /* ---- Default: rir / linear straight sets ---- */
    const wRes = resolveWorkingKg(
      ex.slug,
      ex,
      userProfile,
      lib,
      repsMin,
      cache,
    );
    calib(wRes);
    const workKg = scale(wRes.workingKg) as number;
    if (ex.role === "main") pushWarmups(workKg);
    const amrap = ex.special === "amrap";
    for (let i = 0; i < nWork; i++) {
      push({
        isWarmup: false,
        setIndex: i,
        weightKg: workKg,
        weightDisplay: displayWeight(workKg, units),
        reps: amrap ? null : repsMin,
        repsText:
          (amrap ? "AMRAP" : String(repsMin)) + (ex.unilateral ? " /side" : ""),
        targetRIR: amrap ? 0 : ex.targetRIR,
        restSec,
      });
    }
  }

  if (deload.due) {
    messages.push({
      type: "deload",
      text:
        "Deload " +
        (deload.builtIn
          ? "is built into this week's wave."
          : "recommended (" +
            deload.reasons.join("; ") +
            "). " +
            (applyDeload
              ? "Applied at " + Math.round(deload.factor * 100) + "%."
              : "Pass opts.applyDeload to apply ~" +
                Math.round(deload.factor * 100) +
                "%.")),
    });
  }

  return {
    planName: plan.plan,
    day: day.day,
    dayIndex,
    units,
    model,
    deloadDue: deload.due,
    deloadApplied: applyDeload,
    deloadFactor: deload.factor,
    messages,
    sets,
  };
}
