import { Button } from "@/components/ui/Button";

const HIGHLIGHTS = [
  "A split matched to your schedule",
  "Volume tuned to your experience",
  "Starting weights calibrated to you",
];

interface IntroScreenProps {
  onStart: () => void;
}

export function IntroScreen({ onStart }: IntroScreenProps) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-10 pb-6">
      <div className="flex flex-col gap-4">
        <span className="motion-safe:animate-fade-up text-ink-secondary text-[0.6875rem] font-light tracking-[0.22em] uppercase">
          Welcome
        </span>
        <h1
          className="motion-safe:animate-fade-up text-ink text-[2rem] leading-tight font-light tracking-tight"
          style={{ animationDelay: "80ms" }}
        >
          Let&apos;s build <span className="font-normal">your</span> training
          plan.
        </h1>
        <p
          className="motion-safe:animate-fade-up text-ink-secondary text-[0.9375rem] leading-relaxed font-light"
          style={{ animationDelay: "160ms" }}
        >
          A few quick questions about your goals, schedule and experience — it
          takes about a minute.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {HIGHLIGHTS.map((highlight, index) => (
          <li
            key={highlight}
            className="motion-safe:animate-fade-up flex items-center gap-3"
            style={{ animationDelay: `${260 + index * 90}ms` }}
          >
            <span className="bg-accent size-1.5 shrink-0 rounded-full shadow-[0_0_8px_var(--color-accent-glow)]" />
            <span className="text-ink-secondary text-sm font-light">
              {highlight}
            </span>
          </li>
        ))}
      </ul>

      <div
        className="motion-safe:animate-fade-up flex flex-col gap-3"
        style={{ animationDelay: "560ms" }}
      >
        <Button variant="accent" onClick={onStart}>
          Start
        </Button>
        <p className="text-ink-muted text-center text-xs font-light">
          You can change any answer later.
        </p>
      </div>
    </div>
  );
}
