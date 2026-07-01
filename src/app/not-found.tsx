import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { buttonBaseClassName, buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <AppShell>
      <div className="flex w-full max-w-[21.5rem] flex-col items-start gap-6 md:max-w-[22rem]">
        <div className="flex flex-col gap-1.5 text-left">
          <h1 className="text-[2rem] font-light leading-[1.1] tracking-tight text-ink md:text-[3.25rem]">
            Page
            <br />
            not found
          </h1>
          <p className="text-[0.9375rem] font-light text-ink-secondary md:text-base">
            The page you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
        <Link
          href="/"
          className={cn(buttonBaseClassName, buttonVariants.primary)}
        >
          Return home
        </Link>
      </div>
    </AppShell>
  );
}
