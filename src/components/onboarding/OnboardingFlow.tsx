"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { lbToKg } from "@/lib/engine/core";
import { pickPlan } from "@/lib/engine/planPicker";
import { planId as planIdOf } from "@/data/exercises";
import { useUserStore, type StoredAnswers } from "@/lib/store/userStore";
import { useWorkoutStore } from "@/lib/store/workoutStore";
import { useStreakStore } from "@/lib/store/streakStore";
import { BuildingScreen } from "./BuildingScreen";
import { IntroScreen } from "./IntroScreen";
import { OnboardingBlobs } from "./OnboardingBlobs";
import { PlanRevealDialog } from "./PlanRevealDialog";
import { QuestionStep } from "./QuestionStep";
import { RepMaxStep } from "./RepMaxStep";
import { StatsStep } from "./StatsStep";
import { pruneAnswers, visibleSteps } from "./steps";
import type { BodyStats, OnboardingAnswers, RepMaxes } from "./types";

/** Pause after picking an option so the selection state can land before advancing. */
const ADVANCE_DELAY_MS = 350;

type Phase = "intro" | "questions" | "stats" | "building" | "reveal" | "repMax";

export function OnboardingFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [stats, setStats] = useState<BodyStats>({
    age: "",
    weight: "",
    weightUnit: "kg",
    height: "",
    targetWeight: "",
  });
  const advanceTimeout = useRef<number | null>(null);

  const steps = visibleSteps(answers);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  // Body stats count as the final step of the questionnaire.
  const totalSteps = steps.length + 1;
  const currentStep = phase === "stats" ? totalSteps : stepIndex + 1;

  /** The assigned plan — deterministic from the answers. */
  const pick = useMemo(() => {
    const str = (v: unknown, fb = "") => (typeof v === "string" ? v : fb);
    const goal = str(answers.goal, "muscle");
    return pickPlan({
      gender: str(answers.gender) === "female" ? "female" : "male",
      adult: str(answers.over40) === "yes" && str(answers.adult) === "yes",
      goal: ([
        "muscle",
        "lean",
        "stronger",
        "reduce",
        "fitness",
        "powerlifting",
      ].includes(goal)
        ? goal
        : "muscle") as "muscle",
      days: parseInt(str(answers.days, "3"), 10) || 3,
      level: (["beginner", "intermediate", "advanced"].includes(
        str(answers.level),
      )
        ? str(answers.level)
        : "beginner") as "beginner",
      split: str(answers.split, "No preference"),
    });
  }, [answers]);

  useEffect(
    () => () => {
      if (advanceTimeout.current !== null) {
        window.clearTimeout(advanceTimeout.current);
      }
    },
    [],
  );

  const advance = useCallback(
    (nextAnswers: OnboardingAnswers) => {
      if (stepIndex + 1 < visibleSteps(nextAnswers).length) {
        setStepIndex(stepIndex + 1);
      } else {
        setPhase("stats");
      }
    },
    [stepIndex],
  );

  const selectOption = (value: string) => {
    if (!step) return;
    if (step.multiSelect) {
      // Toggle within an array; the exclusive option clears everything else.
      const current = answers[step.key];
      const arr = Array.isArray(current) ? current : [];
      let next: string[];
      if (value === step.exclusiveValue) {
        next = arr.includes(value) ? [] : [value];
      } else {
        next = arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr.filter((v) => v !== step.exclusiveValue), value];
      }
      setAnswers(pruneAnswers({ ...answers, [step.key]: next }));
      return;
    }
    if (advanceTimeout.current !== null) return; // already advancing
    const nextAnswers = pruneAnswers({ ...answers, [step.key]: value });
    setAnswers(nextAnswers);
    advanceTimeout.current = window.setTimeout(() => {
      advanceTimeout.current = null;
      advance(nextAnswers);
    }, ADVANCE_DELAY_MS);
  };

  const continueMultiSelect = () => advance(answers);

  const goBack = () => {
    if (advanceTimeout.current !== null) {
      window.clearTimeout(advanceTimeout.current);
      advanceTimeout.current = null;
    }
    if (phase === "stats") {
      setPhase("questions"); // stepIndex still points at the last question
    } else if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    } else {
      setPhase("intro");
    }
  };

  const handleBuildDone = useCallback(() => setPhase("reveal"), []);

  const finish = (repMaxes: RepMaxes | null) => {
    const toKg = (value: string): number | null => {
      const n = parseFloat(value);
      if (!Number.isFinite(n) || n <= 0) return null;
      return stats.weightUnit === "kg" ? n : Math.round(lbToKg(n) * 10) / 10;
    };

    const storedAnswers: StoredAnswers = { ...answers };
    const targetKg = toKg(stats.targetWeight);
    if (targetKg) storedAnswers.targetWeightKg = String(targetKg);

    const repMaxesKg = repMaxes
      ? Object.fromEntries(
          Object.entries(repMaxes)
            .filter(([, e]) => Number(e.weight) > 0 && Number(e.reps) > 0)
            .map(([key, e]) => [
              key,
              { weightKg: toKg(e.weight) ?? 0, reps: parseInt(e.reps, 10) },
            ]),
        )
      : null;

    useUserStore.getState().completeOnboarding({
      answers: storedAnswers,
      ageYears: parseInt(stats.age, 10) || null,
      heightCm: parseInt(stats.height, 10) || null,
      bodyweightKg: toKg(stats.weight),
      repMaxes: repMaxesKg,
      units: stats.weightUnit === "kg" ? "kg" : "lb",
    });

    const assignedId = planIdOf(pick.plan);
    useWorkoutStore.getState().activatePlan(assignedId);
    useStreakStore.getState().begin(pick.plan.daysPerWeek);

    router.replace("/home");
  };

  const showHeader = phase === "questions" || phase === "stats";

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden">
      <OnboardingBlobs />
      <div className="mx-auto flex w-full max-w-[var(--max-width-content)] flex-1 flex-col px-[var(--spacing-page-x)] pt-[max(var(--spacing-page-y),env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {showHeader && (
          <header className="motion-safe:animate-fade-in flex items-center gap-4">
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              className="ring-border-subtle flex size-10 shrink-0 items-center justify-center rounded-full ring-1 transition-colors hover:bg-white/5"
            >
              <ChevronLeft className="text-ink size-5" strokeWidth={1.5} />
            </button>
            <ProgressBar
              value={currentStep}
              max={totalSteps}
              label="Onboarding progress"
              className="flex-1"
            />
            <span className="text-ink-muted w-10 shrink-0 text-right text-xs font-light tabular-nums">
              {currentStep}/{totalSteps}
            </span>
          </header>
        )}

        {phase === "intro" && (
          <IntroScreen
            onStart={() => {
              setStepIndex(0);
              setPhase("questions");
            }}
          />
        )}

        {phase === "questions" && step && (
          <QuestionStep
            key={step.key}
            step={step}
            selected={answers[step.key]}
            onSelect={selectOption}
            onContinue={continueMultiSelect}
          />
        )}

        {phase === "stats" && (
          <StatsStep
            stats={stats}
            onChange={setStats}
            onContinue={() => setPhase("building")}
          />
        )}

        {phase === "building" && <BuildingScreen onDone={handleBuildDone} />}

        {phase === "reveal" && (
          <PlanRevealDialog
            plan={{
              name: pick.plan.plan,
              level: pick.plan.level,
              daysPerWeek: pick.plan.daysPerWeek,
              split: pick.plan.split,
              goals: pick.plan.goals,
              reasons: pick.reasons,
            }}
            onContinue={() => setPhase("repMax")}
          />
        )}

        {phase === "repMax" && (
          <RepMaxStep weightUnit={stats.weightUnit} onFinish={finish} />
        )}
      </div>
    </div>
  );
}
