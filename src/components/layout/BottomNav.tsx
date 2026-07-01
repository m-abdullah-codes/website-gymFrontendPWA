import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/IconButton";
import { HomeButton } from "./HomeButton";
import { NavProfileIcon, NavQrIcon } from "./NavIcons";

interface BottomNavProps {
  className?: string;
}

export function BottomNav({ className }: BottomNavProps) {
  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 flex justify-center overflow-x-hidden px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-8",
        className,
      )}
    >
      <div className="md:bg-surface-muted/60 md:ring-border-subtle flex w-full max-w-[var(--max-width-content)] min-w-0 items-center justify-between gap-3 md:max-w-lg md:gap-4 md:rounded-[var(--radius-nav)] md:px-6 md:py-3 md:ring-1 md:backdrop-blur-xl">
        <div className="flex shrink-0 items-center gap-3 md:gap-4">
          <HomeButton
            aria-current="page"
            className="size-[var(--nav-mobile-size)] md:size-[var(--nav-home-size)]"
          />

          <IconButton
            aria-label="Profile"
            tone="outline"
            size="md"
            className="md:size-[var(--nav-home-size)]"
          >
            <NavProfileIcon className="size-[42%] text-white" />
          </IconButton>
        </div>

        <button
          type="button"
          className="ring-border-subtle flex h-[var(--nav-mobile-size)] min-w-0 shrink items-center justify-center gap-2 rounded-[var(--radius-nav)] px-4 ring-1 md:h-[var(--nav-secondary-size)] md:min-w-[var(--nav-qr-min-width)] md:px-5"
        >
          <NavQrIcon className="size-5 shrink-0 text-white md:size-4" />
          <span className="truncate text-sm font-light tracking-wide text-white">
            QR Code
          </span>
        </button>
      </div>
    </nav>
  );
}
