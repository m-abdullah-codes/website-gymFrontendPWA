import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const buttonBaseClassName =
  "flex h-14 w-full items-center justify-center rounded-[1.15rem] px-6 text-base font-medium transition-opacity active:opacity-90";

export const buttonVariants = {
  primary: "bg-white text-ink-inverse shadow-[0_8px_24px_rgba(0,0,0,0.25)]",
  accent: "bg-accent text-white shadow-[0_8px_24px_var(--color-accent-glow)]",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonBaseClassName, buttonVariants[variant], className)}
      {...props}
    />
  );
}
