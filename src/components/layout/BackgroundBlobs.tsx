import { cn } from "@/lib/utils";

interface BackgroundBlobsProps {
  className?: string;
}

/**
 * Soft accent glows that drift down the page, extending the body's top
 * radial gradient so long scrolling views don't fade to flat black.
 * Render once per page, anywhere inside AppShell.
 */
export function BackgroundBlobs({ className }: BackgroundBlobsProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <div className="bg-accent absolute top-[24%] -left-28 size-72 rounded-full opacity-20 blur-[110px]" />
      <div className="absolute top-[52%] -right-32 size-80 rounded-full bg-[#4d7bff] opacity-15 blur-[130px]" />
      <div className="bg-accent absolute bottom-[-4rem] left-1/3 size-64 rounded-full opacity-10 blur-[120px]" />
    </div>
  );
}
