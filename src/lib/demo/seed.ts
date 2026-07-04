"use client";

/**
 * Demo seeder — fills the app with eight weeks of plausible history so the
 * pitch shows a lived-in product: sessions with progressing weights, a
 * streak with a banked shield, weigh-ins and yesterday's meals. Clearly
 * labeled in Settings and fully reversible via "Reset all data".
 */
import { exerciseLibrary, getPlanById, loadConfig } from "@/data/exercises";
import { getPrescription } from "@/lib/engine/prescription";
import { applyProgression } from "@/lib/engine/progression";
import { weekLayout } from "@/lib/engine/schedule";
import type { EngineUserProfile } from "@/lib/engine/types";
import { foodDb } from "@/lib/meals/db";
import { generateDayPlan, logPlanned, createDayLog } from "@/lib/meals/engine";
import { addDays, toLocalISODate, weekStartOf } from "@/lib/streak/engine";
import { useMealStore } from "@/lib/store/mealStore";
import { useStreakStore } from "@/lib/store/streakStore";
import { useUserStore } from "@/lib/store/userStore";
import { useWorkoutStore } from "@/lib/store/workoutStore";
import type {
  SessionExerciseRecord,
  WeekOutcome,
  WorkoutSession,
} from "@/lib/store/types";

const DEMO_WEEKS = 8;
/** Week index (1-based from the start) that was missed and shielded. */
const SHIELDED_WEEK = 6;

