import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { QuestionStepDef, StepOption } from "./steps";
import type { AnswerValue } from "./types";

interface QuestionStepProps {
  step: QuestionStepDef;
  selected?: AnswerValue;
  onSelect: (value: string) => void;
  /** Multi-select steps advance via an explicit Continue. */
  onContinue?: () => void;
}

const columnClasses: Record<NonNullable<QuestionStepDef["columns"]>, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
};

function isSelected(selected: AnswerValue | undefined, value: string): boolean {
  return Array.isArray(selected)
    ? selected.includes(value)
    : selected === value;
}

export function QuestionStep({
  step,
  selected,
  onSelect,
  onContinue,
}: QuestionStepProps) {
  const columns = step.columns ?? 1;
  const hasSelection = Array.isArray(selected)
    ? selected.length > 0
    : selected !== undefined;

  return (
    <div className="flex flex-1 flex-col gap-8 pt-8">
      <div className="flex flex-col gap-2">
        <h1 className="motion-safe:animate-fade-up text-ink text-[1.65rem] leading-snug font-light tracking-tight">
          {step.question}
        </h1>
        {step.hint && (
          <p
            className="motion-safe:animate-fade-up text-ink-muted text-sm font-light"
            style={{ animationDelay: "60ms" }}
          >
            {step.hint}
          </p>
        )}
      </div>

      <div className={cn("grid gap-3", columnClasses[columns])} role="group">
        {step.options.map((option, index) => (
          <OptionCard
            key={option.value}
            option={option}
            selected={isSelected(selected, option.value)}
            compact={columns > 1}
            animationDelay={`${100 + index * 50}ms`}
            onClick={() => onSelect(option.value)}
          />
        ))}
      </div>

      {step.multiSelect && (
        <div className="mt-auto pb-2">
          <Button
            variant="accent"
            onClick={onContinue}
            disabled={!hasSelection}
            className="w-full disabled:opacity-40 disabled:shadow-none"
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}

interface OptionCardProps {
  option: StepOption;
  selected: boolean;
  /** Centered layout for multi-column grids; the check moves to a corner. */
  compact: boolean;
  animationDelay: string;
  onClick: () => void;
}

function OptionCard({
  option,
  selected,
  compact,
  animationDelay,
  onClick,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{ animationDelay }}
      className={cn(
        "motion-safe:animate-fade-up relative flex min-h-14 items-center gap-3 rounded-2xl px-5 py-4 text-left ring-1 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none active:scale-[0.98]",
        selected
          ? "bg-[var(--color-accent-soft)] shadow-[0_0_24px_rgba(43,89,255,0.25)] ring-[var(--color-accent)]/70"
          : "ring-border-subtle bg-white/[0.04] hover:bg-white/[0.07]",
        compact && "justify-center px-3 text-center",
      )}
    >
      <span
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-0.5",
          compact && "items-center",
        )}
      >
        <span className="text-ink text-[0.9375rem] font-light">
          {option.label}
          {option.badge && (
            <span className="text-accent ml-2 rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 align-middle text-[0.625rem] font-normal tracking-wide uppercase">
              {option.badge}
            </span>
          )}
        </span>
        {option.description && (
          <span className="text-ink-muted text-xs font-light">
            {option.description}
          </span>
        )}
      </span>

      {compact ? (
        selected && (
          <span className="bg-accent motion-safe:animate-check-pop absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full shadow-[0_0_10px_var(--color-accent-glow)]">
            <Check className="size-3 text-white" strokeWidth={2.5} />
          </span>
        )
      ) : selected ? (
        <span className="bg-accent motion-safe:animate-check-pop flex size-6 shrink-0 items-center justify-center rounded-full shadow-[0_0_10px_var(--color-accent-glow)]">
          <Check className="size-3.5 text-white" strokeWidth={2.5} />
        </span>
      ) : (
        <span className="size-6 shrink-0 rounded-full ring-1 ring-[var(--color-border-strong)]" />
      )}
    </button>
  );
}
