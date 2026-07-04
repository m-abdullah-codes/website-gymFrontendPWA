"use client";

import { useMemo } from "react";
import { Bike, Flame, Pause, Shield, Sparkles } from "lucide-react";
import { exerciseLibrary } from "@/data/exercises";
import { useActivePlan } from "@/lib/hooks/useActivePlan";
import {
  currentWeekTarget,
  currentWeekValidCount,
  useStreakStore,
} from "@/lib/store/streakStore";
import { useWorkoutStore } from "@/lib/store/workoutStore";
import { useUserStore, selectCardio } from "@/lib/store/userStore";
import { addDays, nextMilestone } from "@/lib/streak/engine";
import {
  prorateGroupTargets,
  weeklyCompleted,
  weeklyTargets,
  SET_BAND,
  type Muscle,
} from "@/lib/volume/engine";
import { weekStartOf } from "@/lib/streak/engine";
import { StatRing } from "./StatRing";

const dateRange = (weekStart: string) => {
  const fmt = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  return `${fmt(weekStart)} – ${fmt(addDays(weekStart, 6))}`;
};

/** Parse "8 Week …" / "12 Wk …" plan-name durations. */
function planWeeks(planName: string): number | null {
  const m = planName.match(/(\d+)\s*(?:week|wk)/i);
  return m ? parseInt(m[1], 10) : null;
}

