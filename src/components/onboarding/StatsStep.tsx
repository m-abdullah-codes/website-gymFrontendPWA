import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { NumberField, isInRange, sanitizeNumeric } from "./NumberField";
import type { BodyStats, WeightUnit } from "./types";

const AGE_MIN = 13;
const AGE_MAX = 90;
const HEIGHT_MIN = 120;
const HEIGHT_MAX = 220;
const WEIGHT_RANGE: Record<WeightUnit, [number, number]> = {
  kg: [30, 300],
  lbs: [66, 660],
};
const KG_PER_LB = 1 / 2.20462;

interface StatsStepProps {
  stats: BodyStats;
  onChange: (stats: BodyStats) => void;
  onContinue: () => void;
}

export function StatsStep({ stats, onChange, onContinue }: StatsStepProps) {
  const [weightMin, weightMax] = WEIGHT_RANGE[stats.weightUnit];
  const canContinue =
    isInRange(stats.age, AGE_MIN, AGE_MAX) &&
    isInRange(stats.weight, weightMin, weightMax) &&
    isInRange(stats.height, HEIGHT_MIN, HEIGHT_MAX) &&
    (stats.targetWeight === "" ||
      isInRange(stats.targetWeight, weightMin, weightMax));

  const setUnit = (unit: WeightUnit) => {
    if (unit === stats.weightUnit) return;
    const convert = (value: string) => {
      const parsed = Number(value);
      return value !== "" && Number.isFinite(parsed)
        ? String(
            Math.round(
              (unit === "kg" ? parsed * KG_PER_LB : parsed / KG_PER_LB) * 10,
            ) / 10,
          )
        : value;
    };
    onChange({
      ...stats,
      weight: convert(stats.weight),
      targetWeight: convert(stats.targetWeight),
      weightUnit: unit,
    });
  };

  return (
    <form
      className="flex flex-1 flex-col gap-8 pt-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (canContinue) onContinue();
      }}
    >
      <div className="flex flex-col gap-2">
        <h1 className="motion-safe:animate-fade-up text-ink text-[1.65rem] leading-snug font-light tracking-tight">
          Almost there — about you
        </h1>
        <p
          className="motion-safe:animate-fade-up text-ink-muted text-sm font-light"
          style={{ animationDelay: "60ms" }}
        >
          Used to calibrate starting loads and progression.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <div
          className="motion-safe:animate-fade-up"
          style={{ animationDelay: "120ms" }}
        >
          <NumberField
            label="Age"
            suffix="years"
            inputMode="numeric"
            autoComplete="off"
            placeholder="28"
            value={stats.age}
            onChange={(event) =>
              onChange({ ...stats, age: sanitizeNumeric(event.target.value) })
            }
          />
        </div>

        <div
          className="motion-safe:animate-fade-up flex flex-col gap-2"
          style={{ animationDelay: "180ms" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-ink-secondary text-[0.8125rem] font-light">
              Weight
            </span>
            <div
              className="ring-border-subtle flex rounded-full bg-white/[0.05] p-1 ring-1"
              role="group"
              aria-label="Weight unit"
            >
              {(["kg", "lbs"] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  aria-pressed={stats.weightUnit === unit}
                  onClick={() => setUnit(unit)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-light transition-colors",
                    stats.weightUnit === unit
                      ? "bg-accent text-white shadow-[0_0_12px_var(--color-accent-glow)]"
                      : "text-ink-secondary hover:text-ink",
                  )}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
          <NumberField
            suffix={stats.weightUnit}
            inputMode="decimal"
            autoComplete="off"
            placeholder={stats.weightUnit === "kg" ? "75" : "165"}
            aria-label={`Weight in ${stats.weightUnit}`}
            value={stats.weight}
            onChange={(event) =>
              onChange({
                ...stats,
                weight: sanitizeNumeric(event.target.value, true),
              })
            }
          />
        </div>

        <div
          className="motion-safe:animate-fade-up"
          style={{ animationDelay: "240ms" }}
        >
          <NumberField
            label="Height"
            suffix="cm"
            inputMode="numeric"
            autoComplete="off"
            placeholder="170"
            value={stats.height}
            onChange={(event) =>
              onChange({
                ...stats,
                height: sanitizeNumeric(event.target.value),
              })
            }
          />
        </div>

        <div
          className="motion-safe:animate-fade-up flex flex-col gap-1.5"
          style={{ animationDelay: "300ms" }}
        >
          <NumberField
            label="Goal weight (optional)"
            suffix={stats.weightUnit}
            inputMode="decimal"
            autoComplete="off"
            placeholder="—"
            value={stats.targetWeight}
            onChange={(event) =>
              onChange({
                ...stats,
                targetWeight: sanitizeNumeric(event.target.value, true),
              })
            }
          />
          <p className="text-ink-muted text-xs font-light">
            If set, we&apos;ll estimate how long it takes to get there.
          </p>
        </div>
      </div>

      <div
        className="motion-safe:animate-fade-up mt-auto flex flex-col gap-3 pb-2"
        style={{ animationDelay: "240ms" }}
      >
        <Button
          type="submit"
          variant="accent"
          disabled={!canContinue}
          className="disabled:opacity-40 disabled:shadow-none"
        >
          Build my plan
        </Button>
        <p className="text-ink-muted text-center text-xs font-light">
          Stored privately on your device.
        </p>
      </div>
    </form>
  );
}
