"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  CircleHelp,
  Flag,
  Flame,
  PartyPopper,
  Plus,
  Shield,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { ExerciseThumbnail } from "@/components/exercises/ExerciseThumbnail";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { kgToLb } from "@/lib/engine/core";
import { dayTitle } from "@/lib/engine/schedule";
import { useHydrated } from "@/lib/store/useHydrated";
import { useStreakStore } from "@/lib/store/streakStore";
import { useUserStore } from "@/lib/store/userStore";
import { useWorkoutStore } from "@/lib/store/workoutStore";
import type { WorkoutSession } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { muscleInfoFor } from "./viewModels";
import { exerciseLibrary } from "@/data/exercises";
import { SessionTimer } from "./SessionTimer";
import { SetRow } from "./SetRow";

function formatDuration(sec: number): string {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export function RecordWorkout() {
  const router = useRouter();
  const hydrated = useHydrated();
  const units = useUserStore((s) => s.units);
  const active = useWorkoutStore((s) => s.active);
  const updateSet = useWorkoutStore((s) => s.updateSet);
  const addWorkingSet = useWorkoutStore((s) => s.addWorkingSet);
  const cancelSession = useWorkoutStore((s) => s.cancelSession);
  const completeSession = useWorkoutStore((s) => s.completeSession);
  const ensureWeeksClosed = useStreakStore((s) => s.ensureWeeksClosed);
  const streakWeeks = useStreakStore((s) => s.streakWeeks);

  const [openIdx, setOpenIdx] = useState(0);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [summary, setSummary] = useState<WorkoutSession | null>(null);

  const doneCount = useMemo(
    () =>
      active?.exercises.reduce(
        (a, ex) => a + ex.sets.filter((s) => s.done && !s.isWarmup).length,
        0,
      ) ?? 0,
    [active],
  );
  const totalWorking = useMemo(
    () =>
      active?.exercises.reduce(
        (a, ex) => a + ex.sets.filter((s) => !s.isWarmup).length,
        0,
      ) ?? 0,
    [active],
  );

  if (!hydrated) return null;

  if (!active && !summary) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[var(--max-width-content)] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-ink text-lg font-light">No workout in progress</p>
        <p className="text-ink-muted text-sm font-light">
          Start today&apos;s workout from the Workout page or the Start button.
        </p>
        <Link
          href="/home"
          className="text-accent text-sm underline-offset-4 hover:underline"
        >
          Back to Workout
        </Link>
      </div>
    );
  }

  const finish = () => {
    const session = completeSession();
    if (!session) return;
    ensureWeeksClosed();
    setSummary(session);
  };

  const discard = () => {
    cancelSession();
    router.replace("/home");
  };

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[var(--max-width-content)] flex-col px-[var(--spacing-page-x)] pt-[max(var(--spacing-page-y),env(safe-area-inset-top))] pb-32 md:max-w-lg">
      {active && (
        <>
          {/* Top bar: discard · timer · finish */}
          <header className="mb-2 flex items-start justify-between">
            <button
              type="button"
              onClick={() => setConfirmDiscard(true)}
              aria-label="Discard workout"
              className="ring-border-subtle mt-1 flex size-10 items-center justify-center rounded-full bg-white/[0.03] ring-1 transition-colors hover:bg-white/[0.07]"
            >
              <X className="text-ink-secondary size-4.5" strokeWidth={1.75} />
            </button>

            <SessionTimer startedAt={active.startedAt} />

            <button
              type="button"
              onClick={finish}
              disabled={doneCount === 0}
              aria-label="Finish workout"
              className={cn(
                "mt-1 flex size-10 items-center justify-center rounded-full ring-1 transition-colors",
                doneCount > 0
                  ? "bg-accent shadow-[0_0_16px_var(--color-accent-glow)] ring-transparent"
                  : "ring-border-subtle bg-white/[0.03] opacity-50",
              )}
            >
              <Flag
                className={cn(
                  "size-4.5",
                  doneCount > 0 ? "text-white" : "text-ink-muted",
                )}
                strokeWidth={1.75}
              />
            </button>
          </header>

          <p className="text-ink-secondary mb-6 text-center text-sm font-light">
            {dayTitle(active.dayName)} ·{" "}
            <span className="tabular-nums">
              {doneCount}/{totalWorking}
            </span>{" "}
            sets done
          </p>

          {/* Exercises */}
          <div className="flex flex-col gap-3">
            {active.exercises.map((ex, exIdx) => {
              const info = muscleInfoFor(ex.slug);
              const lib = exerciseLibrary[ex.slug];
              const workingSets = ex.sets.filter((s) => !s.isWarmup);
              const doneSets = workingSets.filter((s) => s.done).length;
              const open = openIdx === exIdx;
              const first = workingSets[0];
              const summaryLine =
                first?.plannedWeightKg != null && first.plannedWeightKg > 0
                  ? `${workingSets.length} × ${first.plannedRepsText} @ ${
                      units === "lb"
                        ? Math.round(kgToLb(first.plannedWeightKg))
                        : first.plannedWeightKg
                    } ${units}`
                  : `${workingSets.length} × ${first?.plannedRepsText ?? ""}`;

              return (
                <section
                  key={ex.slug + exIdx}
                  className={cn(
                    "overflow-hidden rounded-[1.5rem] ring-1 transition-colors",
                    doneSets === workingSets.length && workingSets.length > 0
                      ? "bg-[var(--color-accent-soft)]/40 ring-[var(--color-accent)]/30"
                      : "ring-border-subtle bg-white/[0.03]",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIdx(open ? -1 : exIdx)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left"
                  >
                    <div className="ring-border-subtle relative size-12 shrink-0 overflow-hidden rounded-xl ring-1">
                      <ExerciseThumbnail
                        videoUrl={lib?.videoUrl}
                        fallbackSrc={info.imageSrc}
                        alt={ex.name}
                        sizes="48px"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="text-ink truncate text-[0.9375rem] font-normal">
                        {ex.name}
                      </p>
                      <p className="text-ink-secondary text-[0.75rem] font-light tabular-nums">
                        {summaryLine} · {doneSets}/{workingSets.length} done
                      </p>
                    </div>
                    <Link
                      href={`/exercise/${ex.slug}`}
                      aria-label={`How to do ${ex.name}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-ink-muted hover:text-ink flex size-9 shrink-0 items-center justify-center rounded-full transition-colors"
                    >
                      <CircleHelp className="size-5" strokeWidth={1.5} />
                    </Link>
                    <ChevronDown
                      className={cn(
                        "text-ink-muted size-4 shrink-0 transition-transform",
                        open && "rotate-180",
                      )}
                      strokeWidth={1.75}
                    />
                  </button>

                  {open && (
                    <div className="flex flex-col gap-1.5 border-t border-white/[0.05] px-3 pt-2.5 pb-3">
                      {(() => {
                        let working = 0;
                        return ex.sets.map((set, setIdx) => (
                          <SetRow
                            key={setIdx}
                            set={set}
                            workingNumber={set.isWarmup ? null : ++working}
                            units={units}
                            onPatch={(patch) => updateSet(exIdx, setIdx, patch)}
                          />
                        ));
                      })()}
                      <button
                        type="button"
                        onClick={() => addWorkingSet(exIdx)}
                        className="text-accent mt-1 flex h-10 items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--color-border-strong)] text-[0.8125rem] font-light"
                      >
                        <Plus className="size-3.5" strokeWidth={2} />
                        Add set
                      </button>
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {/* Sticky finish bar */}
          <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[var(--max-width-content)] px-[var(--spacing-page-x)] pb-[max(1.25rem,env(safe-area-inset-bottom))] md:max-w-lg">
            <div className="bg-gradient-to-t from-black via-black/80 to-transparent pt-8 pb-0">
              <Button
                variant="accent"
                className="w-full gap-2"
                onClick={finish}
                disabled={doneCount === 0}
              >
                <Flag className="size-4.5" strokeWidth={2} />
                Finish workout
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Discard confirmation */}
      <Dialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        ariaLabel="Discard workout?"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 className="text-ink text-xl font-light tracking-tight">
              Discard this workout?
            </h2>
            <p className="text-ink-secondary text-sm leading-relaxed font-light">
              Logged sets from this session will be lost. This can&apos;t be
              undone.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmDiscard(false)}
              className="text-ink ring-border-subtle flex h-12 flex-1 items-center justify-center rounded-full bg-white/[0.05] text-sm font-light ring-1"
            >
              Keep going
            </button>
            <button
              type="button"
              onClick={discard}
              className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-red-500/85 text-sm font-normal text-white"
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
              Discard
            </button>
          </div>
        </div>
      </Dialog>

      {/* Finish summary */}
      <Dialog open={!!summary} onClose={() => {}} ariaLabel="Workout complete">
        {summary && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="bg-accent/15 ring-accent/30 flex size-14 items-center justify-center rounded-full ring-1">
                <PartyPopper className="text-accent size-6" strokeWidth={1.5} />
              </span>
              <h2 className="text-ink text-xl font-light tracking-tight">
                Workout complete
              </h2>
              <p className="text-ink-secondary text-sm font-light">
                {dayTitle(summary.dayName)}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                {
                  label: "Duration",
                  value: formatDuration(summary.durationSec),
                },
                {
                  label: "Volume",
                  value:
                    units === "lb"
                      ? `${Math.round(kgToLb(summary.volumeKg)).toLocaleString()} lb`
                      : `${summary.volumeKg.toLocaleString()} kg`,
                },
                { label: "Est. kcal", value: String(summary.estKcal) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="ring-border-subtle flex flex-col items-center gap-1 rounded-2xl bg-white/[0.04] px-2 py-3 ring-1"
                >
                  <span className="text-ink text-[1.0625rem] font-normal tabular-nums">
                    {stat.value}
                  </span>
                  <span className="text-ink-muted text-[0.625rem] font-light tracking-wide uppercase">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              {summary.credited ? (
                <p className="text-ink-secondary flex items-center gap-2 text-[0.8125rem] font-light">
                  <Flame
                    className="size-4 text-orange-400"
                    strokeWidth={1.75}
                  />
                  Session credited — {streakWeeks} week streak
                  <Shield
                    className="text-ink-muted ml-auto size-3.5"
                    strokeWidth={1.5}
                  />
                </p>
              ) : (
                <p className="text-ink-muted text-[0.8125rem] font-light">
                  Saved to history. Log a bit more next time to earn streak
                  credit.
                </p>
              )}
              {summary.prSlugs.length > 0 && (
                <p className="text-ink-secondary flex items-center gap-2 text-[0.8125rem] font-light">
                  <Trophy
                    className="size-4 text-amber-300"
                    strokeWidth={1.75}
                  />
                  New e1RM PR:{" "}
                  {summary.prSlugs
                    .map((s) => exerciseLibrary[s]?.name ?? s)
                    .slice(0, 2)
                    .join(", ")}
                  {summary.prSlugs.length > 2
                    ? ` +${summary.prSlugs.length - 2}`
                    : ""}
                </p>
              )}
            </div>

            <Button variant="accent" onClick={() => router.replace("/home")}>
              Done
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
