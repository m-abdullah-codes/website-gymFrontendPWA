"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { WeightUnits } from "@/lib/engine/types";
import type { Experience } from "@/lib/engine/core";
import type {
  ActivityLevel,
  CardioLevel,
  DietPace,
  MealGoal,
  MealPattern,
  MealProfile,
} from "@/lib/meals/types";
import type { PlanPickerInput } from "@/lib/engine/planPicker";

/** Raw answers keyed by question step key. Multi-selects store arrays. */
export type AnswerValue = string | string[];
export type StoredAnswers = Record<string, AnswerValue>;

export type RepMaxInput = { weightKg: number; reps: number };

export type UserState = {
  onboarded: boolean;
  completedAt: string | null;
  answers: StoredAnswers;
  ageYears: number | null;
  heightCm: number | null;
  bodyweightKg: number | null;
  /** Rep-max test results captured at onboarding (kg), keyed by lift slug. */
  repMaxes: Record<string, RepMaxInput> | null;
  // Preferences (Settings)
  units: WeightUnits;
  warmupSets: boolean;

  setAnswer: (key: string, value: AnswerValue) => void;
  setStats: (stats: {
    ageYears?: number | null;
    heightCm?: number | null;
    bodyweightKg?: number | null;
  }) => void;
  setUnits: (units: WeightUnits) => void;
  setWarmupSets: (on: boolean) => void;
  completeOnboarding: (payload: {
    answers: StoredAnswers;
    ageYears: number | null;
    heightCm: number | null;
    bodyweightKg: number | null;
    repMaxes: Record<string, RepMaxInput> | null;
    units: WeightUnits;
  }) => void;
  resetAll: () => void;
};

const str = (v: AnswerValue | undefined, fallback = ""): string =>
  typeof v === "string" ? v : fallback;

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      onboarded: false,
      completedAt: null,
      answers: {},
      ageYears: null,
      heightCm: null,
      bodyweightKg: null,
      repMaxes: null,
      units: "kg",
      warmupSets: true,

      setAnswer: (key, value) =>
        set((s) => ({ answers: { ...s.answers, [key]: value } })),
      setStats: (stats) =>
        set((s) => ({
          ageYears: stats.ageYears !== undefined ? stats.ageYears : s.ageYears,
          heightCm: stats.heightCm !== undefined ? stats.heightCm : s.heightCm,
          bodyweightKg:
            stats.bodyweightKg !== undefined
              ? stats.bodyweightKg
              : s.bodyweightKg,
        })),
      setUnits: (units) => set({ units }),
      setWarmupSets: (warmupSets) => set({ warmupSets }),
      completeOnboarding: (p) =>
        set({
          onboarded: true,
          completedAt: new Date().toISOString(),
          answers: p.answers,
          ageYears: p.ageYears,
          heightCm: p.heightCm,
          bodyweightKg: p.bodyweightKg,
          repMaxes: p.repMaxes,
          units: p.units,
        }),
      resetAll: () =>
        set({
          onboarded: false,
          completedAt: null,
          answers: {},
          ageYears: null,
          heightCm: null,
          bodyweightKg: null,
          repMaxes: null,
          units: "kg",
          warmupSets: true,
        }),
    }),
    { name: "gym.user.v1", storage: createJSONStorage(() => localStorage) },
  ),
);

/* ------------------------------------------------------------------------
 * Derived selectors — the single place that maps raw answers onto the
 * engine/meal-planner input shapes.
 * ---------------------------------------------------------------------- */

export function selectSex(s: UserState): "male" | "female" {
  return str(s.answers.gender) === "female" ? "female" : "male";
}

export function selectExperience(s: UserState): Experience {
  const v = str(s.answers.level);
  return v === "intermediate" || v === "advanced" || v === "beginner"
    ? v
    : "beginner";
}

export function selectTrainingDays(s: UserState): number {
  const n = parseInt(str(s.answers.days), 10);
  return Number.isFinite(n) ? n : 3;
}

export function selectGoal(s: UserState): MealGoal {
  const v = str(s.answers.goal);
  const goals: MealGoal[] = [
    "muscle",
    "lean",
    "stronger",
    "reduce",
    "fitness",
    "powerlifting",
  ];
  // 40+ program users skip the goal question — their programs are muscle-focused.
  return (goals as string[]).includes(v) ? (v as MealGoal) : "muscle";
}

export function selectCardio(s: UserState): CardioLevel {
  const v = str(s.answers.cardio);
  return v === "2x" || v === "3x" ? v : "none";
}

export function selectStretching(s: UserState): boolean {
  return str(s.answers.stretch) === "yes";
}

export function selectIsAdultProgram(s: UserState): boolean {
  return str(s.answers.over40) === "yes" && str(s.answers.adult) === "yes";
}

export function selectPickerInput(s: UserState): PlanPickerInput {
  return {
    gender: selectSex(s),
    adult: selectIsAdultProgram(s),
    goal: selectGoal(s),
    days: selectTrainingDays(s),
    level:
      selectExperience(s) === "untrained"
        ? "beginner"
        : (selectExperience(s) as "beginner" | "intermediate" | "advanced"),
    split: str(s.answers.split, "No preference"),
  };
}

export function selectMealProfile(s: UserState): Partial<MealProfile> {
  const exclusions = Array.isArray(s.answers.dietExclusions)
    ? (s.answers.dietExclusions as string[])
    : [];
  const targetWeight = parseFloat(str(s.answers.targetWeightKg));
  return {
    userId: "local",
    gender: selectSex(s),
    age: s.ageYears ?? 25,
    weightKg: s.bodyweightKg ?? 70,
    heightCm: s.heightCm,
    goal: selectGoal(s),
    trainingDays: selectTrainingDays(s),
    cardio: selectCardio(s),
    activity: (str(s.answers.activity) || "sedentary") as ActivityLevel,
    mealsPerDay: (str(s.answers.mealsPerDay) || "3+1") as MealPattern,
    dietExclusions: exclusions.filter((x) => x !== "none"),
    pace: (str(s.answers.pace) || "standard") as DietPace,
    chai: str(s.answers.chai) !== "no",
    targetWeightKg:
      Number.isFinite(targetWeight) && targetWeight > 0 ? targetWeight : null,
  };
}
