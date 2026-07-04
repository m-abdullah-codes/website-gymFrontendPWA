"use client";

import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface HomeHeaderProps {
  name?: string;
  className?: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomeHeader({ name = "Arsalan", className }: HomeHeaderProps) {
  const now = new Date();

  return (
    <header
      className={cn("flex items-center justify-between gap-4", className)}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p
          className="text-ink text-xl font-light tracking-tight md:text-2xl"
          suppressHydrationWarning
        >
          {greetingFor(now.getHours())},{" "}
          <span className="font-normal">{name}</span>
        </p>
        <p
          className="text-ink-muted text-[0.8125rem] font-light"
          suppressHydrationWarning
        >
          {dateFormatter.format(now)}
        </p>
      </div>

      <Link
        href="/settings"
        aria-label="Settings"
        className="bg-surface-muted ring-border-subtle flex size-[var(--nav-secondary-size)] shrink-0 items-center justify-center rounded-full ring-1 backdrop-blur-sm"
      >
        <SlidersHorizontal
          className="text-ink size-[1.125rem]"
          strokeWidth={1.5}
        />
      </Link>
    </header>
  );
}
