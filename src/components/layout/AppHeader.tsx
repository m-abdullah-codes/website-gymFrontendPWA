import Image from "next/image";
import { Calendar, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  className?: string;
  showTitle?: boolean;
}

export function AppHeader({ className, showTitle = true }: AppHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-6", className)}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Profile"
          className="relative flex size-[var(--nav-secondary-size)] shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-elevated ring-1 ring-border-subtle"
        >
          <Image
            src="/images/profile-avatar.svg"
            alt=""
            width={40}
            height={40}
            className="size-full object-cover"
            priority
          />
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="Calendar"
            className="flex size-[var(--nav-secondary-size)] items-center justify-center rounded-full bg-surface-muted ring-1 ring-border-subtle backdrop-blur-sm"
          >
            <Calendar className="size-[1.125rem] text-ink" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            aria-label="Notifications"
            className="flex size-[var(--nav-secondary-size)] items-center justify-center rounded-full bg-ink shadow-lg"
          >
            <Bell className="size-[1.125rem] text-ink-inverse" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {showTitle && (
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[2rem] font-light leading-[1.1] tracking-tight text-ink md:text-[3.25rem]">
            Your
            <br />
            memberships
          </h1>
          <p className="text-[0.9375rem] font-light text-ink-secondary md:text-base">
            View your memberships here.
          </p>
        </div>
      )}
    </header>
  );
}
