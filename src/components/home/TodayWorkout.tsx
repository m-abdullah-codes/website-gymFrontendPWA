"use client";

import Link from "next/link";
import { ChevronRight, CircleDot, Moon, Plus } from "lucide-react";
import { ExerciseThumbnail } from "@/components/exercises/ExerciseThumbnail";
import { Button } from "@/components/ui/Button";
import type { ExerciseView } from "@/components/workout/viewModels";

export interface TodayWorkoutProps {
  title: string;
  exercises: ExerciseView[];
  /** Null title/exercises → rest day. */
  isRest?: boolean;
  onRecord?: () => void;
  /** Label swaps to "Resume workout" when a session is already running. */
  recording?: boolean;
}

/** "3-4" → "3–4" for typographically correct ranges. */
function range(value: string) {
  return value.replace("-", "–");
}

export function TodayWorkout({
  title,
  exercises,
  isRest = false,
  onRecord,
  recording = false,
}: TodayWorkoutProps) {
  if (isRest) {
    return (
      <section
        aria-label="Rest day"
        className="ring-border-subtle flex flex-col items-center gap-3 rounded-[1.5rem] bg-white/[0.03] px-6 py-10 text-center ring-1"
      >
        <span className="bg-surface-elevated ring-border-subtle flex size-14 items-center justify-center rounded-2xl ring-1">
          <Moon className="text-ink-secondary size-6" strokeWidth={1.5} />
        </span>
        <p className="text-ink text-lg font-light">Rest day</p>
        <p className="text-ink-muted max-w-[24ch] text-sm leading-relaxed font-light">
          Recovery is where the growth happens. See the week plan for
          what&apos;s next.
        </p>
        {onRecord && (
          <button
            type="button"
            onClick={onRecord}
            className="text-accent mt-1 text-sm font-light underline-offset-4 hover:underline"
          >
            Train anyway — record a workout
          </button>
        )}
      </section>
    );
  }

  return (
    <section aria-label="Today's workout" className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <h3 className="text-ink text-lg leading-snug font-normal tracking-tight">
          {title}
        </h3>
        <span className="text-ink-muted pb-0.5 text-[0.8125rem] font-light whitespace-nowrap">
          {exercises.length} exercises
        </span>
      </div>

      <ol className="relative flex flex-col gap-2.5">
        {/* Connector line running through the thumbnails */}
        <span
          aria-hidden
          className="via-accent/25 absolute top-10 bottom-10 left-7 w-px bg-gradient-to-b from-transparent to-transparent"
        />

        {exercises.map((exercise, index) => (
          <li key={exercise.slug + index} className="relative py-1">
            <Link
              href={`/exercise/${exercise.slug}`}
              className="flex items-center gap-4 rounded-2xl transition-colors active:bg-white/[0.03]"
            >
              <div className="ring-border-subtle relative size-14 shrink-0 overflow-hidden rounded-2xl shadow-[0_4px_14px_rgba(0,0,0,0.45)] ring-1">
                <ExerciseThumbnail
                  videoUrl={exercise.videoUrl}
                  fallbackSrc={exercise.imageSrc}
                  alt={exercise.name}
                  sizes="56px"
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                {index === 0 && (
                  <span className="text-accent text-[0.625rem] font-medium tracking-[0.18em] uppercase">
                    Focus exercise
                  </span>
                )}
                <p className="text-ink text-[0.9375rem] leading-snug font-normal">
                  {exercise.name}
                </p>
                <p className="text-ink-secondary text-[0.8125rem] font-light">
                  {range(exercise.sets)} Sets • {range(exercise.reps)} Reps
                  {exercise.loadLine ? (
                    <span className="text-accent/90">
                      {" "}
                      • {exercise.loadLine}
                    </span>
                  ) : null}
                </p>
              </div>

              <span
                aria-hidden
                className="text-ink-muted flex size-8 shrink-0 items-center justify-center rounded-full"
              >
                <ChevronRight className="size-5" strokeWidth={1.5} />
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <Link
        href="/exercises"
        className="text-accent bg-surface-muted/30 flex h-14 w-full items-center justify-center gap-2 rounded-[1.15rem] border border-dashed border-[var(--color-border-strong)] text-[0.9375rem] font-normal"
      >
        <Plus className="size-4.5" strokeWidth={2} />
        Browse all exercises
      </Link>

      {onRecord && (
        <Button variant="accent" className="gap-2.5" onClick={onRecord}>
          <CircleDot className="size-4.5" strokeWidth={2} />
          {recording ? "Resume Workout" : "Record Workout"}
        </Button>
      )}
    </section>
  );
}
