"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Settings2 } from "lucide-react";
import { PlanHeroCard } from "@/components/home/PlanHeroCard";
import { PlanTabs } from "@/components/home/PlanTabs";
import type { WeekDayView } from "@/components/home/WeekPlan";
import { Sheet } from "@/components/ui/Sheet";
import { dayTitle } from "@/lib/engine/schedule";
import { loadLineFor, useActivePlan } from "@/lib/hooks/useActivePlan";
import { useWorkoutStore } from "@/lib/store/workoutStore";
import { PlanSwitcherSheet } from "./PlanSwitcherSheet";
import { toExerciseView } from "./viewModels";

export function WorkoutHome() {
  const router = useRouter();
  const view = useActivePlan();
  const active = useWorkoutStore((s) => s.active);
  const startSession = useWorkoutStore((s) => s.startSession);
  const [plansOpen, setPlansOpen] = useState(false);
  const [dayPickerOpen, setDayPickerOpen] = useState(false);

  const week: WeekDayView[] = useMemo(() => {
    if (!view.plan) return [];
    return view.week.map((slot) => ({
      weekday: slot.weekday,
      isToday: slot.weekdayIdx === view.todayWeekdayIdx,
      isRest: slot.dayIndex == null,
      title:
        slot.dayIndex != null
          ? dayTitle(view.plan!.days[slot.dayIndex].day)
          : "Rest day",
      exercises:
        slot.dayIndex != null
          ? view.plan!.days[slot.dayIndex].exercises.map((ex) =>
              toExerciseView(ex),
            )
          : [],
    }));
  }, [view.plan, view.week, view.todayWeekdayIdx]);

  const todayExercises = useMemo(() => {
    if (!view.plan || view.todayDayIndex == null) return [];
    return view.plan.days[view.todayDayIndex].exercises.map((ex) =>
      toExerciseView(ex, loadLineFor(view.prescription, ex.slug)),
    );
  }, [view.plan, view.todayDayIndex, view.prescription]);

  const record = (dayIndex: number | null) => {
    if (active) {
      router.push("/workout/record");
      return;
    }
    if (dayIndex == null) {
      setDayPickerOpen(true);
      return;
    }
    startSession(dayIndex);
    router.push("/workout/record");
  };

  // Static skeleton — identical on server and first client render.
  if (!view.hydrated) {
    return (
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[var(--max-width-content)] min-w-0 flex-col gap-6 md:max-w-lg">
        <div className="ring-border-subtle aspect-[16/10] w-full animate-pulse rounded-[var(--radius-card)] bg-white/[0.03] ring-1 md:aspect-[2/1]" />
        <div className="bg-surface-muted/60 h-12 w-full animate-pulse rounded-full" />
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl bg-white/[0.03]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!view.onboarded || !view.plan) {
    return (
      <div className="mx-auto flex h-full w-full max-w-[var(--max-width-content)] flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="flex flex-col gap-2.5">
          <h2 className="text-ink text-2xl font-light tracking-tight">
            Let&apos;s build your plan
          </h2>
          <p className="text-ink-secondary max-w-[30ch] text-sm leading-relaxed font-light">
            Answer a few quick questions and we&apos;ll assign the right
            program, starting weights and meal targets.
          </p>
        </div>
        <Link
          href="/onboarding"
          className="bg-accent flex h-13 items-center justify-center gap-2 rounded-full px-8 text-[0.9375rem] font-normal text-white shadow-[0_0_24px_var(--color-accent-glow)] transition-transform active:scale-[0.98]"
        >
          Start onboarding
          <ArrowRight className="size-4.5" strokeWidth={2} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[var(--max-width-content)] min-w-0 flex-col gap-6 md:max-w-lg">
      <PlanHeroCard
        className="shrink-0"
        planName={view.plan.plan}
        level={view.plan.level}
        daysPerWeek={view.plan.daysPerWeek}
        split={view.plan.split}
        action={
          <button
            type="button"
            onClick={() => setPlansOpen(true)}
            aria-label="Change training plan"
            className="flex size-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur-sm transition-colors hover:bg-white/15"
          >
            <Settings2 className="text-ink size-4" strokeWidth={1.75} />
          </button>
        }
      />

      <PlanTabs
        today={{
          title: view.todayTitle ?? "Rest day",
          exercises: todayExercises,
          isRest: view.todayDayIndex == null,
          recording: !!active,
          onRecord: () => record(view.todayDayIndex),
        }}
        week={week}
        rotating={view.week.some((s) => s.rotating)}
      />

      <PlanSwitcherSheet open={plansOpen} onClose={() => setPlansOpen(false)} />

      <Sheet
        open={dayPickerOpen}
        onClose={() => setDayPickerOpen(false)}
        title="Pick a workout"
      >
        <div className="flex flex-col gap-2 pb-2">
          <p className="text-ink-muted pb-1 text-[0.8125rem] font-light">
            Today is a rest day — choose which workout to record instead.
          </p>
          {view.plan.days.map((day, i) => (
            <button
              key={day.day}
              type="button"
              onClick={() => {
                setDayPickerOpen(false);
                startSession(i);
                router.push("/workout/record");
              }}
              className="ring-border-subtle flex items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-3.5 text-left ring-1 transition-colors hover:bg-white/[0.06]"
            >
              <span className="text-ink text-sm font-light">
                {dayTitle(day.day)}
              </span>
              <span className="text-ink-muted text-xs font-light">
                {day.exercises.length} exercises
              </span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
