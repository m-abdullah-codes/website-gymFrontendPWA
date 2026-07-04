"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
}

/** Centered modal for small, focused moments (start workout, confirmations). */
export function Dialog({
  open,
  onClose,
  children,
  ariaLabel,
  className,
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="motion-safe:animate-fade-in absolute inset-0 bg-black/65 backdrop-blur-[2px]"
      />
      <div
        className={cn(
          "motion-safe:animate-scale-in relative w-full max-w-sm overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-card-border)] bg-[linear-gradient(165deg,rgba(19,36,72,0.9)_0%,rgba(4,11,26,0.97)_70%)] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.55),0_0_44px_rgba(43,89,255,0.14)]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
