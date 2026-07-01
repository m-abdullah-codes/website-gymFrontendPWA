import { AppShell } from "@/components/layout/AppShell";

export default function Loading() {
  return (
    <AppShell>
      <div className="flex w-full max-w-[21.5rem] flex-col gap-6 md:max-w-[22rem]">
        <div
          aria-hidden
          className="bg-surface-elevated aspect-[11/12] w-full animate-pulse rounded-[var(--radius-card)]"
        />
        <div
          aria-hidden
          className="bg-surface-muted h-14 w-full animate-pulse rounded-[1.15rem]"
        />
      </div>
    </AppShell>
  );
}
