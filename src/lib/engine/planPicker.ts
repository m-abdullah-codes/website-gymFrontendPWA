/**
 * Plan picker — maps onboarding answers to one of the 16 bundled plans.
 * Scoring logic ported from the reference quiz (temp-weight-rep-engine/
 * workout-quiz.html), extended to also produce the human-readable
 * "why this plan" explanation shown on the workout page.
 */
import { plans, planId, type WorkoutPlan } from "@/data/exercises";

export type PlanPickerInput = {
  gender: "male" | "female";
  /** 40+ user who opted into a 40+-specific program. */
  adult: boolean;
  goal: "muscle" | "lean" | "stronger" | "reduce" | "fitness" | "powerlifting";
  days: number;
  level: "beginner" | "intermediate" | "advanced";
  split: string; // "Full Body" | "Upper/Lower" | "Push/Pull/Legs" | "No preference"
};

/** Selection metadata per plan, keyed by the enriched data's plan id. */
type PlanMeta = {
  id: string;
  goals: PlanPickerInput["goal"][];
  days: number[];
  levels: PlanPickerInput["level"][];
  splits: string[];
  gender: "any" | "female";
  cardio: boolean;
  rank: number;
  adult: boolean;
};

const PLAN_META: PlanMeta[] = [
  {
    id: "m-s-full-body-workout-routine",
    goals: ["muscle", "fitness", "stronger"],
    days: [2, 3],
    levels: ["beginner", "intermediate"],
    splits: ["Full Body"],
    gender: "any",
    cardio: false,
    rank: 2,
    adult: false,
  },
  {
    id: "jason-blaha-icf-5x5",
    goals: ["stronger", "muscle", "powerlifting"],
    days: [2, 3],
    levels: ["beginner"],
    splits: ["Full Body"],
    gender: "any",
    cardio: false,
    rank: 3,
    adult: false,
  },
  {
    id: "bill-starr-5x5",
    goals: ["stronger", "muscle", "powerlifting"],
    days: [3],
    levels: ["intermediate", "advanced"],
    splits: ["Full Body"],
    gender: "any",
    cardio: false,
    rank: 4,
    adult: false,
  },
  {
    id: "phul",
    goals: ["muscle", "stronger"],
    days: [4],
    levels: ["intermediate"],
    splits: ["Upper/Lower"],
    gender: "any",
    cardio: false,
    rank: 1,
    adult: false,
  },
  {
    id: "shul",
    goals: ["muscle", "stronger"],
    days: [4],
    levels: ["advanced"],
    splits: ["Upper/Lower"],
    gender: "any",
    cardio: false,
    rank: 6,
    adult: false,
  },
  {
    id: "3-day-ppl-for-beginners",
    goals: ["muscle", "fitness"],
    days: [3],
    levels: ["beginner"],
    splits: ["Push/Pull/Legs"],
    gender: "any",
    cardio: false,
    rank: 5,
    adult: false,
  },
  {
    id: "5-day-push-pull-legs-cycle",
    goals: ["muscle"],
    days: [5],
    levels: ["intermediate"],
    splits: ["Push/Pull/Legs"],
    gender: "any",
    cardio: false,
    rank: 7,
    adult: false,
  },
  {
    id: "6-day-ppl-powerbuilding",
    goals: ["muscle", "stronger"],
    days: [6],
    levels: ["intermediate", "advanced"],
    splits: ["Push/Pull/Legs"],
    gender: "any",
    cardio: false,
    rank: 8,
    adult: false,
  },
  {
    id: "jim-wendler-5-3-1",
    goals: ["powerlifting", "stronger"],
    days: [3, 4],
    levels: ["intermediate", "advanced"],
    splits: ["5/3/1", "Upper/Lower", "Full Body"],
    gender: "any",
    cardio: false,
    rank: 9,
    adult: false,
  },
  {
    id: "8-week-fat-loss-for-beginners",
    goals: ["lean", "reduce", "fitness"],
    days: [2, 3, 4],
    levels: ["beginner"],
    splits: ["Upper/Lower"],
    gender: "any",
    cardio: true,
    rank: 10,
    adult: false,
  },
  {
    id: "12-week-fat-destroyer",
    goals: ["lean", "reduce"],
    days: [4, 5],
    levels: ["intermediate"],
    splits: ["Upper/Lower", "Push/Pull/Legs"],
    gender: "any",
    cardio: true,
    rank: 11,
    adult: false,
  },
  {
    id: "fat-loss-inferno",
    goals: ["lean", "reduce"],
    days: [5, 6],
    levels: ["intermediate", "advanced"],
    splits: ["Body-part"],
    gender: "any",
    cardio: true,
    rank: 12,
    adult: false,
  },
  {
    id: "whole-body-conditioning",
    goals: ["fitness", "lean", "reduce"],
    days: [3, 4],
    levels: ["beginner", "intermediate"],
    splits: ["Full Body"],
    gender: "female",
    cardio: true,
    rank: 13,
    adult: false,
  },
  {
    id: "12-week-ppl-for-women",
    goals: ["muscle", "lean", "stronger"],
    days: [6],
    levels: ["intermediate"],
    splits: ["Push/Pull/Legs"],
    gender: "female",
    cardio: false,
    rank: 14,
    adult: false,
  },
  {
    id: "8-week-muscle-building-40",
    goals: ["muscle", "fitness", "stronger"],
    days: [3, 4],
    levels: ["beginner", "intermediate", "advanced"],
    splits: ["Full Body", "Upper/Lower"],
    gender: "any",
    cardio: false,
    rank: 20,
    adult: true,
  },
  {
    id: "10-week-lean-strong-women-40",
    goals: ["muscle", "lean", "fitness", "reduce", "stronger"],
    days: [3, 4],
    levels: ["beginner", "intermediate", "advanced"],
    splits: ["Full Body", "Upper/Lower"],
    gender: "female",
    cardio: true,
    rank: 21,
    adult: true,
  },
];

