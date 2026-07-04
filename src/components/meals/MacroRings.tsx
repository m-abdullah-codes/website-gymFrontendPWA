"use client";

import type { DaySummary, MacroSummaryRow } from "@/lib/meals/types";
import { cn } from "@/lib/utils";

function Ring({
  row,
  size,
  stroke,
  color,
  label,
  unit,
}: {
  row: MacroSummaryRow;
  size: number;
  stroke: number;
  color: string;
  label: string;
  unit: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = Math.min(1, row.target > 0 ? row.consumed / row.target : 0);
  const over = row.pct > 110;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={over ? "#e8b93e" : color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "text-ink leading-none font-light tabular-nums",
              size > 90 ? "text-[1.375rem]" : "text-[0.8125rem]",
            )}
          >
            {row.consumed}
          </span>
          <span className="text-ink-muted mt-0.5 text-[0.5rem] font-light">
            / {row.target}
            {unit}
          </span>
        </div>
      </div>
      <span className="text-ink-secondary text-[0.6875rem] font-light">
        {label}
      </span>
    </div>
  );
}

/** Calories big, protein/carbs/fat small — the calm daily dashboard. */
export function MacroRings({ summary }: { summary: DaySummary }) {
  return (
    <section
      aria-label="Today's macros"
      className="ring-border-subtle flex items-center justify-between rounded-[1.5rem] bg-white/[0.03] px-5 py-4 ring-1"
    >
      <Ring
        row={summary.kcal}
        size={104}
        stroke={8}
        color="var(--color-accent)"
        label="Calories"
        unit=""
      />
      <Ring
        row={summary.protein}
        size={72}
        stroke={6}
        color="#35d07f"
        label="Protein"
        unit="g"
      />
      <Ring
        row={summary.carbs}
        size={72}
        stroke={6}
        color="#8f7bff"
        label="Carbs"
        unit="g"
      />
      <Ring
        row={summary.fat}
        size={72}
        stroke={6}
        color="#e8b93e"
        label="Fat"
        unit="g"
      />
    </section>
  );
}
