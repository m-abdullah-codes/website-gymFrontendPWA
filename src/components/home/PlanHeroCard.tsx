import Image from "next/image";
import { cn } from "@/lib/utils";

interface PlanHeroCardProps {
  planName: string;
  level: string;
  daysPerWeek: number;
  split: string;
  /** Action button rendered top-right (e.g. the plan-switcher trigger). */
  action?: React.ReactNode;
  className?: string;
}

export function PlanHeroCard({
  planName,
  level,
  daysPerWeek,
  split,
  action,
  className,
}: PlanHeroCardProps) {
  const chips = [level, `${daysPerWeek} days / week`, split];

  return (
    <section
      aria-label="Active plan"
      className={cn(
        "relative w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-card-border)] shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_18px_rgba(52,95,170,0.1)]",
        className,
      )}
    >
      <div className="relative aspect-[16/10] w-full md:aspect-[2/1]">
        <Image
          src="/images/home-hero.png"
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 512px"
          className="object-cover"
          priority
        />

        {/* Legibility gradients — deep navy rising from the bottom, soft dim on top */}
        <div
          aria-hidden
          className="absolute inset-0 z-[1] bg-[linear-gradient(to_top,rgba(0,8,20,0.92)_0%,rgba(4,13,30,0.6)_36%,rgba(0,6,18,0.18)_62%,transparent_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 z-[1] bg-[linear-gradient(to_bottom,rgba(0,6,18,0.5)_0%,transparent_38%)]"
        />

        <div className="absolute inset-x-5 top-4 z-10 flex items-center justify-between">
          <span className="text-ink-secondary text-[0.6875rem] font-light tracking-[0.22em] uppercase">
            My plan
          </span>
          <div className="flex items-center gap-3">
            <span className="text-ink-secondary flex items-center gap-1.5 text-[0.75rem] font-light">
              <span className="bg-accent size-1.5 rounded-full shadow-[0_0_8px_var(--color-accent-glow)]" />
              Active
            </span>
            {action}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 px-5 pb-5">
          <h2 className="text-ink text-[1.375rem] leading-snug font-light tracking-tight">
            {planName}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <span
                key={chip}
                className="text-ink rounded-full bg-white/10 px-3 py-1 text-[0.75rem] font-light ring-1 ring-white/15 backdrop-blur-sm"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
