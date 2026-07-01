import { cn } from "@/lib/utils";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden">
      <div
        className={cn(
          "mx-auto flex w-full max-w-[var(--max-width-desktop)] min-w-0 flex-1 flex-col px-[var(--spacing-page-x)] pt-[var(--spacing-page-y)] pb-[calc(var(--bottom-nav-height)+1.5rem)] md:px-10 md:pt-8 lg:px-12",
          className,
        )}
      >
        <AppHeader showTitle className="mb-6 md:mb-8" />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col justify-center">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
