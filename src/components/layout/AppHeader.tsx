import type { ReactNode } from "react";
import Image from "next/image";
import { Calendar, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/IconButton";

interface AppHeaderProps {
  className?: string;
  showTitle?: boolean;
  title?: ReactNode;
  subtitle?: ReactNode;
}

export function AppHeader({
  className,
  showTitle = true,
  title = (
    <>
      Your
      <br />
      memberships
    </>
  ),
  subtitle = "View your memberships here.",
}: AppHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-6", className)}>
      <div className="flex items-center justify-between">
        <IconButton
          aria-label="Profile"
          tone="subtle"
          className="relative overflow-hidden"
        >
          <Image
            src="/images/profile-avatar.svg"
            alt=""
            width={40}
            height={40}
            className="size-full object-cover"
            priority
          />
        </IconButton>

        <div className="flex items-center gap-2.5">
          <IconButton aria-label="Calendar" tone="muted">
            <Calendar className="size-[1.125rem] text-ink" strokeWidth={1.5} />
          </IconButton>
          <IconButton aria-label="Notifications" tone="solid">
            <Bell
              className="size-[1.125rem] text-ink-inverse"
              strokeWidth={1.75}
            />
          </IconButton>
        </div>
      </div>

      {showTitle && (
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[2rem] font-light leading-[1.1] tracking-tight text-ink md:text-[3.25rem]">
            {title}
          </h1>
          <p className="text-[0.9375rem] font-light text-ink-secondary md:text-base">
            {subtitle}
          </p>
        </div>
      )}
    </header>
  );
}