const plansByPickerId = new Map(plans.map((p) => [planId(p), p]));

function metaScore(meta: PlanMeta, input: PlanPickerInput): number {
  if (!meta.goals.includes(input.goal)) return -1;
  if (meta.gender === "female" && input.gender !== "female") return -1;
  let s = 0;
  s += meta.days.includes(input.days)
    ? 40
    : Math.max(
        0,
        20 - 5 * Math.min(...meta.days.map((d) => Math.abs(input.days - d))),
      );
  s +=
    input.split !== "No preference"
      ? meta.splits.includes(input.split)
        ? 25
        : 0
      : 8;
  s += meta.levels.includes(input.level) ? 20 : 0;
  if (meta.gender === input.gender) s += 6;
  s += Math.max(0, 10 - meta.rank);
  return s;
}

export type PlanPick = {
  plan: WorkoutPlan;
  planId: string;
  score: number;
  /** Human-readable reasons the plan was selected — the "why this plan" copy. */
  reasons: string[];
  /** Runner-up plan ids in descending score order (for "close matches"). */
  runnersUp: string[];
};

const GOAL_LABELS: Record<PlanPickerInput["goal"], string> = {
  muscle: "building muscle",
  lean: "getting lean",
  stronger: "getting stronger",
  reduce: "reducing bodyweight",
  fitness: "improving fitness",
  powerlifting: "powerlifting",
};

function buildReasons(
  meta: PlanMeta,
  plan: WorkoutPlan,
  input: PlanPickerInput,
): string[] {
  const reasons: string[] = [];
  if (meta.adult) {
    reasons.push(
      "Designed specifically for lifters 40+ — joint-friendly loading, longer warm-ups, and no training to failure.",
    );
  }
  reasons.push(
    `Matched to your goal of ${GOAL_LABELS[input.goal]} — this program is built around exactly that.`,
  );
  if (meta.days.includes(input.days)) {
    reasons.push(
      `Fits your schedule: it's designed for ${plan.daysPerWeek} training day${plan.daysPerWeek > 1 ? "s" : ""} a week, the commitment you chose.`,
    );
  } else {
    const closest = meta.days.reduce((a, b) =>
      Math.abs(b - input.days) < Math.abs(a - input.days) ? b : a,
    );
    reasons.push(
      `Closest strong match to your schedule: you chose ${input.days} days, and this runs best on ${closest}.`,
    );
  }
  if (meta.levels.includes(input.level)) {
    reasons.push(
      `Written for ${input.level} lifters, so the volume and progression speed match your experience.`,
    );
  }
  if (input.split !== "No preference" && meta.splits.includes(input.split)) {
    reasons.push(`Uses the ${input.split} split you prefer.`);
  } else if (input.split === "No preference") {
    reasons.push(
      `You had no split preference, so we optimized freely — a ${plan.split} layout scored best for your answers.`,
    );
  }
  if (meta.cardio) {
    reasons.push("Includes built-in cardio — no separate add-on needed.");
  }
  return reasons;
}

/**
 * Pick the best plan for the given answers. Deterministic: same answers →
 * same plan, so the "why this plan" screen can always be regenerated.
 */
export function pickPlan(input: PlanPickerInput): PlanPick {
  const pool = PLAN_META.filter((m) => m.adult === input.adult);
  const scored = pool
    .map((m) => ({ m, sc: metaScore(m, input) }))
    .filter((x) => x.sc >= 0)
    .sort((a, b) => b.sc - a.sc || a.m.rank - b.m.rank);

  const best =
    scored[0]?.m ??
    PLAN_META.find((m) => m.id === "m-s-full-body-workout-routine")!;
  const plan = plansByPickerId.get(best.id);
  if (!plan)
    throw new Error(
      `Plan picker meta id "${best.id}" has no matching plan in data`,
    );

  return {
    plan,
    planId: best.id,
    score: scored[0]?.sc ?? 0,
    reasons: buildReasons(best, plan, input),
    runnersUp: scored.slice(1, 4).map((x) => x.m.id),
  };
}

/** Meta lookup for the plan-switcher UI (chips like "cardio built in"). */
export function planMetaFor(id: string): PlanMeta | undefined {
  return PLAN_META.find((m) => m.id === id);
}