export function TargetsTab() {
  const view = useActivePlan();
  const sessions = useWorkoutStore((s) => s.sessions);
  const active = useWorkoutStore((s) => s.active);
  const streak = useStreakStore();
  const user = useUserStore();

  const weekStart = weekStartOf(view.todayIso);

  const data = useMemo(() => {
    if (!view.plan || !view.progress) return null;
    const dayIdxs = view.week.map((s) => s.dayIndex);
    const full = weeklyTargets(view.plan, dayIdxs);
    const targets = prorateGroupTargets(
      full,
      view.progress.startedAt,
      weekStart,
    );
    const completed = weeklyCompleted(sessions, weekStart, active?.exercises);

    // Coach hint: worst per-muscle outlier vs the 10–20 science band.
    const perMuscle = new Map<Muscle, number>();
    for (const di of dayIdxs) {
      if (di == null) continue;
      for (const ex of view.plan.days[di].exercises) {
        if (ex.loadMode === "duration") continue;
        const primary = exerciseLibrary[ex.slug]?.primaryMuscles[0] as
          Muscle | undefined;
        if (!primary) continue;
        perMuscle.set(
          primary,
          (perMuscle.get(primary) ?? 0) +
            (Math.max(ex.setsMax ?? 0, ex.setsMin ?? 0) || 3),
        );
      }
    }
    let hint: string | null = null;
    let worstDelta = 0;
    for (const [muscle, sets] of perMuscle) {
      if (sets > SET_BAND.max && sets - SET_BAND.max > worstDelta) {
        worstDelta = sets - SET_BAND.max;
        hint = `${muscle} is scheduled for ${sets} sets this week — above the ${SET_BAND.min}–${SET_BAND.max} band most research supports. Fine short-term; watch recovery.`;
      } else if (
        sets < SET_BAND.min &&
        sets >= 4 &&
        SET_BAND.min - sets > worstDelta
      ) {
        worstDelta = SET_BAND.min - sets;
        hint = `${muscle} only gets ${sets} sets this week — below the ${SET_BAND.min}–${SET_BAND.max} band. Consider an extra accessory if it's a priority.`;
      }
    }

    const weeksIn =
      Math.floor(
        (new Date(weekStart).getTime() -
          new Date(weekStartOf(view.progress.startedAt)).getTime()) /
          (7 * 86400000),
      ) + 1;

    return {
      targets,
      completed,
      hint,
      weeksIn,
      totalWeeks: planWeeks(view.plan.plan),
    };
  }, [view.plan, view.progress, view.week, sessions, active, weekStart]);

  if (!view.plan || !view.progress || !data) {
    return (
      <p className="text-ink-muted py-10 text-center text-sm font-light">
        Complete onboarding to see weekly targets.
      </p>
    );
  }

  const validCount = currentWeekValidCount();
  const weekTarget = currentWeekTarget(streak);
  const milestone = nextMilestone(streak.streakWeeks);
  const cardio = selectCardio(user);
  const dayProgress = (view.todayWeekdayIdx + 1) / 7;

  return (
    <div className="flex flex-col gap-5">
      {/* Header: Week X of Y · plan, date range, week progress */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-ink text-[1.0625rem] font-normal tracking-tight">
            Week {data.weeksIn}
            {data.totalWeeks ? ` of ${data.totalWeeks}` : ""}
            <span className="text-ink-secondary font-light">
              {" "}
              · {view.plan.plan.split("—")[0].trim()}
            </span>
          </h2>
          {cardio !== "none" && (
            <span className="text-ink-secondary flex shrink-0 items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[0.6875rem] font-light ring-1 ring-white/10">
              <Bike className="size-3" strokeWidth={1.75} />+
              {cardio === "2x" ? 2 : 3} cardio
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-ink-muted text-xs font-light">
            {dateRange(weekStart)}
          </span>
          <div className="bg-track h-1 flex-1 overflow-hidden rounded-full">
            <div
              className="bg-fill h-full rounded-full transition-all"
              style={{ width: `${Math.round(dayProgress * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Module A: rings */}
      <section
        aria-label="Weekly set targets"
        className="ring-border-subtle flex items-center justify-between rounded-[1.5rem] bg-white/[0.03] px-4 py-5 ring-1"
      >
        <StatRing
          label="Push"
          completed={data.completed.push}
          target={data.targets.push}
        />
        <StatRing
          label="Pull"
          completed={data.completed.pull}
          target={data.targets.pull}
        />
        <StatRing
          label="Legs"
          completed={data.completed.legs}
          target={data.targets.legs}
        />
      </section>

      {/* Core chip + coach hint */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ink-secondary rounded-full bg-white/[0.06] px-3 py-1.5 text-[0.75rem] font-light tabular-nums ring-1 ring-white/10">
          Core {data.completed.core}/{data.targets.core} sets
        </span>
        {streak.paused && (
          <span className="text-ink-secondary flex items-center gap-1 rounded-full bg-white/[0.06] px-3 py-1.5 text-[0.75rem] font-light ring-1 ring-white/10">
            <Pause className="size-3" strokeWidth={1.75} />
            Streak paused
          </span>
        )}
      </div>

      {data.hint && (
        <div className="ring-border-subtle flex items-start gap-3 rounded-2xl bg-white/[0.03] px-4 py-3.5 ring-1">
          <Sparkles
            className="text-accent mt-0.5 size-4 shrink-0"
            strokeWidth={1.5}
          />
          <p className="text-ink-secondary text-[0.8125rem] leading-relaxed font-light">
            {data.hint}
          </p>
        </div>
      )}

      {/* Module B: streak card */}
      <section
        aria-label="Streak"
        className="relative overflow-hidden rounded-[1.5rem] border border-[var(--color-card-border)] bg-[linear-gradient(165deg,rgba(19,36,72,0.55)_0%,rgba(4,11,26,0.85)_70%)] p-5"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-orange-500/15 ring-1 ring-orange-400/30">
              <Flame className="size-6 text-orange-400" strokeWidth={1.5} />
            </span>
            <div className="flex flex-col">
              <span className="text-ink text-2xl leading-tight font-light tabular-nums">
                {streak.streakWeeks}
                <span className="text-ink-secondary ml-1.5 text-sm font-light">
                  week{streak.streakWeeks === 1 ? "" : "s"}
                </span>
              </span>
              <span className="text-ink-muted text-xs font-light">
                current streak
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div
              className="flex gap-1.5"
              aria-label={`${streak.shields} shields banked`}
            >
              {[0, 1].map((i) => (
                <Shield
                  key={i}
                  className={
                    i < streak.shields
                      ? "size-5 text-sky-300"
                      : "text-ink-muted/40 size-5"
                  }
                  strokeWidth={1.5}
                  fill={i < streak.shields ? "currentColor" : "none"}
                />
              ))}
            </div>
            <span className="text-ink-muted text-[0.625rem] font-light">
              shields
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-ink-secondary text-xs font-light">
                Sessions this week
              </span>
              <span className="text-ink text-xs font-normal tabular-nums">
                {validCount}/{weekTarget}
              </span>
            </div>
            <div className="bg-track h-1.5 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-orange-400 transition-all"
                style={{
                  width: `${Math.min(100, (validCount / Math.max(weekTarget, 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
          {milestone && (
            <div className="flex shrink-0 flex-col items-end">
              <span className="text-ink text-sm font-light tabular-nums">
                {milestone}w
              </span>
              <span className="text-ink-muted text-[0.625rem] font-light">
                next milestone
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
