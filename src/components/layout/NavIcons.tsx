import { cn } from "@/lib/utils";

interface NavIconProps {
  className?: string;
}

export function NavProfileIcon({ className }: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("size-6", className)}
    >
      <circle cx="12" cy="7.75" r="3.25" fill="currentColor" />
      <rect
        x="7.25"
        y="12.5"
        width="9.5"
        height="4.75"
        rx="2.375"
        fill="#5a5a5a"
      />
    </svg>
  );
}

export function NavQrIcon({ className }: NavIconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className={cn("size-5", className)}
    >
      <rect x="1.5" y="1.5" width="7.5" height="7.5" rx="1.75" fill="#5a5a5a" />
      <rect x="11" y="1.5" width="7.5" height="7.5" rx="1.75" fill="currentColor" />
      <rect x="1.5" y="11" width="7.5" height="7.5" rx="1.75" fill="currentColor" />
      <rect x="11" y="11" width="7.5" height="7.5" rx="1.75" fill="#5a5a5a" />
    </svg>
  );
}
