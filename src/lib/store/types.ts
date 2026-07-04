import type { LiftRecord, ExerciseState } from "@/lib/engine/types";

/** One logged set inside a session (UI row state included). */
export type SessionSetRecord = {
  setIndex: number;
  isWarmup: boolean;
  /** Planned values from the prescription (kg). */
  plannedWeightKg: number | null;
  plannedReps: number | null;
  plannedRepsText: string;
  targetRIR: number | null;
  restSec: number;
  /** What the user actually did (kg). Editable; defaults to planned. */
  weightKg: number | null;
  reps: number | null;
  rir?: number | null;
  done: boolean;
};

export type SessionExerciseRecord = {
  slug: string;
  name: string;
  role: string;
  sets: SessionSetRecord[];
};

/** A finished, saved workout session. */
export type WorkoutSession = {
  id: string;
  planId: string;
  planName: string;
  dayIndex: number;
  dayName: string;
  /** Local calendar date the session counts for (YYYY-MM-DD). */
  date: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  exercises: SessionExerciseRecord[];
  /** Working (non-warm-up) sets scheduled vs actually completed. */
  scheduledWorkingSets: number;
  completedWorkingSets: number;
  /** Whether this session earned streak credit (set by the streak engine). */
  credited: boolean;
  /** Σ(weight × reps) over completed working sets, kg. Bodyweight = added load only. */
  volumeKg: number;
  /** Estimated calories (MET formula) — always displayed as "est." */
  estKcal: number;
  /** Slugs that hit a new estimated-1RM PR this session. */
  prSlugs: string[];
  /** True when logged outside the plan's schedule for that day. */
  unscheduled: boolean;
};

/** The in-flight recording session (persisted so a refresh can't lose it). */
export type ActiveSession = {
  planId: string;
  dayIndex: number;
  dayName: string;
  startedAt: string;
  exercises: SessionExerciseRecord[];
};

/** Per-plan progress — one per plan the user has ever run, never discarded. */
export type PlanProgress = {
  /** ISO date the plan was first activated (drives "Week X of Y"). */
  startedAt: string;
  /** Sessions/week committed at plan start (streak weekly target). */
  weeklyTarget: number;
  /** Total sessions completed on this plan (drives A/B-style rotations). */
  sessionsCompleted: number;
  lifts: Record<string, LiftRecord>;
  exerciseState: Record<string, ExerciseState>;
  weeksSinceDeload: number;
  /** Per-exercise swaps chosen by the user: original slug → alternate slug. */
  exerciseSwaps: Record<string, string>;
};

export type WeekOutcomeKind = "success" | "shielded" | "failed" | "paused";

export type WeekOutcome = {
  /** ISO date of the week's Monday. */
  weekStart: string;
  validSessions: number;
  target: number;
  outcome: WeekOutcomeKind;
  /** Streak length after this week closed. */
  streakAfter: number;
};
