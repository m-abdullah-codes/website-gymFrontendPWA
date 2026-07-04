import { useEffect } from "react";
import { Check, Dumbbell } from "lucide-react";

const BUILD_STEPS = [
  "Analyzing your answers",
  "Balancing volume & recovery",
  "Selecting the optimal split",
  "Finalizing your plan",
];

const ITEM_STAGGER_MS = 600;
const BUILD_DURATION_MS = 3200;

interface BuildingScreenProps {
  onDone: () => void;
}

export function BuildingScreen({ onDone }: BuildingScreenProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, BUILD_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      role="status"
      aria-label="Building your plan"
      className="flex flex-1 flex-col items-center justify-center gap-10 pb-10"
    >
      <div className="relative flex size-28 items-center justify-center">
        <div
          aria-hidden
          className="ring-border-subtle absolute inset-0 rounded-full ring-1"
        />
        <div
          aria-hidden
          className="motion-safe:animate-ring-spin absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_10%,var(--color-accent)_38%,transparent_62%)] opacity-90 [mask:radial-gradient(farthest-side,transparent_calc(100%-3px),#000_calc(100%-2px))]"
        />
        <div
          aria-hidden
          className="bg-accent/10 absolute inset-4 rounded-full blur-xl"
        />
        <Dumbbell className="text-ink size-9" strokeWidth={1.25} />
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-ink text-xl font-light tracking-tight">
          Building your plan
        </h1>
        <p className="text-ink-muted text-sm font-light">
          Optimizing every session for you
        </p>
      </div>

      <ul className="flex flex-col gap-3.5">
        {BUILD_STEPS.map((label, index) => (
          <li
            key={label}
            className="motion-safe:animate-fade-up flex items-center gap-3"
            style={{ animationDelay: `${300 + index * ITEM_STAGGER_MS}ms` }}
          >
            <span
              className="bg-accent motion-safe:animate-check-pop flex size-5 items-center justify-center rounded-full shadow-[0_0_10px_var(--color-accent-glow)]"
              style={{ animationDelay: `${650 + index * ITEM_STAGGER_MS}ms` }}
            >
              <Check className="size-3 text-white" strokeWidth={2.5} />
            </span>
            <span className="text-ink-secondary text-sm font-light">
              {label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
