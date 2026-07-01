import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const iconButtonTones = {
  subtle: "bg-surface-elevated ring-1 ring-border-subtle",
  muted: "bg-surface-muted ring-1 ring-border-subtle backdrop-blur-sm",
  solid: "bg-ink shadow-lg",
  outline: "ring-1 ring-border-subtle",
} as const;

export type IconButtonTone = keyof typeof iconButtonTones;

const iconButtonSizes = {
  sm: "size-[var(--nav-secondary-size)]",
  md: "size-[var(--nav-mobile-size)]",
} as const;

export type IconButtonSize = keyof typeof iconButtonSizes;

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: IconButtonTone;
  size?: IconButtonSize;
  "aria-label": string;
  children: ReactNode;
}

export function IconButton({
  tone = "subtle",
  size = "sm",
  className,
  children,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        iconButtonSizes[size],
        iconButtonTones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
