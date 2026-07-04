"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  exerciseLibrary,
  getPlanById,
  loadConfig,
  type WorkoutPlan,
} from "@/data/exercises";
import { estimate1RM } from "@/lib/engine/core";
import { getPrescription } from "@/lib/engine/prescription";
import { applyProgression } from "@/lib/engine/progression";
import { applySwapsToPlan } from "@/lib/engine/swaps";
import { scheduledDayIndex, scheduledWorkingSets } from "@/lib/engine/schedule";
import type { EngineUserProfile, LiftRecord } from "@/lib/engine/types";
import { isSessionValid, toLocalISODate } from "@/lib/streak/engine";
import {
  selectExperience,
  selectSex,
  useUserStore,
  type RepMaxInput,
} from "./userStore";
import type {
  ActiveSession,
  PlanProgress,
  SessionExerciseRecord,
  WorkoutSession,
} from "./types";

/** Onboarding rep-max keys → exercise slugs. */
const REP_MAX_SLUGS: Record<string, string> = {
  benchPress: "barbell-bench-press",
  backSquat: "back-squat",
  deadlift: "deadlift",
  overheadPress: "barbell-shoulder-press",
};

function liftsFromRepMaxes(
  repMaxes: Record<string, RepMaxInput> | null,
): Record<string, LiftRecord> {
  const lifts: Record<string, LiftRecord> = {};
  if (!repMaxes) return lifts;
  const today = toLocalISODate(new Date());
  for (const [key, entry] of Object.entries(repMaxes)) {
    const slug = REP_MAX_SLUGS[key] ?? key;
    if (!(entry.weightKg > 0) || !(entry.reps >= 1)) continue;
    const e1 = Math.round(estimate1RM(entry.weightKg, entry.reps) * 100) / 100;
    lifts[slug] = {
      e1rmKg: e1,
      trainingMaxKg:
        Math.round(e1 * (loadConfig.trainingMaxFactor ?? 0.9) * 100) / 100,
      source: "tested",
      updatedAt: today,
    };
  }
  return lifts;
}

function newPlanProgress(plan: WorkoutPlan): PlanProgress {
  const user = useUserStore.getState();
  return {
    startedAt: toLocalISODate(new Date()),
    weeklyTarget: Math.min(plan.daysPerWeek, 7),
    sessionsCompleted: 0,
    lifts: liftsFromRepMaxes(user.repMaxes),
    exerciseState: {},
    weeksSinceDeload: 0,
    exerciseSwaps: {},
  };
}

/** Assemble the engine profile for a plan from user + per-plan state. */
export function engineProfileFor(progress: PlanProgress): EngineUserProfile {
  const user = useUserStore.getState();
  return {
    units: user.units,
    bodyweightKg: user.bodyweightKg ?? 75,
    sex: selectSex(user),
    ageYears: user.ageYears ?? 28,
    experience: selectExperience(user),
    lifts: progress.lifts,
    exerciseState: progress.exerciseState,
    weeksSinceDeload: progress.weeksSinceDeload,
  };
}

export type WorkoutState = {
  activePlanId: string | null;
  planProgress: Record<string, PlanProgress>;
  sessions: WorkoutSession[];
  active: ActiveSession | null;

  activatePlan: (planId: string) => void;
  setExerciseSwap: (
    planId: string,
    fromSlug: string,
    toSlug: string | null,
  ) => void;
  startSession: (dayIndex: number, opts?: { dayName?: string }) => void;
  updateSet: (
    exIdx: number,
    setIdx: number,
    patch: Partial<{
      weightKg: number | null;
      reps: number | null;
      done: boolean;
    }>,
  ) => void;
  addWorkingSet: (exIdx: number) => void;
  cancelSession: () => void;
  completeSession: () => WorkoutSession | null;
  markSessionCredited: (sessionId: string, credited: boolean) => void;
};

