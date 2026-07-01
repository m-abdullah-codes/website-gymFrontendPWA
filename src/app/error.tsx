"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppShell>
      <div className="flex w-full max-w-[21.5rem] flex-col items-start gap-6 md:max-w-[22rem]">
        <div className="flex flex-col gap-1.5 text-left">
          <h1 className="text-ink text-[2rem] leading-[1.1] font-light tracking-tight md:text-[3.25rem]">
            Something
            <br />
            went wrong
          </h1>
          <p className="text-ink-secondary text-[0.9375rem] font-light md:text-base">
            An unexpected error occurred. Please try again.
          </p>
        </div>
        <Button onClick={() => unstable_retry()}>Try again</Button>
      </div>
    </AppShell>
  );
}
