import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { PlanSummary } from "./types";

interface PlanRevealDialogProps {
  plan: PlanSummary;
  onContinue: () => void;
}

export function PlanRevealDialog({ plan, onContinue }: PlanRevealDialogProps) {
  const chips = [plan.level, `${plan.daysPerWeek} days / week`, plan.split];

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-8">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-reveal-title"
        className="motion-safe:animate-scale-in relative w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-card-border)] bg-[linear-gradient(165deg,rgba(19,36,72,0.72)_0%,rgba(4,11,26,0.92)_70%)] p-7 shadow-[0_24px_64px_rgba(0,0,0,0.55),0_0_44px_rgba(43,89,255,0.16)]"
      >
        {/* Luminous top hairline, echoing the membership card rim */}
        <div
          aria-hidden
          className="via-accent/60 absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
        />

        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="text-accent size-3.5" strokeWidth={1.5} />
            <span className="text-ink-secondary text-[0.6875rem] font-light tracking-[0.22em] uppercase">
              Your plan is ready
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <h2
              id="plan-reveal-title"
              className="text-ink text-2xl leading-snug font-light tracking-tight"
            >
              {plan.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="text-ink rounded-full bg-white/10 px-3 py-1 text-[0.75rem] font-light ring-1 ring-white/15"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div aria-hidden className="h-px w-full bg-white/10" />

          <div className="flex flex-col gap-2.5">
            <span className="text-ink-muted text-[0.6875rem] font-light tracking-[0.18em] uppercase">
              Why this plan
            </span>
            <ul className="flex flex-col gap-2">
              {plan.reasons.slice(0, 4).map((reason) => (
                <li
                  key={reason}
                  className="text-ink-secondary flex items-start gap-2.5 text-[0.8125rem] leading-relaxed font-light"
                >
                  <span
                    aria-hidden
                    className="bg-accent mt-1.5 size-1.5 shrink-0 rounded-full shadow-[0_0_8px_var(--color-accent-glow)]"
                  />
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          <Button variant="accent" onClick={onContinue}>
            Continue
          </Button>
        </div>
      </section>

      <p
        className="motion-safe:animate-fade-in text-ink-muted mt-6 text-center text-xs font-light"
        style={{ animationDelay: "500ms" }}
      >
        Next: calibrate your starting weights
      </p>
    </div>
  );
}
