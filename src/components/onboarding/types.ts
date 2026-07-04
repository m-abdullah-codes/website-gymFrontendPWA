/** Choice answers keyed by question step key. Multi-selects store arrays. */
export type AnswerValue = string | string[];
export type OnboardingAnswers = Record<string, AnswerValue>;

export type WeightUnit = "kg" | "lbs";

/** Free-number inputs collected after the question flow. Kept as strings while editing. */
export type BodyStats = {
  age: string;
  weight: string;
  weightUnit: WeightUnit;
  /** Height in cm — required by the meal engine's BMR calculation. */
  height: string;
  /** Optional goal weight (same unit as `weight`) — powers ETA + protein basis. */
  targetWeight: string;
};

export type RepMaxEntry = {
  weight: string;
  reps: string;
};

/** Keyed by `REP_MAX_LIFTS[number]["key"]`. */
export type RepMaxes = Record<string, RepMaxEntry>;

/** Slim plan shape shown in the reveal dialog. */
export type PlanSummary = {
  name: string;
  level: string;
  daysPerWeek: number;
  split: string;
  goals: string[];
  /** "Why this plan" — from the plan picker. */
  reasons: string[];
};
