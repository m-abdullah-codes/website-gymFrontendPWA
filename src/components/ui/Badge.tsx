import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeStatus = "active" | "expired" | "pending";

interface BadgeProps {
  status: BadgeStatus;
  className?: string;
}

const badgeConfig: Record<
  BadgeStatus,
  { label: string; icon?: ReactNode; className: string }
> = {
  active: {
    label: "Active",
    icon: <span aria-hidden>🔥</span>,
    className: "bg-badge text-ink-inverse",
  },
  expired: {
    label: "Expired",
    className: "bg-surface-muted text-ink-secondary ring-1 ring-border-subtle",
  },
  pending: {
    label: "Pending",
    className: "bg-transparent text-accent ring-1 ring-accent/40",
  },
};

export function Badge({ status, className }: BadgeProps) {
  const { label, icon, className: variantClassName } = badgeConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[0.8125rem] font-light shadow-sm",
        variantClassName,
        className,
      )}
    >
      {label} {icon}
    </span>
  );
}
