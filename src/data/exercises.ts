import exercisesData from "./exercises.json";

/** Progression models — see docs in the enriched plan data.
 *  M1 linear · M2 double progression · M3 reps→sets→weight ·
 *  M4 rep-goal/total-volume · M5 percentage-of-training-max wave. */
export type ProgressionModel = "M1" | "M2" | "M3" | "M4" | "M5";

export type LoadCategory =
  "barbell" | "dumbbellPair" | "machine" | "cable" | "bodyweight";

export type ExerciseRole = "main" | "accessory" | "isolation";

export type LoadMode =
  | "rir"
  | "linear"
  | "ramped"
  | "bodyweight"
  | "duration"
  | "repGoal"
  | "percent1RM"
  | "pyramid";

export type SetScheme = "straight" | "ramped" | "pyramid";

export type SpecialRepRule = "amrap" | "perSide" | "duration" | "" | null;

export type PlanExercise = {
  name: string;
  slug: string;
  sets: string;
  reps: string;
  setsMin: number | null;
  setsMax: number | null;
  repsMin: number | null;
  repsMax: number | null;
  repsPerSet: number[] | null;
  loadCategory: LoadCategory;
  role: ExerciseRole;
  loadMode: LoadMode;
  setScheme: SetScheme;
  targetRIR: number | null;
  restSec: number;
  increment: { kg: number } | null;
  referenceLift: string | null;
  referencePct: number | null;
  referencePctBasis: string | null;
  unilateral: boolean;
  bodyweight: boolean;
  special: SpecialRepRule;
  progression: string;
  alternates?: string[];
};

export type PlanDay = {
  day: string;
  exercises: PlanExercise[];
};

export type LoadScheme = {
  model: string;
  repsAre: string;
  note?: string;
  topSet?: { reps: number };
  rampJumpPct?: number[];
  weekly?: Record<string, unknown>;
  waves?: Record<string, { pct: number[]; reps: number | number[] }>;
  firstExerciseEachDay?: {
    backoffSet?: { loadPctOfWorking?: number };
  };
  start?: string;
  reset?: string;
  [key: string]: unknown;
};

export type ProgressionParams = {
  incrementUpperKg?: number;
  incrementLowerKg?: number;
  deloadFactor?: number;
  stallSessions?: number;
  progressBy?: "session" | "week";
  weeklyIncrementPct?: number;
  topOfRangeAllSets?: boolean;
  maxBonusSets?: number;
  repGoalMarginSmall?: number;
  repGoalMarginBig?: number;
  smallJumpUpperKg?: number;
  smallJumpLowerKg?: number;
  bigJumpUpperKg?: number;
  bigJumpLowerKg?: number;
  backoffPct?: number;
  wave?: number[][];
  waveReps?: (number | number[])[];
  tmFactor?: number;
  resetTmFactor?: number;
  addUpperKg?: number;
  addLowerKg?: number;
  amrapLastSet?: boolean;
  deloadWaveIndex?: number;
  [key: string]: unknown;
};

export type DeloadPolicy = {
  everyWeeks?: number;
  trigger?: string;
  method?: string;
  factor?: number;
  builtIn?: boolean;
};

export type WorkoutPlan = {
  plan: string;
  level: string;
  daysPerWeek: number;
  split: string;
  goals: string[];
  planSource: string;
  loadScheme?: LoadScheme;
  progressionModel: ProgressionModel;
  progressionParams: ProgressionParams;
  deload?: DeloadPolicy;
  restByRole?: { mainSec: number; accessorySec: number; isolationSec: number };
  defaultRIR?: { strength: number; hypertrophy: number };
  days: PlanDay[];
};

export type ExerciseLibraryEntry = {
  name: string;
  fitbodUrl?: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  instructions: string[];
  videoUrl?: string;
};

export type LoadConfig = {
  units: "kg";
  fitbodParams: { alpha: number; a: number; b: number; kFloor: number };
  trustRepsMax: number;
  trainingMaxFactor: number;
  defaultTargetRIR: number;
  repToPercent: Record<string, number>;
  rounding: Record<string, number>;
  seedRatiosByBodyweight: Record<
    string,
    Record<string, Record<string, number>>
  >;
  warmupRamp?: { sets: { pct: number; reps: number }[] };
  [key: string]: unknown;
};

export type ExercisesData = {
  loadConfig: LoadConfig;
  userProfileTemplate: Record<string, unknown>;
  exerciseDataSource: string;
  plans: WorkoutPlan[];
  exerciseLibrary: Record<string, ExerciseLibraryEntry>;
};

export const exercises = exercisesData as unknown as ExercisesData;

export const { plans, exerciseLibrary, loadConfig } = exercises;

/** Stable id for a plan, derived from its display name ("PHUL — Power…" → "phul"). */
export function planId(plan: WorkoutPlan): string {
  return plan.plan
    .toLowerCase()
    .split(/[—(]/)[0]
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const plansById = new Map(plans.map((p) => [planId(p), p]));

export function getPlanById(id: string): WorkoutPlan | undefined {
  return plansById.get(id);
}

export const PLAN_IDS = plans.map(planId);
