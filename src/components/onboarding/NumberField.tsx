import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Strip everything but digits (and at most one dot when `allowDecimal`). */
export function sanitizeNumeric(value: string, allowDecimal = false): string {
  const cleaned = value.replace(allowDecimal ? /[^\d.]/g : /\D/g, "");
  if (!allowDecimal) return cleaned;
  const [head, ...rest] = cleaned.split(".");
  return rest.length ? `${head}.${rest.join("")}` : head;
}

export function isInRange(value: string, min: number, max: number): boolean {
  const parsed = Number(value);
  return (
    value !== "" && Number.isFinite(parsed) && parsed >= min && parsed <= max
  );
}

interface NumberFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  /** Visible label; omit it (and pass `aria-label`) when labelled externally. */
  label?: string;
  /** Unit hint rendered inside the field, e.g. "kg" or "years". */
  suffix?: string;
}

export function NumberField({
  label,
  suffix,
  className,
  ...props
}: NumberFieldProps) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-2", className)}>
      {label && (
        <span className="text-ink-secondary text-[0.8125rem] font-light">
          {label}
        </span>
      )}
      <span className="relative">
        <input
          type="text"
          className={cn(
            "text-ink placeholder:text-ink-muted ring-border-subtle h-14 w-full rounded-2xl bg-white/[0.05] px-4 text-lg font-light transition outline-none focus:bg-white/[0.07] focus:ring-2 focus:ring-[var(--color-accent)]/60",
            suffix ? "pr-14" : undefined,
            "ring-1",
          )}
          {...props}
        />
        {suffix && (
          <span className="text-ink-muted pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-light">
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}
