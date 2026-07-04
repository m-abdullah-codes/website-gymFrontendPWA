"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Taller sheets for full-content views (plan switcher, swap lists). */
  size?: "auto" | "tall";
  className?: string;
}

/**
 * Bottom sheet — the app's standard surface for secondary flows on mobile.
 * Backdrop click and Escape close it; content scrolls inside.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  size = "auto",
  className,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Lock background scroll while open.
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
      className="fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="motion-safe:animate-fade-in absolute inset-0 bg-black/60 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        className={cn(
          "motion-safe:animate-fade-up relative mx-auto flex w-full max-w-[var(--max-width-content)] flex-col overflow-hidden rounded-t-[1.75rem] bg-[linear-gradient(180deg,rgba(16,28,54,0.98)_0%,rgba(3,9,22,0.99)_100%)] ring-1 ring-white/10 md:mb-6 md:max-w-lg md:rounded-[1.75rem]",
          size === "tall" ? "h-[88dvh]" : "max-h-[88dvh]",
          className,
        )}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <span className="text-ink text-[1.0625rem] font-normal tracking-tight">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sheet"
            className="ring-border-subtle flex size-8 items-center justify-center rounded-full bg-white/[0.04] ring-1 transition-colors hover:bg-white/[0.08]"
          >
            <X className="text-ink-secondary size-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
