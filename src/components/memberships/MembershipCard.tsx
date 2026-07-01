import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

export interface Membership {
  id: string;
  gymName: string;
  planName: string;
  status: "active" | "expired" | "pending";
  expiresInDays: number;
  sessionsLeft: number;
  progressPercent: number;
  imageSrc: string;
  logoSrc?: string;
}

interface MembershipCardProps {
  membership: Membership;
  className?: string;
}

export function MembershipCard({ membership, className }: MembershipCardProps) {
  const {
    gymName,
    planName,
    status,
    expiresInDays,
    sessionsLeft,
    progressPercent,
    imageSrc,
    logoSrc = "/gym-logo.png",
  } = membership;

  return (
    <article
      className={cn(
        "relative w-full max-w-[21.5rem] shrink-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-card-border)] shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_18px_rgba(52,95,170,0.1)] md:max-w-[22rem]",
        className,
      )}
    >
      <div className="membership-card-inner relative aspect-[11/12] w-full overflow-hidden">
        <Image
          src={imageSrc}
          alt={`${gymName} interior`}
          fill
          sizes="(max-width: 768px) 344px, 352px"
          className="object-cover"
          priority
        />

        {/* Soft top vignette on photo */}
        <div
          aria-hidden
          className="membership-card-top-vignette pointer-events-none absolute inset-0 z-[1]"
        />

        {/* U-shaped navy cradle */}
        <div
          aria-hidden
          className="membership-card-overlay pointer-events-none absolute inset-0 z-[2]"
        />

        {/* Luminous rim — screen-blended */}
        <div
          aria-hidden
          className="membership-card-border-glow pointer-events-none absolute inset-0 z-[3]"
        />

        {/* Status badge */}
        <div className="absolute top-4 left-4 z-10">
          <Badge status={status} />
        </div>

        {/* Bottom content */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 px-5 pt-10 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="bg-surface-elevated ring-border-subtle relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1">
              <Image
                src={logoSrc}
                alt=""
                width={32}
                height={32}
                className="size-full object-cover"
              />
            </div>
            <span className="text-ink-secondary text-[0.8125rem] font-light">
              {gymName}
            </span>
          </div>

          <h2 className="text-ink text-[1.375rem] leading-snug font-light tracking-tight">
            {planName}
          </h2>

          <ProgressBar value={progressPercent} label="Membership progress" />

          <div className="text-ink-secondary flex items-center justify-between text-[0.8125rem]">
            <span>
              Expires in <span className="text-ink">{expiresInDays} days</span>
            </span>
            <span>
              Sessions left <span className="text-ink">{sessionsLeft}</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
