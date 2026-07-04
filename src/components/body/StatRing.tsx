"use client";

import { cn } from "@/lib/utils";

interface StatRingProps {
  label: string;
  completed: number;
  target: number;
  className?: string;
}

/**
 * PUSH/PULL/LEGS ring — remaining sets is the primary number, completed vs
 * target as the caption ("18/30").
 */
export function StatRing({
  label,
  completed,
  target,
  className,
}: StatRingProps) {
  const size = 104;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = target > 0 ? Math.min(1, completed / target) : 0;
  const remaining = Math.max(0, target - completed);
  const over = target > 0 && completed > target;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
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
            stroke={over ? "#d13b4b" : "var(--color-accent)"}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
            style={{
              filter:
                progress > 0
                  ? "drop-shadow(0 0 6px var(--color-accent-glow))"
                  : undefined,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-ink text-[1.375rem] leading-none font-light tabular-nums">
            {remaining}
          </span>
          <span className="text-ink-muted mt-0.5 text-[0.5625rem] font-light tracking-wide uppercase">
            left
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-ink text-[0.6875rem] font-medium tracking-[0.16em] uppercase">
          {label}
        </span>
        <span className="text-ink-muted text-[0.6875rem] font-light tabular-nums">
          {completed}/{target}
        </span>
      </div>
    </div>
  );
}
