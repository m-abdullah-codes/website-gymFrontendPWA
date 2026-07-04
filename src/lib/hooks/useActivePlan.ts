"use client";

import { useMemo } from "react";
import {
  exerciseLibrary,
  loadConfig,
  type WorkoutPlan,
} from "@/data/exercises";
import { getPrescription } from "@/lib/engine/prescription";
import { dayTitle, weekLayout, type WeekSlot } from "@/lib/engine/schedule";
import type { SessionPrescription } from "@/lib/engine/types";
import { toLocalISODate, weekdayIndex } from "@/lib/streak/engine";
import { useHydrated } from "@/lib/store/useHydrated";
import { useUserStore } from "@/lib/store/userStore";
import {
  engineProfileFor,
  resolvedPlan,
  useWorkoutStore,
} from "@/lib/store/workoutStore";
import type { PlanProgress } from "@/lib/store/types";

export type ActivePlanView = {
  hydrated: boolean;
  onboarded: boolean;
  planId: string | null;
  plan: WorkoutPlan | null;
  progress: PlanProgress | null;
  week: WeekSlot[];
  /** Today's plan day index, or null on rest days. */
  todayDayIndex: number | null;
  todayTitle: string | null;
  /** Prescription for today (null on rest days). */
  prescription: SessionPrescription | null;
  todayIso: string;
  todayWeekdayIdx: number;
};

/** Prescription for an arbitrary day of the active plan (for previews). */
export function prescriptionFor(
  plan: WorkoutPlan,
  progress: PlanProgress,
  dayIndex: number,
  includeWarmups: boolean,
): SessionPrescription {
  return getPrescription(plan, dayIndex, engineProfileFor(progress), {
    exerciseLibrary,
    warmupRamp: loadConfig.warmupRamp,
    includeWarmups,
  });
}

export function useActivePlan(): ActivePlanView {
  const hydrated = useHydrated();
  const onboarded = useUserStore((s) => s.onboarded);
  const warmupSets = useUserStore((s) => s.warmupSets);
  const units = useUserStore((s) => s.units);
  const activePlanId = useWorkoutStore((s) => s.activePlanId);
  const planProgress = useWorkoutStore((s) => s.planProgress);

  return useMemo(() => {
    const todayIso = toLocalISODate(new Date());
    const todayWeekdayIdx = weekdayIndex(todayIso);
    const empty: ActivePlanView = {
      hydrated,
      onboarded: hydrated ? onboarded : false,
      planId: null,
      plan: null,
      progress: null,
      week: [],
      todayDayIndex: null,
      todayTitle: null,
      prescription: null,
      todayIso,
      todayWeekdayIdx,
    };
    if (!hydrated || !activePlanId) return empty;
    const progress = planProgress[activePlanId] ?? null;
    const plan = resolvedPlan(activePlanId, progress ?? undefined);
    if (!plan || !progress) return empty;

    const week = weekLayout(plan, progress.sessionsCompleted);
    const todayDayIndex = week[todayWeekdayIdx].dayIndex;
    const prescription =
      todayDayIndex != null
        ? prescriptionFor(plan, progress, todayDayIndex, warmupSets)
        : null;

    return {
      hydrated,
      onboarded,
      planId: activePlanId,
      plan,
      progress,
      week,
      todayDayIndex,
      todayTitle:
        todayDayIndex != null ? dayTitle(plan.days[todayDayIndex].day) : null,
      prescription,
      todayIso,
      todayWeekdayIdx,
    };
    // `units` affects display strings inside the prescription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, onboarded, warmupSets, units, activePlanId, planProgress]);
}

/** First working-set load line for an exercise, e.g. "60 kg × 5" / "AMRAP". */
export function loadLineFor(
  prescription: SessionPrescription | null,
  slug: string,
): string | null {
  if (!prescription) return null;
  const set = prescription.sets.find((s) => s.slug === slug && !s.isWarmup);
  if (!set) return null;
  const unit = prescription.units === "lb" ? "lb" : "kg";
  if (set.weightKg == null) return set.repsText;
  if (set.weightKg === 0) return `Bodyweight × ${set.repsText}`;
  return `${set.weightDisplay} ${unit} × ${set.repsText}`;
}
