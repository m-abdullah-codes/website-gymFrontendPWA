import { useState } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { sanitizeNumeric } from "./NumberField";
import { REP_MAX_LIFTS } from "./steps";
import type { RepMaxEntry, RepMaxes, WeightUnit } from "./types";

const inputClassName =
  "text-ink placeholder:text-ink-muted ring-border-subtle h-11 rounded-xl bg-white/[0.06] text-center text-[0.9375rem] font-light ring-1 transition outline-none focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--color-accent)]/60";

interface RepMaxStepProps {
  weightUnit: WeightUnit;
  /** Called with the recorded maxes, or `null` when skipped. */
  onFinish: (repMaxes: RepMaxes | null) => void;
}

function emptyEntries(): RepMaxes {
  return Object.fromEntries(
    REP_MAX_LIFTS.map((lift) => [lift.key, { weight: "", reps: "" }]),
  );
}

function isComplete(entry: RepMaxEntry): boolean {
  return Number(entry.weight) > 0 && Number(entry.reps) > 0;
}

export function RepMaxStep({ weightUnit, onFinish }: RepMaxStepProps) {
  const [entries, setEntries] = useState<RepMaxes>(emptyEntries);
  const allComplete = REP_MAX_LIFTS.every((lift) =>
    isComplete(entries[lift.key]),
  );

  const updateEntry = (key: string, patch: Partial<RepMaxEntry>) => {
    setEntries((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
  };

  return (
    <form
      className="flex flex-1 flex-col gap-6 pt-8 pb-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (allComplete) onFinish(entries);
      }}
    >
      <div className="flex flex-col gap-2.5">
        <div className="motion-safe:animate-fade-up flex items-center gap-2.5">
          <span className="text-ink-secondary text-[0.6875rem] font-light tracking-[0.22em] uppercase">
            Day-one calibration
          </span>
          <span className="text-accent ring-accent/30 flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2.5 py-0.5 text-[0.625rem] font-normal tracking-wide uppercase ring-1">
            <Sparkles className="size-2.5" strokeWidth={2} />
            Recommended
          </span>
        </div>
        <h1
          className="motion-safe:animate-fade-up text-ink text-[1.65rem] leading-snug font-light tracking-tight"
          style={{ animationDelay: "60ms" }}
        >
          Record your rep maxes
        </h1>
        <p
          className="motion-safe:animate-fade-up text-ink-muted text-sm leading-relaxed font-light"
          style={{ animationDelay: "120ms" }}
        >
          Your best recent set per lift — 30 seconds now makes your first week
          accurate.
        </p>
      </div>

      <ul
        className="motion-safe:animate-fade-up ring-border-subtle divide-y divide-white/[0.06] rounded-[1.5rem] bg-white/[0.03] ring-1"
        style={{ animationDelay: "180ms" }}
      >
        {REP_MAX_LIFTS.map((lift) => (
          <li key={lift.key} className="flex items-center gap-2.5 px-4 py-3.5">
            <span className="relative size-10 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
              <Image
                src={lift.imageSrc}
                alt=""
                fill
                sizes="40px"
                className="object-cover"
              />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-ink truncate text-[0.8125rem] font-light">
                {lift.name}
              </span>
              <span className="text-ink-muted text-[0.625rem] font-light tracking-wide uppercase">
                {lift.muscle}
              </span>
            </span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={weightUnit}
              aria-label={`${lift.name} weight in ${weightUnit}`}
              className={`${inputClassName} w-16`}
              value={entries[lift.key].weight}
              onChange={(event) =>
                updateEntry(lift.key, {
                  weight: sanitizeNumeric(event.target.value, true),
                })
              }
            />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="reps"
              aria-label={`${lift.name} reps`}
              className={`${inputClassName} w-12`}
              value={entries[lift.key].reps}
              onChange={(event) =>
                updateEntry(lift.key, {
                  reps: sanitizeNumeric(event.target.value),
                })
              }
            />
          </li>
        ))}
      </ul>

      <div
        className="motion-safe:animate-fade-up flex flex-col gap-2"
        style={{ animationDelay: "260ms" }}
      >
        <Button
          type="submit"
          variant="accent"
          disabled={!allComplete}
          className="disabled:opacity-40 disabled:shadow-none"
        >
          Save &amp; finish
        </Button>
        <button
          type="button"
          onClick={() => onFinish(null)}
          className="text-ink-secondary hover:text-ink flex h-12 items-center justify-center text-sm font-light underline-offset-4 transition-colors hover:underline"
        >
          Skip for now — we&apos;ll estimate
        </button>
      </div>
    </form>
  );
}