/** The active plan with the user's swaps applied — use for all rendering. */
export function resolvedPlan(
  planId: string,
  progress?: PlanProgress,
): WorkoutPlan | null {
  const plan = getPlanById(planId);
  if (!plan) return null;
  return applySwapsToPlan(plan, progress?.exerciseSwaps ?? {});
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      activePlanId: null,
      planProgress: {},
      sessions: [],
      active: null,

      activatePlan: (planId) => {
        const plan = getPlanById(planId);
        if (!plan) return;
        set((s) => ({
          activePlanId: planId,
          planProgress: s.planProgress[planId]
            ? s.planProgress
            : { ...s.planProgress, [planId]: newPlanProgress(plan) },
        }));
      },

      setExerciseSwap: (planId, fromSlug, toSlug) =>
        set((s) => {
          const progress = s.planProgress[planId];
          if (!progress) return s;
          const swaps = { ...progress.exerciseSwaps };
          if (toSlug && toSlug !== fromSlug) swaps[fromSlug] = toSlug;
          else delete swaps[fromSlug];
          return {
            planProgress: {
              ...s.planProgress,
              [planId]: { ...progress, exerciseSwaps: swaps },
            },
          };
        }),

      startSession: (dayIndex, opts) => {
        const { activePlanId, planProgress, active } = get();
        if (active) return; // one session at a time — resume the existing one
        if (!activePlanId) return;
        const progress = planProgress[activePlanId];
        const plan = resolvedPlan(activePlanId, progress);
        if (!plan || !plan.days[dayIndex] || !progress) return;

        const user = useUserStore.getState();
        const prescription = getPrescription(
          plan,
          dayIndex,
          engineProfileFor(progress),
          {
            exerciseLibrary,
            warmupRamp: loadConfig.warmupRamp,
            includeWarmups: user.warmupSets,
          },
        );

        // Group prescribed sets per exercise, in plan order.
        const byExercise = new Map<string, SessionExerciseRecord>();
        prescription.sets.forEach((s) => {
          let rec = byExercise.get(s.slug);
          if (!rec) {
            rec = { slug: s.slug, name: s.name, role: s.role, sets: [] };
            byExercise.set(s.slug, rec);
          }
          rec.sets.push({
            setIndex: rec.sets.length,
            isWarmup: s.isWarmup,
            plannedWeightKg: s.weightKg,
            plannedReps: s.reps,
            plannedRepsText: s.repsText,
            targetRIR: s.targetRIR,
            restSec: s.restSec,
            weightKg: s.weightKg,
            reps: s.reps,
            done: false,
          });
        });

        set({
          active: {
            planId: activePlanId,
            dayIndex,
            dayName: opts?.dayName ?? plan.days[dayIndex].day,
            startedAt: new Date().toISOString(),
            exercises: [...byExercise.values()],
          },
        });
      },

      updateSet: (exIdx, setIdx, patch) =>
        set((s) => {
          if (!s.active) return s;
          const exercises = s.active.exercises.map((ex, i) =>
            i !== exIdx
              ? ex
              : {
                  ...ex,
                  sets: ex.sets.map((st, j) =>
                    j !== setIdx ? st : { ...st, ...patch },
                  ),
                },
          );
          return { active: { ...s.active, exercises } };
        }),

      addWorkingSet: (exIdx) =>
        set((s) => {
          if (!s.active) return s;
          const exercises = s.active.exercises.map((ex, i) => {
            if (i !== exIdx) return ex;
            const last =
              [...ex.sets].reverse().find((x) => !x.isWarmup) ??
              ex.sets[ex.sets.length - 1];
            return {
              ...ex,
              sets: [
                ...ex.sets,
                {
                  ...last,
                  setIndex: ex.sets.length,
                  isWarmup: false,
                  done: false,
                },
              ],
            };
          });
          return { active: { ...s.active, exercises } };
        }),

      cancelSession: () => set({ active: null }),

      completeSession: () => {
        const { active, planProgress, sessions } = get();
        if (!active) return null;
        const basePlan = getPlanById(active.planId);
        const progress = planProgress[active.planId];
        if (!basePlan || !progress) {
          set({ active: null });
          return null;
        }
        const plan = applySwapsToPlan(basePlan, progress.exerciseSwaps);

        const endedAt = new Date();
        const startedAt = new Date(active.startedAt);
        const durationSec = Math.max(
          0,
          Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
        );
        const date = toLocalISODate(endedAt);

        // Progression: apply per exercise that has at least one completed working set.
        let profile = engineProfileFor(progress);
        const prSlugs: string[] = [];
        for (const exRec of active.exercises) {
          const done = exRec.sets.filter((s) => s.done);
          if (!done.some((s) => !s.isWarmup)) continue;
          const planEx = plan.days[active.dayIndex]?.exercises.find(
            (e) => e.slug === exRec.slug,
          );
          if (!planEx) continue;
          const before = profile.lifts[exRec.slug]?.e1rmKg ?? 0;
          const logged = done.map((s) => ({
            weightKg: s.weightKg,
            reps: s.reps,
            rir: null,
            isWarmup: s.isWarmup,
          }));
          const res = applyProgression(plan, planEx, logged, profile, {
            exerciseLibrary,
            date,
          });
          profile = res.userProfile;
          const after = profile.lifts[exRec.slug]?.e1rmKg ?? 0;
          if (before > 0 && after > before) prSlugs.push(exRec.slug);
        }

        // Session stats.
        const workingDone = active.exercises.flatMap((ex) =>
          ex.sets.filter((s) => s.done && !s.isWarmup),
        );
        const completedWorkingSets = workingDone.length;
        const volumeKg = workingDone.reduce(
          (a, s) => a + (s.weightKg ?? 0) * (s.reps ?? 0),
          0,
        );

        // MET estimate: 5.0 for short-rest work, 6.0 for heavy low-rep, 3.5 default.
        const avgRest =
          workingDone.length > 0
            ? workingDone.reduce((a, s) => a + (s.restSec || 90), 0) /
              workingDone.length
            : 90;
        const lowRepShare =
          workingDone.length > 0
            ? workingDone.filter((s) => (s.reps ?? 99) <= 6).length /
              workingDone.length
            : 0;
        const met = lowRepShare >= 0.7 ? 6.0 : avgRest < 90 ? 5.0 : 3.5;
        const bw = useUserStore.getState().bodyweightKg ?? 75;
        const estKcal = Math.round(((durationSec / 60) * met * 3.5 * bw) / 200);

        const scheduled = scheduledDayIndex(
          plan,
          date,
          progress.sessionsCompleted,
        );
        const unscheduled = scheduled !== active.dayIndex;
        const scheduledSets = scheduledWorkingSets(plan, active.dayIndex);

        const alreadyCreditedToday = sessions.some(
          (s) => s.date === date && s.credited,
        );
        const credited =
          !alreadyCreditedToday &&
          isSessionValid({
            completedWorkingSets,
            scheduledWorkingSets: scheduledSets,
            durationSec,
            unscheduled,
          });

        const session: WorkoutSession = {
          id: (globalThis.crypto?.randomUUID?.() ??
            String(Date.now())) as string,
          planId: active.planId,
          planName: plan.plan,
          dayIndex: active.dayIndex,
          dayName: active.dayName,
          date,
          startedAt: active.startedAt,
          endedAt: endedAt.toISOString(),
          durationSec,
          exercises: active.exercises,
          scheduledWorkingSets: scheduledSets,
          completedWorkingSets,
          credited,
          volumeKg: Math.round(volumeKg),
          estKcal,
          prSlugs,
          unscheduled,
        };

        set((s) => ({
          active: null,
          sessions: [...s.sessions, session],
          planProgress: {
            ...s.planProgress,
            [active.planId]: {
              ...progress,
              sessionsCompleted: progress.sessionsCompleted + 1,
              lifts: profile.lifts,
              exerciseState: profile.exerciseState,
            },
          },
        }));
        return session;
      },

      markSessionCredited: (sessionId, credited) =>
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === sessionId ? { ...x, credited } : x,
          ),
        })),
    }),
    { name: "gym.workout.v1", storage: createJSONStorage(() => localStorage) },
  ),
);
