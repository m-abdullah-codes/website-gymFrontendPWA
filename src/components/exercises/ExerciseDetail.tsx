"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ExerciseLibraryEntry } from "@/data/exercises";
import { muscleImageFor } from "@/components/workout/viewModels";
import { cn } from "@/lib/utils";

const TABS = ["Instructions", "Target", "Equipment"] as const;
type Tab = (typeof TABS)[number];

interface ExerciseDetailProps {
  slug: string;
  entry: ExerciseLibraryEntry;
}

export function ExerciseDetail({ entry }: ExerciseDetailProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Instructions");

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Top 50vh: the exercise video */}
      <div className="relative h-[50vh] w-full shrink-0 overflow-hidden bg-[#05080f]">
        {entry.videoUrl ? (
          <video
            src={entry.videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <Image
            src={muscleImageFor(entry.primaryMuscles[0])}
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-80"
            priority
          />
        )}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(to_top,rgba(0,4,12,0.95),transparent)]"
        />
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 flex size-10 items-center justify-center rounded-full bg-black/45 ring-1 ring-white/15 backdrop-blur-sm"
        >
          <ChevronLeft className="text-ink size-5" strokeWidth={1.75} />
        </button>
        <div className="absolute inset-x-0 bottom-4 px-6">
          <h1 className="text-ink text-2xl leading-snug font-light tracking-tight">
            {entry.name}
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-auto flex w-full max-w-[var(--max-width-content)] flex-1 flex-col gap-5 px-[var(--spacing-page-x)] pt-5 pb-[max(2rem,env(safe-area-inset-bottom))] md:max-w-lg">
        <div
          role="tablist"
          aria-label="Exercise details"
          className="bg-surface-muted/60 ring-border-subtle flex w-full shrink-0 rounded-full p-1 ring-1"
        >
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-full py-2.5 text-sm transition-colors",
                tab === t
                  ? "text-ink-inverse bg-white font-normal shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
                  : "text-ink-secondary font-light",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="flex flex-col gap-4">
          {tab === "Instructions" && (
            <ol className="flex flex-col gap-3.5">
              {entry.instructions.map((step, i) => (
                <li key={i} className="flex items-start gap-3.5">
                  <span className="bg-accent/15 text-accent ring-accent/25 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-normal tabular-nums ring-1">
                    {i + 1}
                  </span>
                  <p className="text-ink-secondary text-[0.9375rem] leading-relaxed font-light">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          )}

          {tab === "Target" && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <span className="text-ink-muted text-[0.6875rem] font-light tracking-[0.18em] uppercase">
                  Primary muscles
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {entry.primaryMuscles.map((m) => (
                    <MuscleCard key={m} muscle={m} primary />
                  ))}
                </div>
              </div>
              {entry.secondaryMuscles.length > 0 && (
                <div className="flex flex-col gap-3">
                  <span className="text-ink-muted text-[0.6875rem] font-light tracking-[0.18em] uppercase">
                    Also works
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {entry.secondaryMuscles.map((m) => (
                      <MuscleCard key={m} muscle={m} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "Equipment" && (
            <ul className="flex flex-col gap-2.5">
              {entry.equipment.length === 0 && (
                <li className="text-ink-secondary text-sm font-light">
                  No equipment — bodyweight only.
                </li>
              )}
              {entry.equipment.map((eq) => (
                <li
                  key={eq}
                  className="ring-border-subtle flex items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3.5 ring-1"
                >
                  <span className="bg-surface-elevated ring-border-subtle flex size-9 items-center justify-center rounded-lg ring-1">
                    <span className="bg-accent size-1.5 rounded-full" />
                  </span>
                  <span className="text-ink text-sm font-light">{eq}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function MuscleCard({
  muscle,
  primary = false,
}: {
  muscle: string;
  primary?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative h-24 overflow-hidden rounded-2xl ring-1",
        primary ? "ring-[var(--color-accent)]/40" : "ring-border-subtle",
      )}
    >
      <Image
        src={muscleImageFor(muscle)}
        alt=""
        fill
        sizes="(max-width: 768px) 50vw, 256px"
        className="object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,4,12,0.85),rgba(0,4,12,0.15))]"
      />
      <span className="text-ink absolute bottom-2.5 left-3 text-[0.8125rem] font-normal">
        {muscle}
      </span>
      {primary && (
        <span className="bg-accent absolute top-2 right-2 rounded-full px-2 py-0.5 text-[0.5625rem] font-medium tracking-wide text-white uppercase">
          Primary
        </span>
      )}
    </div>
  );
}