export function seedDemoData(): void {
  const user = useUserStore.getState();

  // 1) Ensure a complete user profile (only fills gaps if not onboarded).
  if (!user.onboarded) {
    useUserStore.getState().completeOnboarding({
      answers: {
        gender: "male",
        over40: "no",
        goal: "muscle",
        days: "4",
        level: "intermediate",
        split: "Upper/Lower",
        cardio: "2x",
        stretch: "yes",
        activity: "light",
        mealsPerDay: "3+1",
        dietExclusions: [],
        chai: "yes",
        pace: "standard",
        targetWeightKg: "85",
      },
      ageYears: 28,
      heightCm: 178,
      bodyweightKg: 80,
      repMaxes: {
        benchPress: { weightKg: 80, reps: 5 },
        backSquat: { weightKg: 100, reps: 5 },
        deadlift: { weightKg: 120, reps: 5 },
        overheadPress: { weightKg: 50, reps: 5 },
      },
      units: "kg",
    });
  }

  const planId = useWorkoutStore.getState().activePlanId ?? "phul";
  useWorkoutStore.getState().activatePlan(planId);
  const plan = getPlanById(planId);
  const progress = useWorkoutStore.getState().planProgress[planId];
  if (!plan || !progress) return;

  const today = toLocalISODate(new Date());
  const startWeek = addDays(weekStartOf(today), -7 * DEMO_WEEKS);

  // 2) Replay history through the real engines so weights progress honestly.
  const u = useUserStore.getState();
  let profile: EngineUserProfile = {
    units: u.units,
    bodyweightKg: u.bodyweightKg ?? 80,
    sex: u.answers.gender === "female" ? "female" : "male",
    ageYears: u.ageYears ?? 28,
    experience: "intermediate",
    lifts: structuredClone(progress.lifts),
    exerciseState: {},
  };

  const sessions: WorkoutSession[] = [];
  const outcomes: WeekOutcome[] = [];
  let sessionsCompleted = 0;
  let streak = 0;
  let shields = 0;
  let successes = 0;

  for (let w = 0; w < DEMO_WEEKS; w++) {
    const weekStart = addDays(startWeek, w * 7);
    const isShielded = w + 1 === SHIELDED_WEEK;
    const layout = weekLayout(plan, sessionsCompleted);
    let credited = 0;

    for (const slot of layout) {
      if (slot.dayIndex == null) continue;
      const date = addDays(weekStart, slot.weekdayIdx);
      if (date >= today) continue;
      // In the shielded week the user only made one session.
      if (isShielded && credited >= 1) continue;

      const prescription = getPrescription(plan, slot.dayIndex, profile, {
        exerciseLibrary,
        warmupRamp: loadConfig.warmupRamp,
        includeWarmups: true,
      });

      const byExercise = new Map<string, SessionExerciseRecord>();
      prescription.sets.forEach((s) => {
        let rec = byExercise.get(s.slug);
        if (!rec) {
          rec = { slug: s.slug, name: s.name, role: s.role, sets: [] };
          byExercise.set(s.slug, rec);
        }
        // Hit the top of the range every other week so progression fires.
        const planEx = plan.days[slot.dayIndex!].exercises.find(
          (e) => e.slug === s.slug,
        );
        const targetReps =
          s.reps ??
          (w % 2 === 1
            ? (planEx?.repsMax ?? 8)
            : (planEx?.repsMin ?? s.reps ?? 8));
        const reps = s.isWarmup
          ? s.reps
          : w % 2 === 1
            ? (planEx?.repsMax ?? targetReps)
            : targetReps;
        rec.sets.push({
          setIndex: rec.sets.length,
          isWarmup: s.isWarmup,
          plannedWeightKg: s.weightKg,
          plannedReps: s.reps,
          plannedRepsText: s.repsText,
          targetRIR: s.targetRIR,
          restSec: s.restSec,
          weightKg: s.weightKg,
          reps,
          done: true,
        });
      });
      const exercises = [...byExercise.values()];

      const prSlugs: string[] = [];
      for (const rec of exercises) {
        const planEx = plan.days[slot.dayIndex]!.exercises.find(
          (e) => e.slug === rec.slug,
        );
        if (!planEx) continue;
        const before = profile.lifts[rec.slug]?.e1rmKg ?? 0;
        const logged = rec.sets
          .filter((s) => s.done)
          .map((s) => ({
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
        const after = profile.lifts[rec.slug]?.e1rmKg ?? 0;
        if (before > 0 && after > before) prSlugs.push(rec.slug);
      }

      const working = exercises.flatMap((e) =>
        e.sets.filter((s) => !s.isWarmup),
      );
      const volumeKg = Math.round(
        working.reduce((a, s) => a + (s.weightKg ?? 0) * (s.reps ?? 0), 0),
      );
      const durationSec = (48 + ((w * 7 + slot.weekdayIdx) % 4) * 6) * 60;
      const startedAt = new Date(`${date}T18:05:00`);
      const endedAt = new Date(startedAt.getTime() + durationSec * 1000);

      sessions.push({
        id: `demo-${date}`,
        planId,
        planName: plan.plan,
        dayIndex: slot.dayIndex,
        dayName: plan.days[slot.dayIndex].day,
        date,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationSec,
        exercises,
        scheduledWorkingSets: working.length,
        completedWorkingSets: working.length,
        credited: true,
        volumeKg,
        estKcal: Math.round(
          ((durationSec / 60) * 5 * 3.5 * (u.bodyweightKg ?? 80)) / 200,
        ),
        prSlugs: prSlugs.slice(0, 2),
        unscheduled: false,
      });
      sessionsCompleted++;
      credited++;
    }

    // Weekly close bookkeeping (matches the streak engine's rules).
    if (weekStart < weekStartOf(today)) {
      const target = Math.min(plan.daysPerWeek, 7);
      if (credited >= target) {
        streak++;
        successes++;
        if (successes >= 4) {
          shields = Math.min(2, shields + 1);
          successes = 0;
        }
        outcomes.push({
          weekStart,
          validSessions: credited,
          target,
          outcome: "success",
          streakAfter: streak,
        });
      } else if (shields > 0) {
        shields--;
        outcomes.push({
          weekStart,
          validSessions: credited,
          target,
          outcome: "shielded",
          streakAfter: streak,
        });
      } else {
        streak = 0;
        successes = 0;
        outcomes.push({
          weekStart,
          validSessions: credited,
          target,
          outcome: "failed",
          streakAfter: 0,
        });
      }
    }
  }

  // 3) Write workout + streak stores.
  useWorkoutStore.setState((s) => ({
    sessions,
    planProgress: {
      ...s.planProgress,
      [planId]: {
        ...s.planProgress[planId],
        startedAt: startWeek,
        sessionsCompleted,
        lifts: profile.lifts,
        exerciseState: profile.exerciseState,
      },
    },
  }));

  useStreakStore.setState({
    streakWeeks: streak,
    longestWeeks: Math.max(streak, ...outcomes.map((o) => o.streakAfter)),
    shields,
    successesTowardShield: successes,
    paused: false,
    weeklyTarget: Math.min(plan.daysPerWeek, 7),
    pendingWeeklyTarget: null,
    lastClosedWeekStart: outcomes[outcomes.length - 1]?.weekStart ?? null,
    startDate: startWeek,
    weekOutcomes: outcomes,
  });

  // 4) Weigh-ins trending toward the goal + yesterday's meals logged.
  const weighIns = Array.from({ length: DEMO_WEEKS + 1 }, (_, i) => ({
    date: addDays(startWeek, i * 7),
    weightKg: Math.round(((u.bodyweightKg ?? 80) - 1.6 + i * 0.2) * 10) / 10,
  }));

  const yesterday = addDays(today, -1);
  const mealProfile = {
    userId: "local",
    gender: profile.sex,
    age: profile.ageYears,
    weightKg: profile.bodyweightKg,
    heightCm: u.heightCm,
    goal: "muscle" as const,
    trainingDays: 4,
  };
  const yPlan = generateDayPlan(foodDb, mealProfile, { date: yesterday });
  const yLog = createDayLog(yesterday);
  yPlan.slots.forEach((_, i) => logPlanned(foodDb, yLog, yPlan, i, null, null));

  useMealStore.setState((s) => ({
    weighIns,
    dayLogs: { ...s.dayLogs, [yesterday]: yLog },
    loggedSlots: {
      ...s.loggedSlots,
      [yesterday]: yPlan.slots.map((sl) => sl.index),
    },
  }));
}

/** Wipe everything back to a fresh install. */
export function resetAllData(): void {
  useWorkoutStore.setState({
    activePlanId: null,
    planProgress: {},
    sessions: [],
    active: null,
  });
  useStreakStore.getState().resetAll();
  useMealStore.getState().resetAll();
  useUserStore.getState().resetAll();
}
