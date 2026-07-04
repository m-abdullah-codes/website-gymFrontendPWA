"use client";

import Link from "next/link";
import { ChevronDown, Dumbbell, Moon } from "lucide-react";
import { ExerciseThumbnail } from "@/components/exercises/ExerciseThumbnail";
import type { ExerciseView } from "@/components/workout/viewModels";

export type WeekDayView = {
  weekday: string;
  title: string;
  isRest: boolean;
  isToday: boolean;
  exercises: ExerciseView[];
};

interface WeekPlanProps {
  days: WeekDayView[];
  /** Shown for A/B-style plans whose workouts rotate through the week. */
  rotating?: boolean;
}

function range(value: string) {
  return value.replace("-", "–");
}

export function WeekPlan({ days, rotating = false }: WeekPlanProps) {
  return (
    <section aria-label="Full week plan" className="flex flex-col gap-5">
      <p className="text-ink-muted text-[0.8125rem] leading-relaxed font-light">
        {rotating
          ? "This plan cycles its workouts — the layout below advances as you complete sessions."
          : "The split repeats each week — add weight once you hit the top of a rep range."}
      </p>

      <div className="flex flex-col gap-3">
        {days.map((day) => {
          if (day.isRest) {
            return (
              <div
                key={day.weekday}
                className="bg-surface-muted/40 ring-border-subtle flex items-center gap-4 rounded-[1.25rem] px-4 py-3.5 ring-1"
              >
                <div className="bg-surface-elevated ring-border-subtle flex size-11 shrink-0 items-center justify-center rounded-xl ring-1">
                  <Moon className="text-ink-muted size-5" strokeWidth={1.5} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-ink-secondary text-[0.9375rem] font-light">
                    Rest day
                  </p>
                  <p className="text-ink-muted text-xs font-light">
                    {day.weekday} • Recovery &amp; mobility
                  </p>
                </div>
                {day.isToday && (
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.6875rem] font-medium text-white ring-1 ring-white/20">
                    Today
                  </span>
                )}
              </div>
            );
          }

          return (
            <details
              key={day.weekday}
              open={day.isToday}
              className="group bg-surface-muted/40 ring-border-subtle overflow-hidden rounded-[1.25rem] ring-1"
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 px-4 py-3.5 select-none [&::-webkit-details-marker]:hidden">
                <div className="bg-surface-elevated ring-border-subtle flex size-11 shrink-0 items-center justify-center rounded-xl ring-1">
                  <Dumbbell className="text-accent size-5" strokeWidth={1.5} />
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-ink text-[0.9375rem] font-normal">
                    {day.title}
                  </p>
                  <p className="text-ink-secondary text-xs font-light">
                    {day.weekday} • {day.exercises.length} exercises
                  </p>
                </div>

                {day.isToday && (
                  <span className="bg-accent rounded-full px-2.5 py-1 text-[0.6875rem] font-medium text-white shadow-[0_0_12px_var(--color-accent-glow)]">
                    Today
                  </span>
                )}

                <ChevronDown
                  className="text-ink-muted size-4.5 shrink-0 transition-transform group-open:rotate-180"
                  strokeWidth={1.5}
                />
              </summary>

              <ul className="border-border-subtle flex flex-col gap-2.5 border-t px-4 pt-3 pb-4">
                {day.exercises.map((exercise, i) => (
                  <li key={exercise.slug + i}>
                    <Link
                      href={`/exercise/${exercise.slug}`}
                      className="flex items-center gap-3"
                    >
                      <div className="ring-border-subtle relative size-9 shrink-0 overflow-hidden rounded-lg ring-1">
                        <ExerciseThumbnail
                          videoUrl={exercise.videoUrl}
                          fallbackSrc={exercise.imageSrc}
                          alt={exercise.name}
                          sizes="36px"
                        />
                      </div>
                      <p className="text-ink min-w-0 flex-1 truncate text-sm font-light">
                        {exercise.name}
                      </p>
                      <p className="text-ink-secondary text-xs font-light whitespace-nowrap">
                        {range(exercise.sets)} × {range(exercise.reps)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </section>
  );
}
