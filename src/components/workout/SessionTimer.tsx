"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function formatElapsed(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Live elapsed-time readout with the session's "recording" indicator. */
export function SessionTimer({
  startedAt,
  className,
}: {
  startedAt: string;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = Math.max(
    0,
    Math.floor((now - new Date(startedAt).getTime()) / 1000),
  );

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div className="flex items-center gap-2">
        <span className="relative flex size-2.5">
          <span className="bg-accent absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:hidden" />
          <span className="bg-accent relative inline-flex size-2.5 rounded-full shadow-[0_0_10px_var(--color-accent-glow)]" />
        </span>
        <span className="text-ink-secondary text-[0.6875rem] font-light tracking-[0.22em] uppercase">
          Recording
        </span>
      </div>
      <span
        className="text-ink text-[2.75rem] leading-none font-light tracking-tight tabular-nums"
        suppressHydrationWarning
      >
        {formatElapsed(elapsed)}
      </span>
    </div>
  );
}
