"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { exerciseLibrary } from "@/data/exercises";
import { cn } from "@/lib/utils";
import { ExerciseThumbnail } from "./ExerciseThumbnail";
import { muscleInfoFor } from "@/components/workout/viewModels";

const ALL = "All";

type Row = {
  slug: string;
  name: string;
  muscle: string;
  imageSrc: string;
  videoUrl?: string;
  equipment: string;
};

const ROWS: Row[] = Object.entries(exerciseLibrary)
  .map(([slug, e]) => ({
    slug,
    name: e.name,
    ...muscleInfoFor(slug),
    videoUrl: e.videoUrl,
    equipment: e.equipment.join(" · "),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const MUSCLES = [
  ALL,
  ...[...new Set(ROWS.map((r) => r.muscle))].sort((a, b) => a.localeCompare(b)),
];

export function ExerciseLibraryList() {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState(ALL);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ROWS.filter(
      (r) =>
        (muscle === ALL || r.muscle === muscle) &&
        (!q ||
          r.name.toLowerCase().includes(q) ||
          r.muscle.toLowerCase().includes(q)),
    );
  }, [query, muscle]);

  return (
    <div className="flex flex-col gap-4">
      <label className="ring-border-subtle flex h-12 items-center gap-3 rounded-full bg-white/[0.04] px-4 ring-1 focus-within:ring-2 focus-within:ring-[var(--color-accent)]/60">
        <Search
          className="text-ink-muted size-4.5 shrink-0"
          strokeWidth={1.75}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 180 exercises…"
          aria-label="Search exercises"
          className="text-ink placeholder:text-ink-muted h-full w-full bg-transparent text-sm font-light outline-none"
        />
      </label>

      <div className="-mx-[var(--spacing-page-x)] [scrollbar-width:none] overflow-x-auto px-[var(--spacing-page-x)] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2 pb-1">
          {MUSCLES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMuscle(m)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[0.8125rem] whitespace-nowrap transition-colors",
                muscle === m
                  ? "text-ink-inverse bg-white font-normal"
                  : "bg-surface-muted/60 text-ink-secondary ring-border-subtle font-light ring-1",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <p className="text-ink-muted text-xs font-light">
        {filtered.length} exercise{filtered.length === 1 ? "" : "s"}
      </p>

      <ul className="flex flex-col gap-2.5">
        {filtered.map((r) => (
          <li key={r.slug}>
            <Link
              href={`/exercise/${r.slug}`}
              className="ring-border-subtle flex items-center gap-3.5 rounded-2xl bg-white/[0.03] px-3.5 py-3 ring-1 transition-colors active:bg-white/[0.06]"
            >
              <div className="ring-border-subtle relative size-12 shrink-0 overflow-hidden rounded-xl ring-1">
                <ExerciseThumbnail
                  videoUrl={r.videoUrl}
                  fallbackSrc={r.imageSrc}
                  alt={r.name}
                  sizes="48px"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-ink truncate text-[0.9375rem] font-light">
                  {r.name}
                </p>
                <p className="text-ink-muted truncate text-xs font-light">
                  {r.muscle}
                  {r.equipment ? ` • ${r.equipment}` : ""}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
