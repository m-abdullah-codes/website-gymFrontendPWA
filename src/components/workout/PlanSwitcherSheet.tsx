"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Dumbbell, Sparkles } from "lucide-react";
import { plans, planId as planIdOf, type WorkoutPlan } from "@/data/exercises";
import { pickPlan } from "@/lib/engine/planPicker";
import { selectPickerInput, useUserStore } from "@/lib/store/userStore";
import { useWorkoutStore } from "@/lib/store/workoutStore";
import { useStreakStore } from "@/lib/store/streakStore";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";

interface PlanSwitcherSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * All 16 plans. The recommended plan (from the user's answers) explains why
 * it was selected; any plan can be switched to — progress on every plan is
 * kept separately, so switching away and back loses nothing.
 */
export function PlanSwitcherSheet({ open, onClose }: PlanSwitcherSheetProps) {
  const user = useUserStore();
  const activePlanId = useWorkoutStore((s) => s.activePlanId);
  const planProgress = useWorkoutStore((s) => s.planProgress);
  const activatePlan = useWorkoutStore((s) => s.activatePlan);
  const setWeeklyTarget = useStreakStore((s) => s.setWeeklyTarget);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pick = useMemo(
    () => (user.onboarded ? pickPlan(selectPickerInput(user)) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user.onboarded, user.answers],
  );
  const recommendedId = pick ? planIdOf(pick.plan) : null;

  const ordered = useMemo(() => {
    const list = [...plans];
    // Recommended first, then active, then the rest in data order.
    return list.sort((a, b) => {
      const rank = (p: WorkoutPlan) => {
        const id = planIdOf(p);
        if (id === recommendedId) return 0;
        if (id === activePlanId) return 1;
        return 2;
      };
      return rank(a) - rank(b);
    });
  }, [recommendedId, activePlanId]);

  const switchTo = (id: string, plan: WorkoutPlan) => {
    activatePlan(id);
    setWeeklyTarget(plan.daysPerWeek);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Training plans" size="tall">
      <div className="flex flex-col gap-3 pb-2">
        <p className="text-ink-muted text-[0.8125rem] leading-relaxed font-light">
          Switch anytime — progress on every plan is saved separately, so coming
          back picks up right where you left off.
        </p>

        {ordered.map((plan) => {
          const id = planIdOf(plan);
          const isActive = id === activePlanId;
          const isRecommended = id === recommendedId;
          const progress = planProgress[id];
          const expanded = expandedId === id;
          const chips = [plan.level, `${plan.daysPerWeek}d / week`, plan.split];

          return (
            <div
              key={id}
              className={cn(
                "overflow-hidden rounded-[1.25rem] ring-1 transition-colors",
                isActive
                  ? "bg-[var(--color-accent-soft)] ring-[var(--color-accent)]/50"
                  : "ring-border-subtle bg-white/[0.03]",
              )}
            >
              <button
                type="button"
                className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
                onClick={() => setExpandedId(expanded ? null : id)}
                aria-expanded={expanded}
              >
                <div
                  className={cn(
                    "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ring-1",
                    isActive
                      ? "bg-accent/20 ring-accent/40"
                      : "bg-surface-elevated ring-border-subtle",
                  )}
                >
                  <Dumbbell
                    className={cn(
                      "size-4.5",
                      isActive ? "text-accent" : "text-ink-muted",
                    )}
                    strokeWidth={1.5}
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-ink text-[0.9375rem] leading-snug font-normal">
                      {plan.plan.split("—")[0].trim()}
                    </p>
                    {isRecommended && (
                      <span className="text-accent flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-[0.625rem] font-normal tracking-wide uppercase ring-1 ring-[var(--color-accent)]/30">
                        <Sparkles className="size-2.5" strokeWidth={2} />
                        For you
                      </span>
                    )}
                    {isActive && (
                      <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[0.625rem] font-normal tracking-wide text-white uppercase ring-1 ring-white/20">
                        <Check className="size-2.5" strokeWidth={2.5} />
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {chips.map((chip) => (
                      <span
                        key={chip}
                        className="text-ink-secondary rounded-full bg-white/[0.06] px-2 py-0.5 text-[0.6875rem] font-light ring-1 ring-white/10"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                  {progress && progress.sessionsCompleted > 0 && (
                    <p className="text-ink-muted text-[0.6875rem] font-light">
                      {progress.sessionsCompleted} session
                      {progress.sessionsCompleted === 1 ? "" : "s"} logged —
                      progress saved
                    </p>
                  )}
                </div>

                <ChevronDown
                  className={cn(
                    "text-ink-muted mt-1 size-4 shrink-0 transition-transform",
                    expanded && "rotate-180",
                  )}
                  strokeWidth={1.5}
                />
              </button>

              {expanded && (
                <div className="border-t border-white/[0.06] px-4 pt-3 pb-4">
                  {isRecommended && pick && (
                    <div className="mb-3 flex flex-col gap-2">
                      <span className="text-ink-muted text-[0.625rem] font-light tracking-[0.18em] uppercase">
                        Why we picked this for you
                      </span>
                      <ul className="flex flex-col gap-1.5">
                        {pick.reasons.map((r) => (
                          <li
                            key={r}
                            className="text-ink-secondary flex items-start gap-2 text-[0.75rem] leading-relaxed font-light"
                          >
                            <span
                              aria-hidden
                              className="bg-accent mt-1.5 size-1 shrink-0 rounded-full"
                            />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="text-ink-secondary mb-3 flex flex-col gap-1 text-[0.75rem] font-light">
                    <span>Goals: {plan.goals.join(" · ")}</span>
                    <span>
                      {plan.days.length} workout
                      {plan.days.length === 1 ? "" : "s"} ·{" "}
                      {plan.progressionModel} progression
                    </span>
                  </div>
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => switchTo(id, plan)}
                      className="bg-accent flex h-11 w-full items-center justify-center rounded-full text-sm font-normal text-white shadow-[0_0_20px_var(--color-accent-glow)] transition-transform active:scale-[0.98]"
                    >
                      {progress ? "Resume this plan" : "Switch to this plan"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
