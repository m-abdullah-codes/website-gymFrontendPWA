"use client";

import { Check, Minus, Plus } from "lucide-react";
import { kgToLb, lbToKg } from "@/lib/engine/core";
import type { WeightUnits } from "@/lib/engine/types";
import type { SessionSetRecord } from "@/lib/store/types";
import { cn } from "@/lib/utils";

interface SetRowProps {
  set: SessionSetRecord;
  /** 1-based position among the exercise's WORKING sets (warm-ups excluded). */
  workingNumber: number | null;
  units: WeightUnits;
  onPatch: (
    patch: Partial<Pick<SessionSetRecord, "weightKg" | "reps" | "done">>,
  ) => void;
}

const KG_STEP = 2.5;
const LB_STEP = 5; // display-step in pounds

function displayWeight(weightKg: number | null, units: WeightUnits): string {
  if (weightKg == null) return "—";
  if (weightKg === 0) return "BW";
  const v = units === "lb" ? kgToLb(weightKg) : weightKg;
  const rounded = Math.round(v * 2) / 2;
  return String(rounded % 1 === 0 ? Math.round(rounded) : rounded);
}

export function SetRow({ set, workingNumber, units, onPatch }: SetRowProps) {
  const bumpWeight = (dir: 1 | -1) => {
    const current = set.weightKg ?? 0;
    const next =
      units === "lb"
        ? lbToKg(Math.max(0, kgToLb(current) + dir * LB_STEP))
        : Math.max(0, current + dir * KG_STEP);
    onPatch({ weightKg: Math.round(next * 100) / 100 });
  };

  const bumpReps = (dir: 1 | -1) => {
    const next = Math.max(0, (set.reps ?? 0) + dir);
    onPatch({ reps: next });
  };

  const stepper = (
    label: string,
    value: string,
    onDown: () => void,
    onUp: () => void,
    disabled = false,
  ) => (
    <div className="flex flex-1 flex-col items-center gap-1">
      <span className="text-ink-muted text-[0.5625rem] font-light tracking-[0.16em] uppercase">
        {label}
      </span>
      <div
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl bg-white/[0.05] ring-1 ring-white/[0.07]",
          disabled && "opacity-40",
        )}
      >
        <button
          type="button"
          onClick={onDown}
          disabled={disabled}
          aria-label={`Decrease ${label}`}
          className="flex h-full w-9 items-center justify-center"
        >
          <Minus className="text-ink-secondary size-3.5" strokeWidth={2} />
        </button>
        <span className="text-ink min-w-0 text-center text-[0.9375rem] font-normal tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={onUp}
          disabled={disabled}
          aria-label={`Increase ${label}`}
          className="flex h-full w-9 items-center justify-center"
        >
          <Plus className="text-ink-secondary size-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );

  const isBodyweight = set.plannedWeightKg === 0;
  const isDuration = set.plannedWeightKg == null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors",
        set.done ? "bg-[var(--color-accent-soft)]/60" : "bg-white/[0.02]",
      )}
    >
      <span
        className={cn(
          "w-12 shrink-0 text-[0.6875rem] font-light",
          set.isWarmup ? "text-ink-muted" : "text-ink-secondary",
        )}
      >
        {set.isWarmup ? "Warm-up" : `Set ${workingNumber ?? set.setIndex + 1}`}
      </span>

      {isDuration ? (
        <span className="text-ink-secondary flex-1 text-center text-sm font-light">
          {set.plannedRepsText}
        </span>
      ) : (
        <>
          {stepper(
            units,
            displayWeight(set.weightKg, units),
            () => bumpWeight(-1),
            () => bumpWeight(1),
            isBodyweight,
          )}
          {stepper(
            set.plannedReps == null ? "reps (AMRAP)" : "reps",
            String(set.reps ?? 0),
            () => bumpReps(-1),
            () => bumpReps(1),
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => onPatch({ done: !set.done })}
        aria-label={set.done ? "Mark set not done" : "Mark set done"}
        aria-pressed={set.done}
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full ring-1 transition-all",
          set.done
            ? "bg-accent shadow-[0_0_14px_var(--color-accent-glow)] ring-transparent"
            : "ring-[var(--color-border-strong)] hover:bg-white/[0.05]",
        )}
      >
        <Check
          className={cn("size-4.5", set.done ? "text-white" : "text-ink-muted")}
          strokeWidth={2.25}
        />
      </button>
    </div>
  );
}
