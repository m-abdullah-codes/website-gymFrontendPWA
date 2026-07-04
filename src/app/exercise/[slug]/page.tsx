export const unstable_instant = {
  prefetch: "runtime",
  samples: [{ params: { slug: "barbell-bench-press" } }],
};

import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exerciseLibrary } from "@/data/exercises";
import { ExerciseDetail } from "@/components/exercises/ExerciseDetail";

export function generateStaticParams() {
  return Object.keys(exerciseLibrary).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  "use cache";
  const { slug } = await params;
  const entry = exerciseLibrary[slug];
  return { title: entry ? `${entry.name} — Gym App` : "Exercise — Gym App" };
}

function Resolved({ slug }: { slug: string }) {
  const entry = exerciseLibrary[slug];
  if (!entry) notFound();
  return <ExerciseDetail slug={slug} entry={entry} />;
}

/** Skeleton shown only during client-side navigation while params resolve. */
function DetailFallback() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="h-[50vh] w-full animate-pulse bg-white/[0.03]" />
      <div className="mx-auto flex w-full max-w-[var(--max-width-content)] flex-col gap-5 px-[var(--spacing-page-x)] pt-5">
        <div className="bg-surface-muted/60 h-11 w-full animate-pulse rounded-full" />
        <div className="h-40 animate-pulse rounded-2xl bg-white/[0.03]" />
      </div>
    </div>
  );
}

export default function ExercisePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<DetailFallback />}>
      {params.then(({ slug }) => (
        <Resolved slug={slug} />
      ))}
    </Suspense>
  );
}
