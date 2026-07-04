import type { LoadMode, ExerciseRole } from "@/data/exercises";
import type { Experience } from "./core";

export type WeightUnits = "kg" | "lb";

/** Stored strength record for one lift. */
export type LiftRecord = {
  e1rmKg: number;
  trainingMaxKg: number;
  source: "tested" | "estimated" | string;
  updatedAt: string;
};

/** Per-exercise progression state (working weight, stalls, wave position…). */
export type ExerciseState = {
  workingKg: number | null;
  stallCount: number;
  cycleWeek?: number;
  curReps?: number;
  curSets?: number;
  lastSession?: {
    reps: (number | null)[];
    rir: number | null;
    topReps: number | null;
    date: string;
  };
};

/**
 * The engine's per-user, per-plan state. One of these exists for EVERY plan
 * the user has ever run, so switching plans never loses progress.
 */
export type EngineUserProfile = {
  units: WeightUnits;
  bodyweightKg: number;
  sex: "male" | "female";
  ageYears: number;
  experience: Experience;
  lifts: Record<string, LiftRecord>;
  exerciseState: Record<string, ExerciseState>;
  weeksSinceDeload?: number;
};

/** One prescribed set as shown in the session view. */
export type PrescribedSet = {
  slug: string;
  name: string;
  role: ExerciseRole;
  loadMode: LoadMode;
  isWarmup: boolean;
  setIndex?: number;
  weightKg: number | null;
  weightDisplay: number | null;
  reps: number | null;
  repsText: string;
  targetRIR: number | null;
  restSec: number;
  note?: string;
};

export type EngineMessage = {
  slug?: string;
  type: "calibration" | "deload";
  text: string;
};

export type SessionPrescription = {
  planName: string;
  day: string;
  dayIndex: number;
  units: WeightUnits;
  model: string;
  deloadDue: boolean;
  deloadApplied: boolean;
  deloadFactor: number;
  messages: EngineMessage[];
  sets: PrescribedSet[];
};

/** One logged set as recorded during a session. */
export type LoggedSet = {
  weightKg: number | null;
  reps: number | null;
  rir?: number | null;
  isWarmup?: boolean;
};

export type ProgressionChange = {
  slug: string;
  model: string;
  action: string;
  details: Record<string, number | string | null | undefined>;
};
