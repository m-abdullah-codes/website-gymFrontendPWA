/**
 * Core weight/rep math — dependency-free primitives shared by every plan:
 * 1RM estimation, cold-start seeding, reps↔%1RM, unit conversion, and
 * equipment-aware rounding. Ported from the reference engine
 * (temp-weight-rep-engine); ALL math runs in kilograms — the research
 * coefficients are kg-calibrated (arXiv:2603.17495). Convert lb at the
 * display boundary only.
 */

const LB_PER_KG = 2.2046226218;
export const lbToKg = (lb: number): number => lb / LB_PER_KG;
export const kgToLb = (kg: number): number => kg * LB_PER_KG;

/* ---------------------------------------------------------------------------
 * 1RM — research weight-dependent equation (primary).
 * 1RM = w * (1 + (r-1)^0.85 / k(w)),  k(w) = max(0.5, -2.55 + 4.58·ln(w)).
 * ------------------------------------------------------------------------- */
const RESEARCH = { alpha: 0.85, a: -2.55, b: 4.58, kFloor: 0.5 };

/** Estimate one-rep max (kg) from a near-failure set (RIR ~0–1). */
export function estimate1RM(weightKg: number, reps: number): number {
  if (!(weightKg > 0) || !(reps >= 1)) {
    throw new Error("estimate1RM: weightKg must be > 0 and reps >= 1");
  }
  if (reps === 1) return weightKg;
  const k = Math.max(
    RESEARCH.kFloor,
    RESEARCH.a + RESEARCH.b * Math.log(weightKg),
  );
  return weightKg * (1 + Math.pow(reps - 1, RESEARCH.alpha) / k);
}

/** Epley — used only for smooth e1RM trend lines, never prescription. */
export const epley1RM = (w: number, r: number): number => w * (1 + r / 30);

/**
 * Invert the research equation: the weight that should yield `reps` at a
 * given 1RM. k(w) depends on w, so solve numerically (monotonic bisection).
 */
export function weightForReps(e1rmKg: number, reps: number): number {
  if (reps <= 1) return e1rmKg;
  let lo = 0.0001;
  let hi = e1rmKg;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (estimate1RM(mid, reps) > e1rmKg) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/* ---------------------------------------------------------------------------
 * Cold start — low-confidence 1RM seed for a never-trained user, from
 * untrained bodyweight-strength standards scaled by sex and age.
 * ------------------------------------------------------------------------- */

type MovementPattern =
  "squat" | "hinge" | "benchPress" | "overhead" | "row" | "pulldown" | "curl";

const UNTRAINED_RATIO: Record<
  MovementPattern,
  { male: number; female: number }
> = {
  squat: { male: 0.75, female: 0.55 },
  hinge: { male: 1.0, female: 0.65 },
  benchPress: { male: 0.5, female: 0.32 },
  overhead: { male: 0.35, female: 0.22 },
  row: { male: 0.5, female: 0.35 },
  pulldown: { male: 0.55, female: 0.4 },
  curl: { male: 0.18, female: 0.1 },
};

const LIFT_PATTERN: Record<string, MovementPattern> = {
  "back-squat": "squat",
  "front-squat": "squat",
  "leg-press": "squat",
  deadlift: "hinge",
  "romanian-deadlift": "hinge",
  "dumbbell-romanian-deadlift": "hinge",
  "barbell-bench-press": "benchPress",
  "dumbbell-bench-press": "benchPress",
  "barbell-incline-bench-press": "benchPress",
  "dumbbell-incline-bench-press": "benchPress",
  "barbell-shoulder-press": "overhead",
  "dumbbell-shoulder-press": "overhead",
  "standing-press": "overhead",
  "bent-over-barbell-row": "row",
  "dumbbell-row": "row",
  "cable-row": "row",
  "lat-pulldown": "pulldown",
  "pull-up": "pulldown",
  "barbell-curl": "curl",
  "dumbbell-bicep-curl": "curl",
};

/** Age multiplier — strength peaks ~20–30, declines conservatively after. */
export function ageFactor(ageYears: number): number {
  const pts: [number, number][] = [
    [18, 0.9],
    [25, 1.0],
    [30, 1.0],
    [40, 0.95],
    [50, 0.88],
    [60, 0.8],
    [70, 0.7],
    [80, 0.6],
  ];
  if (ageYears <= pts[0][0]) return pts[0][1];
  if (ageYears >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a0, f0] = pts[i];
    const [a1, f1] = pts[i + 1];
    if (ageYears >= a0 && ageYears <= a1) {
      return f0 + ((f1 - f0) * (ageYears - a0)) / (a1 - a0);
    }
  }
  return 1.0;
}

export type Experience = "untrained" | "beginner" | "intermediate" | "advanced";

const EXPERIENCE_MULT: Record<Experience, number> = {
  untrained: 1.0,
  beginner: 1.2,
  intermediate: 1.55,
  advanced: 2.0,
};

export type SeedResult = {
  e1rmKg: number | null;
  confidence: "low";
  recommendTest: true;
  pattern: MovementPattern | null;
  note: string;
};

