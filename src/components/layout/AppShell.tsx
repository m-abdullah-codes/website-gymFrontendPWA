import { cn } from "@/lib/utils";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
  /** Replaces the default AppHeader; the page owns its bottom margin. */
  header?: React.ReactNode;
  /** Shows the mobile bottom navigation bar (main app pages only). */
  showBottomNav?: boolean;
  /** Locks layout to the viewport so pages can scroll inside their own regions. */
  fillViewport?: boolean;
}

export function AppShell({
  children,
  className,
  header,
  showBottomNav = false,
  fillViewport = false,
}: AppShellProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col",
        fillViewport ? "h-dvh max-h-dvh overflow-hidden" : "min-h-dvh",
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-[var(--max-width-desktop)] min-w-0 flex-1 flex-col px-[var(--spacing-page-x)] pt-[var(--spacing-page-y)] md:px-10 md:pt-8 lg:px-12",
          showBottomNav
            ? "pb-[calc(var(--bottom-nav-height)+1.25rem)]"
            : "pb-[var(--spacing-page-y)]",
          fillViewport && "min-h-0",
          className,
        )}
      >
        {header ?? <AppHeader showTitle className="mb-6 md:mb-8" />}
        <main
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
            !fillViewport && "justify-center",
          )}
        >
          {children}
        </main>
      </div>
      {showBottomNav ? <BottomNav /> : null}
    </div>
  );
}