export function seedE1RM(p: {
  sex: "male" | "female";
  ageYears: number;
  bodyweightKg: number;
  liftSlug: string;
  experience?: Experience;
}): SeedResult {
  const pattern = LIFT_PATTERN[p.liftSlug] ?? null;
  const baseNote =
    "Estimated from age, sex and bodyweight only. Recommended: log one " +
    "calibration set so the measured e1RM replaces this guess.";

  // Isolation/unknown movement: seed from a main lift via referenceLift instead.
  if (!pattern || pattern === "curl") {
    return {
      e1rmKg: null,
      confidence: "low",
      recommendTest: true,
      pattern,
      note:
        "No bodyweight standard for this movement. Seed it from a main " +
        "lift via referenceLift + referencePct instead, then autoregulate.",
    };
  }

  const sexKey = p.sex === "female" ? "female" : "male";
  const ratio = UNTRAINED_RATIO[pattern][sexKey];
  const mult = EXPERIENCE_MULT[p.experience ?? "untrained"] ?? 1.0;
  let e1rmKg = p.bodyweightKg * ratio * ageFactor(p.ageYears) * mult;

  // Never seed below an empty olympic bar for barbell lifts; round to 0.5 kg.
  e1rmKg = Math.max(20, Math.round(e1rmKg * 2) / 2);

  let note = baseNote;
  if (p.ageYears < 16) {
    note =
      "User may be a minor — start with the empty bar / bodyweight and supervise; this estimate is advisory only.";
  } else if (p.ageYears > 70) {
    note =
      "Older beginner — start light, extend warm-ups, and consider clearance from a physician. Estimate is advisory.";
  }

  return { e1rmKg, confidence: "low", recommendTest: true, pattern, note };
}

/* ---------------------------------------------------------------------------
 * Reps ↔ %1RM table (Epley-consistent) for percentage-based plans (M5).
 * ------------------------------------------------------------------------- */
const REP_PCT: Record<number, number> = {
  1: 1.0,
  2: 0.97,
  3: 0.94,
  4: 0.92,
  5: 0.89,
  6: 0.86,
  7: 0.83,
  8: 0.81,
  9: 0.78,
  10: 0.75,
  11: 0.73,
  12: 0.71,
  13: 0.69,
  14: 0.67,
  15: 0.65,
};

export function repsToPercent(reps: number): number {
  if (reps <= 1) return 1.0;
  if (REP_PCT[reps]) return REP_PCT[reps];
  return Math.max(0.5, 1 / (1 + reps / 30));
}

/* ---------------------------------------------------------------------------
 * Equipment classification + rounding — never prescribe an unloadable weight.
 * ------------------------------------------------------------------------- */
export type EquipmentCategory =
  "barbell" | "dumbbellPair" | "machine" | "cable" | "bodyweight";

const INCREMENT_KG: Record<string, number> = {
  barbell: 2.5,
  barbellMicro: 1.25,
  dumbbellPair: 2,
  machine: 5,
  cable: 5,
  bodyweight: 0,
};

/**
 * Classify the raw `equipment` array from the exercise library into a load
 * category. Scans ALL tokens by priority — the loaded implement is not always
 * first (e.g. ["Preacher Curl Bench","EZ Bar"] → barbell).
 */
export function classifyEquipment(
  equipmentArr: string[] = [],
): EquipmentCategory {
  const t = equipmentArr.join(" | ").toLowerCase();
  if (/dumbbell/.test(t)) return "dumbbellPair";
  if (/barbell|ez bar|\bt bar\b|smith|trap bar|hex bar/.test(t))
    return "barbell";
  if (/cable|pulley|rope cable/.test(t)) return "cable";
  if (
    /machine|leg press|hack|sled|hammer strength|pec deck|leg extension|leg curl/.test(
      t,
    )
  )
    return "machine";
  if (/bodyweight|ab wheel|dip bar|pull-?up bar|bench$|^bench/.test(t))
    return "bodyweight";
  return "barbell";
}

/** Round to the nearest loadable increment for the equipment. */
export function roundToEquipment(
  weightKg: number,
  equipment: EquipmentCategory | string[] = "barbell",
  micro = false,
): number {
  const cat = Array.isArray(equipment)
    ? classifyEquipment(equipment)
    : equipment;
  if (cat === "bodyweight") return 0;
  const step =
    cat === "barbell" && micro
      ? INCREMENT_KG.barbellMicro
      : (INCREMENT_KG[cat] ?? 2.5);
  return Math.round(weightKg / step) * step;
}

/* ---------------------------------------------------------------------------
 * Parse "sets"/"reps" strings ("3-4", "8-12", "20", "Failure", "AMRAP",
 * "10 Each", "40-80 Yards", "12, 10, 8, 6", "5/3/1").
 * ------------------------------------------------------------------------- */
export type ParsedRange = {
  min: number | null;
  max: number | null;
  repsPerSet: number[] | null;
  special: "amrap" | "perSide" | "duration" | null;
};

export function parseRange(str: string | null | undefined): ParsedRange {
  if (str == null)
    return { min: null, max: null, repsPerSet: null, special: null };
  const s = String(str).trim();
  const special = /failure|amrap/i.test(s)
    ? ("amrap" as const)
    : /each/i.test(s)
      ? ("perSide" as const)
      : /yard|sec|min/i.test(s)
        ? ("duration" as const)
        : null;
  // Per-set ladder: comma list "12, 10, 8, 6" (pyramids) or slash "5/3/1" (waves).
  if (s.includes(",") || /^\d+(\s*\/\s*\d+)+$/.test(s)) {
    const repsPerSet = s
      .split(/[,/]/)
      .map((x) => parseInt(x, 10))
      .filter((n) => !isNaN(n));
    if (repsPerSet.length > 1) {
      return {
        min: Math.min(...repsPerSet),
        max: Math.max(...repsPerSet),
        repsPerSet,
        special,
      };
    }
  }
  const m = s.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (m) return { min: +m[1], max: +m[2], repsPerSet: null, special };
  const one = s.match(/(\d+)/);
  if (one) return { min: +one[1], max: +one[1], repsPerSet: null, special };
  return { min: null, max: null, repsPerSet: null, special };
}
